// frontend/src/components/InteractionBlock.tsx
import React from 'react';

import { FiUser, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiCopy, FiDownload, FiTerminal } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ExpandableOutput from './ExpandableOutput';
// Thêm InstallationResult
import { ConversationBlock, ExecutionResult, ReviewResult, DebugResult, InstallationResult } from '../App';
import { toast } from 'react-toastify';
import './CenterArea.css';

// --- Interface (Thêm onInstallPackage) ---
interface InteractionBlockProps {
    block: ConversationBlock;
    isBusy: boolean;
    onReview: (codeToReview: string) => void;
    onExecute: (codeToExecute: string) => void;
    onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
    onApplyCorrectedCode: (code: string) => void;
    onInstallPackage: (packageName: string) => Promise<void>;
    expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
    onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
    'data-block-id'?: string; 
}
// -----------------------------------------

// --- Helper format timestamp ---
const formatTimestamp = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return '';
    }
};
// -----------------------------

// --- Markdown Components ---
const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children ?? '').replace(/\n$/, '');
      const handleCopyMdCode = () => { navigator.clipboard.writeText(codeString).then(() => toast.info("Đã Copy Markdown code!")); };
      return !inline && match ? (
        <div className="markdown-code-block">
            <div className="code-block-header">
                <span>{match[1]}</span>
                <button onClick={handleCopyMdCode} className="icon-button subtle small copy-button" title="Copy code"><FiCopy /></button>
             </div>
            <SyntaxHighlighter
              style={vscDarkPlus as any}
              language={match[1]}
              PreTag="div"
              {...props}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
      ) : (
        <code className={`inline-code ${className || ''}`} {...props}>{children}</code>
      );
    }

};
// -------------------------

const InteractionBlock: React.FC<InteractionBlockProps> = React.memo(({
    block, isBusy, onReview, onExecute, onDebug, onApplyCorrectedCode,
    onInstallPackage,
    expandedOutputs, onToggleOutputExpand
 }) => {
  const { type, data, id, timestamp, isNew } = block;

  // --- Handlers Copy/Download ---
  const handleCopy = (text: string | null | undefined) => {
    if (typeof text === 'string') {
      navigator.clipboard.writeText(text).then(() => toast.info("Đã copy code!"));
    }
  };
  const handleDownload = (filename: string, text: string | null | undefined) => {
    if (typeof text === 'string') {
      const element = document.createElement("a");
      const file = new Blob([text], {type: 'text/plain;charset=utf-8'});
      element.href = URL.createObjectURL(file);
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href); // Giải phóng bộ nhớ
    }
  };
  // -----------------------------

  // --- Helper kiểm tra lỗi cho execution block ---
  const hasErrorSignal = (execData: any): boolean => {
      if (!execData) return false;
      const hasStdErr = !!execData.error?.trim();
      const nonZeroReturn = execData.return_code !== 0;
      const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
      const stdoutLooksError = !!execData.output?.trim() && stdoutErrorKeywords.some(kw => execData.output!.toLowerCase().includes(kw));
      return !!(nonZeroReturn || hasStdErr || stdoutLooksError);
  };
  // -------------------------------------------

  const renderContent = () => {
    // Kiểm tra data cơ bản (trừ loading và user có thể có data là string rỗng)
    if (!data && type !== 'loading' && !(type === 'user' && data === '')) {
        return <div className="error-inline">Error: Invalid or missing block data for type '{type}'</div>;
    }

    switch (type) {
      case 'user':
        return <div className="prompt-text">{String(data ?? '')}</div>;

      case 'ai-code':
        const codeStr = String(data ?? '').trim();
        return codeStr ? (
            <div className="code-block-container">
                 <div className="code-block-header">
                    <span>python</span>
                    <div>
                        <button onClick={() => handleCopy(codeStr)} className="icon-button subtle small" title="Copy"><FiCopy /></button>
                        <button onClick={() => handleDownload("script.py", codeStr)} className="icon-button subtle small" title="Download"><FiDownload /></button>
                    </div>
                </div>
                <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block">
                    {codeStr}
                </SyntaxHighlighter>
             </div>
         ) : <p className="error-inline">Empty code block received.</p>;

      case 'review':
         const reviewData = data as ReviewResult;
        return (
            <div className="markdown-content review-content">
                {reviewData?.error ? (
                    <p className="error-inline">{reviewData.error}</p>
                 ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {reviewData?.review || '(No review content)'}
                    </ReactMarkdown>
                 )}
            </div>
        );

      case 'execution':
        const execData = data as (ExecutionResult & { codeThatFailed?: string });
        const currentOutputStateExec = expandedOutputs[id] || { stdout: false, stderr: false };
        const execHasError = hasErrorSignal(execData);
        return (
          <div className={`execution-content ${execHasError ? 'error' : ''}`}>
            {/* Chỉ hiển thị message nếu nó không phải là thông báo mặc định */}
            {execData?.message && !execData.message.startsWith("Thực thi") && <p className="exec-message">{execData.message}</p>}
            <ExpandableOutput
              text={execData?.output}
              label="stdout"
              isExpanded={currentOutputStateExec.stdout}
              onToggleExpand={() => onToggleOutputExpand(id, 'stdout')}
              className="stdout-section"
            />
            <ExpandableOutput
              text={execData?.error}
              label="stderr"
              isExpanded={currentOutputStateExec.stderr}
              onToggleExpand={() => onToggleOutputExpand(id, 'stderr')}
              className="stderr-section"
            />
            <p className="return-code">Return Code: {execData?.return_code ?? 'N/A'}</p>
          </div>
        );

      case 'debug':
        const debugData = data as DebugResult;
        const correctedCode = debugData?.corrected_code?.trim();
        const suggestedPackage = debugData?.suggested_package; // Lấy package
        return (
            <div className="debug-content">
                {/* Hiển thị lỗi từ Gemini (nếu có) */}
                {debugData?.error && <p className="error-inline">{debugData.error}</p>}

                {/* Phần giải thích */}
                {debugData?.explanation && (
                    <div className="markdown-content explanation-content">
                        <h4>Explanation & Suggestion</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {debugData.explanation}
                        </ReactMarkdown>
                    </div>
                 )}

                 {/* ---->>> Nút Install Package <<<---- */}
                 {suggestedPackage && (
                     <div className="install-suggestion-area block-actions-area"> {/* Dùng chung style hoặc tạo mới */}
                         <button
                             onClick={() => onInstallPackage(suggestedPackage)}
                             disabled={isBusy} // Disable khi có bất kỳ action nào đang chạy
                             className="install-package-button" // Class riêng để style
                             title={`Install the '${suggestedPackage}' package using pip`}
                         >
                             <FiDownload /> Install <code>{suggestedPackage}</code>
                         </button>
                     </div>
                 )}
                 {/* ----------------------------------- */}

                 {/* Phần code đã sửa */}
                 {correctedCode && (
                    <>
                        <h4>Suggested Code</h4>
                        <div className="code-block-container">
                            <div className="code-block-header">
                                <span>python (corrected)</span>
                                <div> {/* Wrap buttons */}
                                    <button onClick={() => handleCopy(correctedCode)} className="icon-button subtle small" title="Copy Corrected Code"><FiCopy /></button>
                                    <button onClick={() => handleDownload("corrected_script.py", correctedCode)} className="icon-button subtle small" title="Download Corrected Code"><FiDownload /></button>
                                </div>
                            </div>
                            <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block corrected-code">
                                {correctedCode}
                            </SyntaxHighlighter>
                            {/* Nút Apply Code chỉ hiển thị khi có code sửa lỗi */}
                            <div className="block-actions-area apply-action-area">
                                <button onClick={() => onApplyCorrectedCode(correctedCode)} disabled={isBusy} className="apply-code" title="Apply Corrected Code">Use This Code</button>
                            </div>
                        </div>
                    </>
                 )}

                 {/* Thông báo nếu không có giải thích, không có code sửa, không có package */}
                 {!debugData?.error && !debugData?.explanation && !correctedCode && !suggestedPackage && (
                    <p className="info-inline">(No specific suggestions or corrected code provided by the debugger.)</p>
                 )}
            </div>
         );

      // --- THÊM CASE MỚI CHO INSTALLATION ---
      case 'installation':
        const installData = data as InstallationResult;
        const currentOutputStateInst = expandedOutputs[id] || { stdout: false, stderr: false };
        return (
            <div className={`installation-content ${!installData.success ? 'error' : ''}`}>
                <p className="install-message">
                    {/* Icon dựa trên success */}
                    {installData.success
                       ? <FiCheckCircle style={{ color: 'var(--success-color)', marginRight: '8px', flexShrink: 0 }}/>
                       : <FiAlertTriangle style={{ color: 'var(--danger-color)', marginRight: '8px', flexShrink: 0 }}/>
                     }
                     {/* Thêm tên package vào message */}
                    Install <strong>{installData.package_name || 'package'}</strong>: {installData.message}
                </p>
                {/* Luôn hiển thị output/error để xem log cài đặt */}
                <ExpandableOutput
                  text={installData?.output}
                  label="pip output"
                  isExpanded={currentOutputStateInst.stdout}
                  onToggleExpand={() => onToggleOutputExpand(id, 'stdout')}
                  className="stdout-section installation-output" // Thêm class để style nếu cần
                />
                <ExpandableOutput
                  text={installData?.error}
                  label="pip error"
                  isExpanded={currentOutputStateInst.stderr}
                  onToggleExpand={() => onToggleOutputExpand(id, 'stderr')}
                  className="stderr-section installation-error" // Thêm class
                />
            </div>
        );
      // --------------------------------------

      case 'loading':
         return <div className="loading-content"><FiLoader className="spinner" /> <p>{String(data ?? 'Loading...')}</p></div>;

      case 'error':
          return <div className="error-inline">{String(data ?? 'An unknown error occurred.')}</div>;

      default:
         // Thử log ra để debug type lạ
         console.warn("Encountered unknown block type:", type, block);
         return <div className="unknown-block error-inline">Unknown block type: {type}</div>;
    }
  };


  const renderIcon = () => {
       switch(type) {
           case 'user': return <span className="block-icon user-icon"><FiUser/></span>;
           case 'ai-code': return <span className="block-icon ai-icon"><FiCode/></span>;
           case 'review': return <span className="block-icon review-icon"><FiEye/></span>;
           case 'execution':
               const execHasErr = hasErrorSignal(data);
               return <span className={`block-icon execution-icon ${execHasErr ? 'error' : 'success'}`}>{execHasErr ? <FiAlertTriangle/> : <FiCheckCircle/>}</span>;
           case 'debug': return <span className="block-icon debug-icon"><FiTool/></span>;
           case 'loading': return <span className="block-icon loading-icon"><FiLoader className="spinner"/></span>;
           case 'error': return <span className="block-icon error-icon"><FiAlertTriangle/></span>;
           // --- THÊM ICON CHO INSTALLATION ---
           case 'installation':
                const installSuccess = data?.success;
                return <span className={`block-icon installation-icon ${installSuccess ? 'success' : 'error'}`}>{installSuccess ? <FiCheckCircle/> : <FiTerminal/>}</span>;
           // ----------------------------------
           default: return <span className="block-icon unknown-icon">?</span>;
       }
   };

   // --- Actions Area (Render các nút chính) ---
   const renderActions = () => {
        const actions = [];
        if (type === 'ai-code' && data) {
            actions.push(<button key="review" onClick={() => onReview(data)} disabled={isBusy} title="Review Code"><FiEye /> Review</button>);
            actions.push(<button key="execute" onClick={() => onExecute(data)} disabled={isBusy} className="execute" title="Execute Code"><FiPlay /> Execute</button>);
        }
        if (type === 'execution' && hasErrorSignal(data)) {
            const codeThatFailed = data?.codeThatFailed;
            if (codeThatFailed) {
                 actions.push(<button key="debug" onClick={() => onDebug(codeThatFailed, data as ExecutionResult)} disabled={isBusy} className="debug" title="Debug Error"><FiTool /> Debug</button>);
            }
        }
        // Nút Apply Code bây giờ được render bên trong case 'debug' của renderContent nếu có corrected_code
        // Nút Install bây giờ được render bên trong case 'debug' của renderContent nếu có suggested_package
        return actions.length > 0 ? actions : null;
   };
   // ----------------------------------------

  return (
    // Thêm data-block-id để scroll tới được
    <div className={`interaction-block block-type-${type} ${isNew ? 'newly-added' : ''}`} data-block-id={id}>
      <div className="block-avatar"> {renderIcon()} </div>
      <div className="block-main-content">
         {/* Header cho User Block */}
         {type === 'user' && (
            <div className="block-header user-header">
               <span className="user-header-title">Prompt</span>
               <span className="block-timestamp">{formatTimestamp(timestamp)}</span>
            </div>
         )}
        {/* Nội dung chính */}
        <div className="block-content-area">{renderContent()}</div>

        {/* Khu vực Actions (chỉ render nếu có actions và không phải các type đặc biệt) */}
        {type !== 'user' && type !== 'loading' && type !== 'installation' && type !== 'debug' && ( // Loại bỏ debug vì nút Apply/Install render bên trong content
             <div className="block-actions-area">{renderActions()}</div>
        )}
      </div>
    </div>
   );
});

export default InteractionBlock;