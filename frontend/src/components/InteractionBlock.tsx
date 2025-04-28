// frontend/src/components/InteractionBlock.tsx
import React from 'react';
import { FiUser, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiCopy, FiDownload } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ExpandableOutput from './ExpandableOutput'; // Cần component này
import { ConversationBlock, ExecutionResult, ReviewResult, DebugResult } from '../App'; // Import interfaces
import { toast } from 'react-toastify';
import './CenterArea.css'; // Dùng chung CSS

interface InteractionBlockProps {
    block: ConversationBlock; // Giờ đã có isNew?
    isBusy: boolean;
    onReview: (codeToReview: string) => void;
    onExecute: (codeToExecute: string) => void;
    onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
    onApplyCorrectedCode: (code: string) => void;
    expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
    onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
    // Bỏ isCollapsible và onToggleCollapse
}

// Helper format timestamp
const formatTimestamp = (isoString: string) => {
    try {
        const date = new Date(isoString);
        // Giữ định dạng HH:MM AM/PM
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return ''; // Trả về rỗng nếu timestamp không hợp lệ
    }
};

// Markdown Components (nếu chưa có thì thêm vào)
const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children ?? '').replace(/\n$/, '');
      const handleCopyMdCode = () => { navigator.clipboard.writeText(codeString); toast.info("Copied!"); };
      return !inline && match ? (
        <div className="markdown-code-block">
            <div className="code-block-header">
                <span>{match[1]}</span>
                <button onClick={handleCopyMdCode} className="icon-button subtle small copy-button" title="Copy code"><FiCopy /></button>
             </div>
            <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" {...props} customStyle={{ margin: '0', borderRadius: '0 0 var(--border-radius-small) var(--border-radius-small)', fontSize: '0.8rem', backgroundColor: 'transparent' }} codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}>
                {codeString}
            </SyntaxHighlighter>
        </div>
      ) : ( <code className={`inline-code ${className || ''}`} {...props}>{children}</code> );
    }
    // Có thể thêm các component khác cho p, ul, ol, blockquote... nếu muốn tùy chỉnh thêm
};


const InteractionBlock: React.FC<InteractionBlockProps> = React.memo(({
    block, isBusy, onReview, onExecute, onDebug, onApplyCorrectedCode,
    expandedOutputs, onToggleOutputExpand
 }) => {
  const { type, data, id, timestamp, isNew } = block; // Lấy isNew
  const handleCopy = (text: string | null | undefined) => { if (typeof text === 'string') { navigator.clipboard.writeText(text); toast.info("Copied!"); } };
  const handleDownload = (filename: string, text: string | null | undefined) => { if (typeof text === 'string') { const element = document.createElement("a"); const file = new Blob([text], {type: 'text/plain;charset=utf-8'}); element.href = URL.createObjectURL(file); element.download = filename; document.body.appendChild(element); element.click(); document.body.removeChild(element); } };

  const renderContent = () => {
    if (!data && type !== 'loading' && type !== 'user') return <div className="error-inline">Error: Invalid block data for type '{type}'</div>;
    switch (type) {
      case 'user':
        // Chỉ render prompt text
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
                <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block" codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}>
                    {codeStr}
                </SyntaxHighlighter>
             </div>
         ) : <p className="error-inline">Empty code block received.</p>;

      case 'review':
        return (
            <div className="markdown-content review-content">
                {data?.error ? (
                    <p className="error-inline">{data.error}</p>
                 ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {data?.review || ''}
                    </ReactMarkdown>
                 )}
            </div>
        );

      case 'execution':
        const execData = data as (ExecutionResult & { codeThatFailed?: string });
        const currentOutputState = expandedOutputs[id] || { stdout: false, stderr: false };
        const hasError = execData?.return_code !== 0 || execData?.error?.trim();
        const stdoutLooksError = hasErrorSignal(execData);
        return (
          <div className={`execution-content ${hasError || stdoutLooksError ? 'error' : ''}`}>
            {execData?.message && !execData.message.startsWith("Thực thi") && <p className="exec-message">{execData.message}</p>}
            <ExpandableOutput
              text={execData?.output}
              label="stdout"
              isExpanded={currentOutputState.stdout}
              onToggleExpand={() => onToggleOutputExpand(id, 'stdout')}
              className="stdout-section"
            />
            <ExpandableOutput
              text={execData?.error}
              label="stderr"
              isExpanded={currentOutputState.stderr}
              onToggleExpand={() => onToggleOutputExpand(id, 'stderr')}
              className="stderr-section"
            />
            <p className="return-code">Return Code: {execData?.return_code ?? 'N/A'}</p>
          </div>
        );

      case 'debug':
        const debugData = data as DebugResult;
        const correctedCode = debugData?.corrected_code?.trim();
        return (
            <div className="debug-content">
                {debugData?.error && <p className="error-inline">{debugData.error}</p>}
                {debugData?.explanation && (
                    <div className="markdown-content explanation-content">
                        <h4>Explanation & Suggestion</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {debugData.explanation}
                        </ReactMarkdown>
                    </div>
                 )}
                 {correctedCode && (
                    <>
                        <h4>Suggested Code</h4>
                        <div className="code-block-container">
                            <div className="code-block-header">
                                <span>python (corrected)</span>
                                <button onClick={() => handleCopy(correctedCode)} className="icon-button subtle small" title="Copy"><FiCopy /></button>
                             </div>
                            <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block corrected-code" codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}>
                                {correctedCode}
                            </SyntaxHighlighter>
                        </div>
                    </>
                 )}
            </div>
         );

      case 'loading':
         return <div className="loading-content"><FiLoader className="spinner" /> <p>{String(data ?? 'Loading...')}</p></div>;

      case 'error':
          return <div className="error-inline">{String(data ?? 'An unknown error occurred.')}</div>;

      default: return <div className="unknown-block error-inline">Unknown block type: {type}</div>;
    }
  };

  // Helper kiểm tra lỗi cho execution block
  const hasErrorSignal = (execData: any): boolean => {
    if (!execData) return false;
    const hasStdErr = execData?.error?.trim();
    const nonZeroReturn = execData?.return_code !== 0;
    const stdoutLooksLikeError = execData?.output?.trim() && ['lỗi', 'error', 'failed', 'không thể', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy'].some(kw => execData.output.toLowerCase().includes(kw));
    return !!(nonZeroReturn || hasStdErr || stdoutLooksLikeError);
 }


  const renderIcon = () => {
       switch(type) {
           case 'user': return <span className="block-icon user-icon"><FiUser/></span>;
           case 'ai-code': return <span className="block-icon ai-icon"><FiCode/></span>;
           case 'review': return <span className="block-icon review-icon"><FiEye/></span>;
           case 'execution': const hasErr = hasErrorSignal(data); return <span className={`block-icon execution-icon ${hasErr ? 'error' : 'success'}`}>{hasErr ? <FiAlertTriangle/> : <FiCheckCircle/>}</span>;
           case 'debug': return <span className="block-icon debug-icon"><FiTool/></span>;
           case 'loading': return <span className="block-icon loading-icon"><FiLoader className="spinner"/></span>;
           case 'error': return <span className="block-icon error-icon"><FiAlertTriangle/></span>;
           default: return <span className="block-icon unknown-icon">?</span>;
       }
   };

   const renderActions = () => {
        if (type === 'ai-code' && data) {
            return (<> <button onClick={() => onReview(data)} disabled={isBusy} title="Review Code"><FiEye /> Review</button> <button onClick={() => onExecute(data)} disabled={isBusy} className="execute" title="Execute Code"><FiPlay /> Execute</button> </>);
        }
        if (type === 'execution' && hasErrorSignal(data)) {
            const codeThatFailed = data?.codeThatFailed;
            if (codeThatFailed) {
                return <button onClick={() => onDebug(codeThatFailed, data as ExecutionResult)} disabled={isBusy} className="debug" title="Debug Error"><FiTool /> Debug</button>;
            }
        }
        if (type === 'debug' && data?.corrected_code) {
            return <button onClick={() => onApplyCorrectedCode(data.corrected_code)} disabled={isBusy} className="apply-code" title="Apply Corrected Code">Use This Code</button>;
        }
        return null;
   };

  return (
    <div className={`interaction-block block-type-${type} ${isNew ? 'newly-added' : ''}`}>
      <div className="block-avatar"> {renderIcon()} </div>
      <div className="block-main-content">
         {type === 'user' && (
            <div className="block-header user-header">
               <span className="user-header-title">Prompt</span>
               <span className="block-timestamp">{formatTimestamp(timestamp)}</span>
            </div>
         )}
        <div className="block-content-area">{renderContent()}</div>
        {/* Chỉ render action nếu không phải là block user hoặc loading */}
        {type !== 'user' && type !== 'loading' && (
             <div className="block-actions-area">{renderActions()}</div>
        )}
      </div>
    </div>
   );
});

export default InteractionBlock;