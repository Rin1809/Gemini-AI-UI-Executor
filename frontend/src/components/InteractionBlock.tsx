// frontend/src/components/InteractionBlock.tsx
import React from 'react';
// Import các icon cần thiết
import { FiUser, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiCopy, FiDownload, FiTerminal, FiHelpCircle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ExpandableOutput from './ExpandableOutput';
// Import các kiểu dữ liệu, bao gồm cả ExplainResult (MỚI)
import { ConversationBlock, ExecutionResult, ReviewResult, DebugResult, InstallationResult, ExplainResult } from '../App';
import { toast } from 'react-toastify';
import './CenterArea.css';

// --- Props Interface ---
interface InteractionBlockProps {
    block: ConversationBlock;
    isBusy: boolean; // Dùng isBusy chung thay vì các state riêng lẻ
    onReview: (codeToReview: string, blockId: string) => void; // Thêm blockId
    onExecute: (codeToExecute: string, blockId: string) => void; // Thêm blockId
    onDebug: (codeToDebug: string, executionResult: ExecutionResult, blockId: string) => void; // Thêm blockId
    onApplyCorrectedCode: (code: string, originalDebugBlockId: string) => void; // Thêm blockId
    onInstallPackage: (packageName: string, originalDebugBlockId: string) => Promise<void>; // Thêm blockId
    onExplain: (blockId: string, contentToExplain: any, context: string) => void; // Hàm explain mới
    expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
    onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
    'data-block-id'?: string;
}
// ------------------------

// --- Hàm định dạng thời gian ---
const formatTimestamp = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return ''; }
};
// ---------------------------

// --- Component tùy chỉnh cho Markdown ---
const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children ?? '').replace(/\n$/, '');
      const handleCopyMdCode = () => {
          navigator.clipboard.writeText(codeString).then(() => toast.info("Đã sao chép mã Markdown!"));
      };
      return !inline && match ? (
        <div className="markdown-code-block">
            <div className="code-block-header">
                <span>{match[1]}</span>
                <button onClick={handleCopyMdCode} className="icon-button subtle small copy-button" title="Sao chép mã"><FiCopy /></button>
             </div>
            <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" {...props} >
                {codeString}
            </SyntaxHighlighter>
        </div>
      ) : (
        <code className={`inline-code ${className || ''}`} {...props}>{children}</code>
      );
    }
};
// -------------------------------------------------------

const InteractionBlock: React.FC<InteractionBlockProps> = React.memo(({
    block, isBusy, onReview, onExecute, onDebug, onApplyCorrectedCode,
    onInstallPackage, onExplain, // Nhận onExplain
    expandedOutputs, onToggleOutputExpand
 }) => {
  const { type, data, id, timestamp, isNew } = block;

  // --- Hàm xử lý Sao chép / Tải xuống code ---
  const handleCopy = (text: string | null | undefined) => {
    if (typeof text === 'string') {
      navigator.clipboard.writeText(text).then(() => toast.info("Đã sao chép mã!"));
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
      URL.revokeObjectURL(element.href);
    }
  };
  // -----------------------------------------

  // --- Hàm kiểm tra dấu hiệu lỗi ---
  const hasErrorSignal = (execData: any): boolean => {
      if (!execData) return false;
      const hasStdErr = !!execData?.error?.trim();
      const nonZeroReturn = execData?.return_code !== 0;
      const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
      const stdoutLooksError = !!execData?.output?.trim() && stdoutErrorKeywords.some(kw => execData.output!.toLowerCase().includes(kw));
      // Coi lỗi API (-200) cũng là tín hiệu lỗi để debug/explain
      return !!(nonZeroReturn || hasStdErr || stdoutLooksError || execData?.return_code === -200);
  };
  // ------------------------------------------------------

   // --- Hàm render nội dung chính của khối ---
   // Đổi tên lại thành renderContent (không cần trả về nút explain nữa)
  const renderContent = (): JSX.Element | null => {
    let mainContentElement: JSX.Element | null = null;

    // Logic render nội dung chính cho từng loại block (TƯƠNG TỰ NHƯ TRƯỚC, chỉ bỏ phần gán explainButtonElement)
    switch (type) {
      case 'user':
        mainContentElement = <div className="prompt-text">{String(data ?? '')}</div>;
        break;

      case 'ai-code':
        const codeStr = String(data ?? '').trim();
        if (codeStr) {
            mainContentElement = (
                <div className="code-block-container">
                   <div className="code-block-header">
                       <span>python</span>
                       <div>
                           <button onClick={() => handleCopy(codeStr)} className="icon-button subtle small" title="Sao chép"><FiCopy /></button>
                           <button onClick={() => handleDownload("script.py", codeStr)} className="icon-button subtle small" title="Tải xuống"><FiDownload /></button>
                       </div>
                   </div>
                   <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block">
                       {codeStr}
                   </SyntaxHighlighter>
                </div>
            );
        } else {
             mainContentElement = <p className="error-inline">Nhận được khối mã rỗng.</p>;
        }
        break;

      case 'review':
        const reviewData = data as ReviewResult;
        mainContentElement = (
            <div className="markdown-content review-content">
                {reviewData?.error ? ( <p className="error-inline">{reviewData.error}</p> ) :
                 ( <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{reviewData?.review || '(Không có nội dung đánh giá)'}</ReactMarkdown> )
                }
            </div>
        );
        break;

      case 'execution':
        const execData = data as ExecutionResult;
        const currentOutputStateExec = expandedOutputs[id] || { stdout: false, stderr: false };
        const execHasError = hasErrorSignal(execData);
        mainContentElement = (
          <div className={`execution-content ${execHasError ? 'error' : ''}`}>
             {execData?.warning && ( <p className="exec-warning error-inline"><FiAlertTriangle style={{ marginRight: '5px', verticalAlign: 'middle' }}/> {execData.warning}</p> )}
             {execData?.message && !execData.message.startsWith("Thực thi") && <p className="exec-message">{execData.message}</p>}
             <ExpandableOutput text={execData?.output} label="stdout" isExpanded={currentOutputStateExec.stdout} onToggleExpand={() => onToggleOutputExpand(id, 'stdout')} className="stdout-section" />
             <ExpandableOutput text={execData?.error} label="stderr" isExpanded={currentOutputStateExec.stderr} onToggleExpand={() => onToggleOutputExpand(id, 'stderr')} className="stderr-section" />
             <p className="return-code">Mã trả về: {execData?.return_code ?? 'N/A'}</p>
          </div>
        );
        break;

      case 'debug':
        const debugData = data as DebugResult;
        const correctedCode = debugData?.corrected_code?.trim();
        const suggestedPackage = debugData?.suggested_package;
        mainContentElement = (
            <div className="debug-content">
                {debugData?.error && <p className="error-inline">{debugData.error}</p>}
                {debugData?.explanation && (
                    <div className="markdown-content explanation-content">
                        <h4>Giải thích & Đề xuất</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{debugData.explanation}</ReactMarkdown>
                    </div>
                 )}
                 {suggestedPackage && (
                     <div className="install-suggestion-area block-actions-area">
                         <button onClick={() => onInstallPackage(suggestedPackage, id)} disabled={isBusy} className="install-package-button" title={`Cài đặt package '${suggestedPackage}' bằng pip`} ><FiDownload /> Cài đặt <code>{suggestedPackage}</code></button>
                     </div>
                 )}
                 {correctedCode && (
                    <>
                        <h4>Mã đề xuất</h4>
                        <div className="code-block-container">
                            <div className="code-block-header">
                                <span>python (đã sửa)</span>
                                <div>
                                    <button onClick={() => handleCopy(correctedCode)} className="icon-button subtle small" title="Sao chép"><FiCopy /></button>
                                    <button onClick={() => handleDownload("corrected_script.py", correctedCode)} className="icon-button subtle small" title="Tải xuống"><FiDownload /></button>
                                </div>
                            </div>
                            <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block corrected-code">{correctedCode}</SyntaxHighlighter>
                            <div className="block-actions-area apply-action-area">
                                <button onClick={() => onApplyCorrectedCode(correctedCode, id)} disabled={isBusy} className="apply-code" title="Sử dụng mã này">Sử dụng Mã Này</button>
                            </div>
                        </div>
                    </>
                 )}
                 {!debugData?.error && !debugData?.explanation && !correctedCode && !suggestedPackage && ( <p className="info-inline">(Không có đề xuất hoặc mã sửa lỗi cụ thể.)</p> )}
            </div>
         );
         break;

      case 'installation':
          const installData = data as InstallationResult;
          const currentOutputStateInst = expandedOutputs[id] || { stdout: false, stderr: false };
          mainContentElement = (
              <div className={`installation-content ${!installData.success ? 'error' : ''}`}>
                  <p className="install-message">
                      {installData.success ? <FiCheckCircle style={{ color: 'var(--success-color)', marginRight: '8px', flexShrink: 0 }}/> : <FiAlertTriangle style={{ color: 'var(--danger-color)', marginRight: '8px', flexShrink: 0 }}/> }
                      Cài đặt <strong>{installData.package_name || 'package'}</strong>: {installData.message}
                  </p>
                  <ExpandableOutput text={installData?.output} label="pip output" isExpanded={currentOutputStateInst.stdout} onToggleExpand={() => onToggleOutputExpand(id, 'stdout')} className="stdout-section installation-output" />
                  <ExpandableOutput text={installData?.error} label="pip error" isExpanded={currentOutputStateInst.stderr} onToggleExpand={() => onToggleOutputExpand(id, 'stderr')} className="stderr-section installation-error" />
              </div>
          );
          break;

      case 'explanation':
          const explainData = data as ExplainResult;
          mainContentElement = (
             <div className="markdown-content explanation-content">
                  {explainData?.error ? ( <p className="error-inline">{explainData.error}</p> ) :
                   ( <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{explainData?.explanation || '(Không có nội dung giải thích)'}</ReactMarkdown> )
                  }
              </div>
          );
          break;

      case 'loading':
         mainContentElement = <div className="loading-content"><FiLoader className="spinner" /> <p>{String(data ?? 'Đang tải...')}</p></div>;
         break;

      case 'error':
          const errorMsg = String(data ?? '');
          mainContentElement = <div className="error-inline">{errorMsg || 'Đã xảy ra lỗi không xác định.'}</div>;
          break;

      default:
         console.warn("Gặp phải loại khối không xác định:", type, block);
         mainContentElement = <div className="unknown-block error-inline">Loại khối không xác định: {type}</div>;
    }

    return mainContentElement;
  };
  // ---------------------------------------------------

  // --- Hàm render icon ---
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
           case 'installation':
                const installSuccess = (data as InstallationResult)?.success;
                return <span className={`block-icon installation-icon ${installSuccess ? 'success' : 'error'}`}>{installSuccess ? <FiCheckCircle/> : <FiTerminal/>}</span>;
           case 'explanation': return <span className="block-icon info-icon"><FiHelpCircle/></span>;
           default: return <span className="block-icon unknown-icon">?</span>;
       }
   };
  // ---------------------------------------

   // --- Tạo mảng chứa tất cả các nút hành động ---
   const renderActionButtons = (): JSX.Element[] => {
        const actionButtons: JSX.Element[] = [];

        // Nút Review và Execute cho AI Code
        if (type === 'ai-code' && data) {
            actionButtons.push(<button key="review" onClick={() => onReview(data, id)} disabled={isBusy} title="Đánh giá mã"><FiEye /> Đánh giá</button>);
            actionButtons.push(<button key="execute" onClick={() => onExecute(data, id)} disabled={isBusy} className="execute" title="Thực thi mã"><FiPlay /> Thực thi</button>);
        }

        // Nút Debug cho Execution có lỗi
        if (type === 'execution' && hasErrorSignal(data)) {
            const codeThatFailed = (data as ExecutionResult)?.codeThatFailed;
            if (codeThatFailed) {
                 actionButtons.push(<button key="debug" onClick={() => onDebug(codeThatFailed, data as ExecutionResult, id)} disabled={isBusy} className="debug" title="Gỡ lỗi"><FiTool /> Gỡ lỗi</button>);
            }
        }

        // Nút Explain (hiển thị cho nhiều loại block)
        let explainContent: any = data;
        let explainContext: string = type;
        let showExplainButton = false;

        if (type === 'ai-code' && data) {
            explainContent = String(data).trim();
            explainContext = 'python_code';
            showExplainButton = !!explainContent;
        } else if (type === 'review' && (data as ReviewResult)?.review && !(data as ReviewResult)?.error) {
            explainContent = (data as ReviewResult).review;
            explainContext = 'review_text';
            showExplainButton = true;
        } else if (type === 'execution') {
            explainContent = data; // Giữ nguyên object
            explainContext = 'execution_result';
            showExplainButton = true;
        } else if (type === 'debug' && !(data as DebugResult)?.error && ((data as DebugResult)?.explanation || (data as DebugResult)?.corrected_code || (data as DebugResult)?.suggested_package)) {
            explainContent = data; // Giữ nguyên object
            explainContext = 'debug_result';
            showExplainButton = true;
        } else if (type === 'installation') {
            explainContent = data;
            explainContext = 'installation_result';
            showExplainButton = true;
        } else if (type === 'error' && data) {
             explainContent = String(data);
             explainContext = 'error_message';
             showExplainButton = true;
        }

        if (showExplainButton) {
             actionButtons.push(<button key="explain" onClick={() => onExplain(id, explainContent, explainContext)} disabled={isBusy} className="explain" title="Giải thích nội dung này"><FiHelpCircle /> Giải thích</button>);
        }

        return actionButtons;
   };
   // --------------------------------------------------------

  const mainContentElement = renderContent();
  const actionButtonElements = renderActionButtons();

  return (
    <div className={`interaction-block block-type-${type} ${isNew ? 'newly-added' : ''}`} data-block-id={id}>
      <div className="block-avatar"> {renderIcon()} </div>
      <div className="block-main-content">
         {type === 'user' && (
            <div className="block-header user-header">
               <span className="user-header-title">ᓚᘏᗢ - Prompt</span>
               <span className="block-timestamp">{formatTimestamp(timestamp)}</span>
            </div>
         )}
        <div className="block-content-area">{mainContentElement}</div>

        {/* Render tất cả các nút hành động trong cùng một khu vực */}
        {actionButtonElements.length > 0 && (
             <div className="block-actions-area">{actionButtonElements}</div>
        )}
      </div>
    </div>
   );
});

export default InteractionBlock;