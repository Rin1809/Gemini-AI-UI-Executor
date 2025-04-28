// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect, useState, ChangeEvent } from 'react';
import { FiSend, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiUser, FiCopy, FiDownload, FiSettings, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ExecutionResult, ReviewResult, DebugResult, ModelConfig } from '../App';
import UserInput from './UserInput';
import SettingsPanel from './SettingsPanel';
import { toast } from 'react-toastify';
import './CenterArea.css';

// Interface Props cho CenterArea
interface CenterAreaProps {
  conversation: Array<{type: string, data: any, id: string}>;
  isLoading: boolean; // Generate loading
  isBusy: boolean; // Trạng thái busy chung
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: (prompt: string) => void;
  onReview: (codeToReview: string) => void;
  onExecute: (codeToExecute: string) => void;
  onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
  onApplyCorrectedCode: (code: string) => void;
  modelConfig: ModelConfig;
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveSettings: () => void;
}

// Markdown Components
const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children ?? '').replace(/\n$/, '');
      const handleCopyMdCode = () => { navigator.clipboard.writeText(codeString); toast.info("Copied!"); };
      return !inline && match ? (
        <div className="markdown-code-block">
            <div className="code-block-header"><span>{match[1]}</span><button onClick={handleCopyMdCode} className="icon-button subtle small copy-button" title="Copy code"><FiCopy /></button></div>
            <SyntaxHighlighter style={vscDarkPlus as any} language={match[1]} PreTag="div" {...props} customStyle={{ margin: '0', borderRadius: '0 0 var(--border-radius) var(--border-radius)', fontSize: '0.85rem', backgroundColor: 'var(--code-bg)' }} codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}>{codeString}</SyntaxHighlighter>
        </div>
      ) : ( <code className={`inline-code ${className || ''}`} {...props}>{children}</code> );
    }
};

// Interaction Block Component
interface InteractionBlockProps {
    block: { type: string; data: any; id: string };
    isBusy: boolean;
    onReview: (codeToReview: string) => void;
    onExecute: (codeToExecute: string) => void;
    onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
    onApplyCorrectedCode: (code: string) => void;
}

const InteractionBlock: React.FC<InteractionBlockProps> = React.memo(({ block, isBusy, onReview, onExecute, onDebug, onApplyCorrectedCode }) => {
  const { type, data } = block;
  const handleCopy = (text: string | null | undefined) => { if (typeof text === 'string') { navigator.clipboard.writeText(text); toast.info("Copied!"); } };
  const handleDownload = (filename: string, text: string | null | undefined) => { if (typeof text === 'string') { const element = document.createElement("a"); const file = new Blob([text], {type: 'text/plain;charset=utf-8'}); element.href = URL.createObjectURL(file); element.download = filename; document.body.appendChild(element); element.click(); document.body.removeChild(element); } };

  const renderContent = () => {
    if (!data && type !== 'loading') return <div className="error-inline">Error: Invalid block data for type '{type}'</div>;
    switch (type) {
      case 'user': return <div className="prompt-text">{String(data ?? '')}</div>;
      case 'ai-code': const codeStr = String(data ?? '').trim(); return codeStr ? ( <div className="code-block-container"> <div className="code-block-header"><span>python</span><div><button onClick={() => handleCopy(codeStr)} className="icon-button subtle small" title="Copy"><FiCopy /></button><button onClick={() => handleDownload("script.py", codeStr)} className="icon-button subtle small" title="Download"><FiDownload /></button></div></div> <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block" codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}>{codeStr}</SyntaxHighlighter> </div> ) : <p className="error-inline">Empty code block.</p>;
      case 'review': return (<div className="markdown-content review-content">{data?.error ? <p className="error-inline">{data.error}</p> : <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{data?.review || ''}</ReactMarkdown>}</div>);
      case 'execution': const execData = data as (ExecutionResult & {codeThatFailed?: string}); const hasError = execData?.return_code !== 0 || execData?.error?.trim(); const stdoutLooksError = hasErrorSignal(execData); return ( <div className={`execution-content ${hasError || stdoutLooksError ? 'error' : ''}`}> {execData?.message && !execData.message.startsWith("Thực thi") && <p className="exec-message">{execData.message}</p>} {execData?.output?.trim() && <div className="output-section"><span className="output-label">stdout:</span><pre className="stdout"><code>{execData.output}</code></pre></div>} {execData?.error?.trim() && <div className="output-section"><span className="output-label">stderr:</span><pre className="stderr"><code>{execData.error}</code></pre></div>} <p className="return-code">Return Code: {execData?.return_code ?? 'N/A'}</p> </div> );
      case 'debug': const debugData = data as DebugResult; const correctedCode = debugData?.corrected_code?.trim(); return ( <div className="debug-content"> {debugData?.error && <p className="error-inline">{debugData.error}</p>} {debugData?.explanation && ( <div className="markdown-content explanation-content"> <h4>Explanation & Suggestion</h4> <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{debugData.explanation}</ReactMarkdown> </div> )} {correctedCode && ( <> <h4>Suggested Code</h4><div className="code-block-container"><div className="code-block-header"><span>python (corrected)</span><button onClick={() => handleCopy(correctedCode)} className="icon-button subtle small" title="Copy"><FiCopy /></button></div><SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block corrected-code" codeTagProps={{ style: { fontFamily: 'var(--code-font-family)' } }}>{correctedCode}</SyntaxHighlighter></div> </> )} </div> );
      case 'loading': return <div className="loading-content"><FiLoader className="spinner" /> <p>{String(data ?? 'Loading...')}</p></div>;
      case 'error': return <div className="error-inline">{String(data ?? 'An unknown error occurred.')}</div>;
      default: return <div className="unknown-block error-inline">Unknown block type: {type}</div>;
    }
  };

  const renderIcon = () => {
       switch(type) {
           case 'user': return <span className="block-icon user-icon"><FiUser/></span>;
           case 'ai-code': return <span className="block-icon ai-icon"><FiCode/></span>;
           case 'review': return <span className="block-icon review-icon"><FiEye/></span>;
           case 'execution': const hasError = data?.return_code !== 0 || data?.error?.trim(); const stdoutLooksError = hasErrorSignal(data); return <span className={`block-icon execution-icon ${hasError || stdoutLooksError ? 'error' : 'success'}`}>{hasError || stdoutLooksError ? <FiAlertTriangle/> : <FiCheckCircle/>}</span>;
           case 'debug': return <span className="block-icon debug-icon"><FiTool/></span>;
           case 'loading': return <span className="block-icon loading-icon"><FiLoader className="spinner"/></span>;
           case 'error': return <span className="block-icon error-icon"><FiAlertTriangle/></span>;
           default: return <span className="block-icon unknown-icon">?</span>;
       }
   };

   // Helper to check if execution result indicates an error for debug button
   const hasErrorSignal = (execData: any): boolean => {
        if (!execData) return false;
        const hasStdErr = execData?.error?.trim();
        const nonZeroReturn = execData?.return_code !== 0;
        const stdoutLooksLikeError = execData?.output?.trim() && ['lỗi', 'error', 'failed', 'không thể', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy'].some(kw => execData.output.toLowerCase().includes(kw));
        return !!(nonZeroReturn || hasStdErr || stdoutLooksLikeError);
   }

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
    <div className={`interaction-block block-type-${type}`}>
      <div className="block-avatar"> {renderIcon()} </div>
      <div className="block-main-content">
        <div className="block-content-area">{renderContent()}</div>
        <div className="block-actions-area">{renderActions()}</div>
      </div>
    </div>
   );
});

// --- Component Chính CenterArea ---
const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    modelConfig, onConfigChange, onSaveSettings
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; } }, 50);
    }
  }, [conversation, isLoading]);

  return (
    <main className="center-area-wrapper">
        <div className="main-header">
            <h2>Gemini Executor</h2>
            <button onClick={() => setShowSettings(!showSettings)} className="icon-button subtle settings-toggle-button" title={showSettings ? "Hide Settings" : "Show Settings"}>
                {showSettings ? <FiX /> : <FiSettings />}
            </button>
        </div>
         {showSettings && ( <SettingsPanel modelConfig={modelConfig} onConfigChange={onConfigChange} onSaveSettings={onSaveSettings} isDisabled={isBusy} /> )}
      <div className="interaction-container" ref={scrollRef}>
        {conversation.map((block) => (
            <InteractionBlock
                key={block.id}
                block={block}
                isBusy={isBusy}
                onReview={onReview}
                onExecute={onExecute}
                onDebug={onDebug}
                onApplyCorrectedCode={onApplyCorrectedCode}
            />
         ))}
      </div>
      <UserInput
        prompt={prompt} setPrompt={setPrompt}
        onSend={() => onGenerate(prompt)}
        isLoading={isLoading}
      />
    </main>
  );
};
export default CenterArea;