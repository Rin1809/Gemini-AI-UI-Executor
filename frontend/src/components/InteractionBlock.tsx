// frontend/src/components/InteractionBlock.tsx
import React from 'react';
import { FiUser, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiCopy, FiDownload } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ExpandableOutput from './ExpandableOutput';
import { ConversationBlock, ExecutionResult, ReviewResult, DebugResult } from '../App'; // Đảm bảo import đúng các types
import { toast } from 'react-toastify';
import './CenterArea.css';

interface InteractionBlockProps {
    block: ConversationBlock;
    isBusy: boolean;
    onReview: (codeToReview: string) => void;
    onExecute: (codeToExecute: string) => void;
    onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
    onApplyCorrectedCode: (code: string) => void;
    expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
    onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
    'data-block-id'?: string; // Prop này nhận id từ CenterArea
}

// Helper format timestamp
const formatTimestamp = (isoString: string | undefined): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        console.error("Invalid timestamp:", isoString, e);
        return '';
    }
};

// Markdown Components
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
            <SyntaxHighlighter
               style={vscDarkPlus as any}
               language={match[1]}
               PreTag="div"
               {...props}
               // Sử dụng customStyle thay vì style trực tiếp để tránh xung đột
               customStyle={{ margin: '0', borderRadius: '0 0 var(--border-radius-small) var(--border-radius-small)', fontSize: '0.8rem', backgroundColor: 'transparent', padding: 'calc(var(--spacing-unit)*0.75) var(--spacing-unit)'}}
               codeTagProps={{ style: { fontFamily: 'var(--code-font-family)', lineHeight: '1.4' }}}
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
      ) : (
         <code className={`inline-code ${className || ''}`} {...props}>
            {children}
         </code>
      );
    }
};


const InteractionBlock: React.FC<InteractionBlockProps> = React.memo(({
    block, isBusy, onReview, onExecute, onDebug, onApplyCorrectedCode,
    expandedOutputs, onToggleOutputExpand,
    'data-block-id': dataBlockId // Nhận prop data-block-id
 }) => {
  const { type, data, id, timestamp, isNew } = block;

  const handleCopy = (text: string | null | undefined) => {
     if (typeof text === 'string') {
        navigator.clipboard.writeText(text).then(() => {
           toast.info("Copied!");
        }).catch(err => {
           toast.error("Failed to copy!");
           console.error("Clipboard copy failed:", err);
        });
     }
  };

  const handleDownload = (filename: string, text: string | null | undefined) => {
     if (typeof text === 'string') {
        try {
            const element = document.createElement("a");
            const file = new Blob([text], {type: 'text/plain;charset=utf-8'});
            element.href = URL.createObjectURL(file);
            element.download = filename;
            document.body.appendChild(element); // Cần thiết cho Firefox
            element.click();
            document.body.removeChild(element); // Dọn dẹp
            URL.revokeObjectURL(element.href); // Giải phóng bộ nhớ
        } catch (err) {
            toast.error("Failed to download file.");
            console.error("File download failed:", err);
        }
     }
  };

    // Helper kiểm tra lỗi cho execution block
    const hasErrorSignal = (execData: any): boolean => {
        if (!execData) return false;
        const hasStdErr = execData?.error?.trim();
        const nonZeroReturn = execData?.return_code !== 0 && execData?.return_code !== undefined; // return_code có thể là 0
        // Kiểm tra output có chứa từ khóa lỗi không, ngay cả khi return code = 0 và stderr rỗng
        const stdoutErrorKeywords = ['lỗi', 'error', 'failed', 'không thể', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'warning'];
        const stdoutLooksLikeError = execData?.output?.trim() && stdoutErrorKeywords.some(kw => execData.output.toLowerCase().includes(kw));

        return !!(nonZeroReturn || hasStdErr || stdoutLooksLikeError);
    };


  const renderContent = () => {
    // Thêm kiểm tra data tồn tại chặt chẽ hơn
    if (data === undefined || data === null) {
        // Cho phép loading và user không cần data
        if (type !== 'loading' && type !== 'user') {
             console.warn(`Invalid block data for type '${type}' (id: ${id}):`, data);
             return <div className="error-inline">Error: Invalid block data received.</div>;
        }
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
                <SyntaxHighlighter
                    language="python"
                    style={vscDarkPlus as any}
                    className="main-code-block"
                    // Sử dụng customStyle thay vì style để tránh ghi đè
                    customStyle={{ margin: '0', padding: 'var(--spacing-unit) calc(var(--spacing-unit)*1.5)', borderRadius: '0', fontSize: '0.875rem', backgroundColor: 'transparent', lineHeight: '1.45' }}
                    codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}
                    PreTag="pre" // Đảm bảo là thẻ pre
                 >
                    {codeStr}
                </SyntaxHighlighter>
             </div>
         ) : <p className="error-inline">Empty code block received.</p>;

      case 'review':
        const reviewData = data as ReviewResult; // Ép kiểu để kiểm tra
        return (
            <div className="markdown-content review-content">
                {reviewData?.error ? (
                    <p className="error-inline">{reviewData.error}</p>
                 ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {reviewData?.review || ''}
                    </ReactMarkdown>
                 )}
            </div>
        );

        case 'execution':
            const execData = data as (ExecutionResult & { codeThatFailed?: string });
            const currentOutputState = expandedOutputs[id] || { stdout: false, stderr: false };
            const hasErr = hasErrorSignal(execData); // Gọi helper

            return (
              <div className={`execution-content ${hasErr ? 'error' : ''}`}>
                 {/* Chỉ hiển thị message nếu nó khác message mặc định */}
                {execData?.message && !/^(Thực thi thành công|Thực thi hoàn tất với lỗi)\.$/.test(execData.message) && (
                    <p className="exec-message">{execData.message}</p>
                )}
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
                 {/* Luôn hiển thị return code */}
                <p className="return-code">
                    Return Code: {execData?.return_code !== undefined ? execData.return_code : 'N/A'}
                </p>
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
                             <SyntaxHighlighter
                                language="python"
                                style={vscDarkPlus as any}
                                className="main-code-block corrected-code"
                                customStyle={{ margin: '0', padding: 'var(--spacing-unit) calc(var(--spacing-unit)*1.5)', borderRadius: '0', fontSize: '0.875rem', backgroundColor: 'transparent', lineHeight: '1.45' }}
                                codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}
                                PreTag="pre"
                             >
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
          // Sử dụng error-inline style đã có
          return <div className="error-inline">{String(data ?? 'An unknown error occurred.')}</div>;

      default:
          console.error("Unknown block type encountered:", type, block);
          return <div className="unknown-block error-inline">Error: Unknown block type '{type}'</div>;
    }
  };


  const renderIcon = () => {
       switch(type) {
           case 'user': return <span className="block-icon user-icon"><FiUser/></span>;
           case 'ai-code': return <span className="block-icon ai-icon"><FiCode/></span>;
           case 'review': return <span className="block-icon review-icon"><FiEye/></span>;
           case 'execution':
                 const hasErr = hasErrorSignal(data); // Gọi lại helper
                 return <span className={`block-icon execution-icon ${hasErr ? 'error' : 'success'}`}>{hasErr ? <FiAlertTriangle/> : <FiCheckCircle/>}</span>;
           case 'debug': return <span className="block-icon debug-icon"><FiTool/></span>;
           case 'loading': return <span className="block-icon loading-icon"><FiLoader className="spinner"/></span>;
           case 'error': return <span className="block-icon error-icon"><FiAlertTriangle/></span>;
           default: return <span className="block-icon unknown-icon">?</span>;
       }
   };

   const renderActions = () => {
        // Chỉ render actions cho các block có thể có action
        if (type === 'ai-code' && data) {
            return (
                 <>
                     <button onClick={() => onReview(data)} disabled={isBusy} title="Review Code"><FiEye /> Review</button>
                     <button onClick={() => onExecute(data)} disabled={isBusy} className="execute" title="Execute Code"><FiPlay /> Execute</button>
                 </>
             );
        }
        if (type === 'execution' && hasErrorSignal(data)) {
            const codeThatFailed = (data as ExecutionResult & { codeThatFailed?: string })?.codeThatFailed;
            if (codeThatFailed) {
                return <button onClick={() => onDebug(codeThatFailed, data as ExecutionResult)} disabled={isBusy} className="debug" title="Debug Error"><FiTool /> Debug</button>;
            }
        }
        if (type === 'debug' && (data as DebugResult)?.corrected_code) {
            // Đảm bảo data.corrected_code không phải là null/undefined trước khi truyền
             const codeToApply = (data as DebugResult).corrected_code;
             if (codeToApply) {
                return <button onClick={() => onApplyCorrectedCode(codeToApply)} disabled={isBusy} className="apply-code" title="Apply Corrected Code">Use This Code</button>;
             }
        }
        // Không render gì cho user, loading, error, review
        return null;
   };

   // Render block chính
   return (
    // >>> Thêm data-block-id vào div ngoài cùng <<<
    <div className={`interaction-block block-type-${type} ${isNew ? 'newly-added' : ''}`} data-block-id={dataBlockId || id}>
      <div className="block-avatar"> {renderIcon()} </div>
      <div className="block-main-content">
         {/* Header chỉ cho user block */}
         {type === 'user' && (
            <div className="block-header user-header">
               <span className="user-header-title">Prompt</span>
               <span className="block-timestamp">{formatTimestamp(timestamp)}</span>
            </div>
         )}
        <div className="block-content-area">{renderContent()}</div>
        {/* Actions chỉ render cho các loại block phù hợp */}
        <div className="block-actions-area">{renderActions()}</div>
      </div>
    </div>
   );
});

export default InteractionBlock;