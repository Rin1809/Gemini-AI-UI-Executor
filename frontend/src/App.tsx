// frontend/src/App.tsx
import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import CenterArea from './components/CenterArea';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// --- Interfaces ---
export interface ExecutionResult {
  message: string;
  output: string;
  error: string;
  return_code: number;
  codeThatFailed?: string; // Giữ lại code đã chạy gây lỗi
}
export interface ReviewResult {
    review?: string;
    error?: string;
}
export interface ModelConfig {
    modelName: string;
    temperature: number;
    topP: number;
    topK: number;
    safetySetting: string;
}
export interface DebugResult {
    explanation: string | null;
    corrected_code: string | null;
    error?: string;
}

// --- Cập nhật ConversationBlock để thêm timestamp ---
export interface ConversationBlock {
    type: string;
    data: any;
    id: string;
    timestamp: string; // Thêm timestamp dạng ISO string
}
// -----------------------------------------

const MODEL_NAME_STORAGE_KEY = 'geminiExecutorModelName';

function App() {
  // --- State ---
  const [prompt, setPrompt] = useState<string>('');
  const [conversation, setConversation] = useState<Array<ConversationBlock>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelName: 'gemini-1.5-flash',
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    safetySetting: 'BLOCK_MEDIUM_AND_ABOVE',
  });
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, { stdout: boolean; stderr: boolean }>>({});
  // -------------

  // --- Load Model Name ---
  useEffect(() => {
    const savedModelName = localStorage.getItem(MODEL_NAME_STORAGE_KEY);
    if (savedModelName) {
      setModelConfig(prev => ({ ...prev, modelName: savedModelName }));
    }
  }, []);
  // -----------------------

  // --- Handlers (Config, Save) ---
  const handleConfigChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setModelConfig(prev => ({
      ...prev,
      [name]: (name === 'temperature' || name === 'topP' || name === 'topK') ? parseFloat(value) : value
    }));
  }, []);

  const handleSaveSettings = useCallback(() => {
    try {
      localStorage.setItem(MODEL_NAME_STORAGE_KEY, modelConfig.modelName);
      toast.success(`Saved model: ${modelConfig.modelName}`);
    } catch (e) {
      toast.error("Failed to save settings.");
      console.error("Failed to save settings:", e);
    }
  }, [modelConfig.modelName]);
  // -----------------------------

  // --- API Request Helper ---
  const sendApiRequest = useCallback(async (endpoint: string, body: object) => {
    const response = await fetch(`http://localhost:5001/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, model_config: modelConfig }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `API Error ${response.status}`);
    }
    return data;
  }, [modelConfig]);
  // ------------------------

  // --- Toggle Handlers ---
  const toggleCollapse = useCallback((blockId: string) => {
    setCollapsedStates(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  const toggleOutputExpand = useCallback((blockId: string, type: 'stdout' | 'stderr') => {
    setExpandedOutputs(prev => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || { stdout: false, stderr: false }),
        [type]: !prev[blockId]?.[type]
      }
    }));
  }, []);
  // ---------------------

  // --- Action Handlers (Thêm timestamp) ---
  const handleGenerate = useCallback(async (currentPrompt: string) => {
    if (!currentPrompt.trim()) { toast.warn('Vui lòng nhập yêu cầu.'); return; }
    setIsLoading(true);
    const now = new Date().toISOString();

    const newCollapsedStates: Record<string, boolean> = {};
    conversation.forEach(block => {
      if (block.type === 'user') { newCollapsedStates[block.id] = true; }
    });
    setCollapsedStates(prev => ({ ...prev, ...newCollapsedStates }));

    const newUserBlock: ConversationBlock = { type: 'user', data: currentPrompt, id: Date.now().toString() + 'u', timestamp: now };
    const loadingId = Date.now().toString() + 'g_load';
    const loadingBlock: ConversationBlock = { type: 'loading', data: 'Generating code...', id: loadingId, timestamp: now };

    setConversation([...conversation, newUserBlock, loadingBlock]);
    setCollapsedStates(prev => ({ ...prev, [newUserBlock.id]: false })); // Mở rộng block mới

    try {
      const data = await sendApiRequest('generate', { prompt: currentPrompt });
      setConversation(prev => [
          ...prev.filter(b => b.id !== loadingId),
          { type: 'ai-code', data: data.code, id: Date.now().toString() + 'a', timestamp: new Date().toISOString() }
      ]);
      toast.success("Code generated!");
      setPrompt('');
    } catch (err: any) {
      toast.error(err.message || 'Error generating code.');
      setConversation(prev => [
          ...prev.filter(b => b.id !== loadingId),
          { type: 'error', data: err.message || 'Error generating code.', id: Date.now().toString() + 'e', timestamp: new Date().toISOString() }
      ]);
      console.error("Error generating code:", err);
    } finally { setIsLoading(false); }
  }, [sendApiRequest, conversation]);

  const handleReviewCode = useCallback(async (codeToReview: string | null) => {
     if (!codeToReview) { toast.warn("No code to review."); return; }
     setIsReviewing(true);
     const now = new Date().toISOString();
     const loadingId = Date.now().toString() + 'r_load';
     setConversation(prev => [...prev, { type: 'loading', data: 'Reviewing code...', id: loadingId, timestamp: now }]);

     try {
       const data = await sendApiRequest('review', { code: codeToReview });
       setConversation(prev => [
           ...prev.filter(b => b.id !== loadingId),
           { type: 'review', data: { review: data.review }, id: Date.now().toString() + 'r', timestamp: new Date().toISOString() }
       ]);
       toast.success("Review complete!");
     } catch (err: any) {
       const errorData = { error: err.message || 'Error during review.' };
       setConversation(prev => [
            ...prev.filter(b => b.id !== loadingId),
            { type: 'review', data: errorData, id: Date.now().toString() + 'r_err', timestamp: new Date().toISOString() }
       ]);
       toast.error(err.message || 'Error during review.');
     } finally { setIsReviewing(false); }
   }, [sendApiRequest, conversation]);

  const handleExecute = useCallback(async (codeToExecute: string | null) => {
    if (!codeToExecute) { toast.warn("No code to execute."); return; }
    const userConfirmation = window.confirm("SECURITY WARNING! Executing AI-generated code can be dangerous. Continue?");
    if (!userConfirmation) { toast.info("Execution cancelled."); return; }
    setIsExecuting(true);
    const toastId = toast.loading("Executing code...");
    const executionBlockId = Date.now().toString() + 'ex';
    const now = new Date().toISOString();

    try {
        const response = await fetch('http://localhost:5001/api/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: codeToExecute }), });
        const data: ExecutionResult = await response.json();
        const executionDataWithOrigin = { ...data, codeThatFailed: codeToExecute };
        setConversation(prev => [...prev, { type: 'execution', data: executionDataWithOrigin, id: executionBlockId, timestamp: now }]);
        const stdoutErrorKeywords = ['lỗi', 'error', 'failed', 'không thể', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy'];
        const stdoutLooksLikeError = data.return_code === 0 && !data.error?.trim() && data.output?.trim() && stdoutErrorKeywords.some(kw => data.output.toLowerCase().includes(kw));

        if (response.ok && data.return_code === 0 && !data.error?.trim() && !stdoutLooksLikeError) {
             toast.update(toastId, { render: "Execution successful!", type: "success", isLoading: false, autoClose: 3000 });
        } else if (stdoutLooksLikeError) {
             toast.update(toastId, { render: "Executed, but output might contain errors.", type: "warning", isLoading: false, autoClose: 5000 });
        } else {
             toast.update(toastId, { render: "Execution failed or had errors.", type: "error", isLoading: false, autoClose: 5000 });
        }
    } catch (err: any) {
        const errorData = { message: "Connection error.", output: "", error: err.message, return_code: -200, codeThatFailed: codeToExecute };
        setConversation(prev => [...prev, { type: 'execution', data: errorData, id: executionBlockId + '_err', timestamp: now }]);
        toast.update(toastId, { render: `Connection Error: ${err.message}`, type: "error", isLoading: false, autoClose: 5000 });
    } finally { setIsExecuting(false); }
  }, [conversation]);

  const handleDebug = useCallback(async (codeToDebug: string | null, lastExecutionResult: ExecutionResult | null) => {
      const stdoutLooksLikeError = lastExecutionResult?.output?.trim() && ['lỗi', 'error', 'failed', 'không thể', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy'].some(kw => lastExecutionResult.output.toLowerCase().includes(kw));
      const hasErrorSignal = lastExecutionResult && (lastExecutionResult.return_code !== 0 || lastExecutionResult.error?.trim() || stdoutLooksLikeError);

      if (!codeToDebug || !hasErrorSignal) { toast.warn("Code and an execution result with errors are needed to debug."); return; }
       setIsDebugging(true);
       const now = new Date().toISOString();
       const loadingId = Date.now().toString() + 'd_load';
       setConversation(prev => [...prev, { type: 'loading', data: 'Debugging code...', id: loadingId, timestamp: now }]);

       let userPromptForDebug = "Original prompt unknown";
       let foundExecution = false;
       for (let i = conversation.length - 1; i >= 0; i--) {
           if (conversation[i].type === 'execution' && conversation[i].data?.codeThatFailed === codeToDebug) {
               foundExecution = true;
           }
           if (foundExecution && conversation[i].type === 'user') {
               userPromptForDebug = conversation[i].data;
               break;
           }
       }

       try {
           const data = await sendApiRequest('debug', { prompt: userPromptForDebug, code: codeToDebug, stdout: lastExecutionResult?.output ?? '', stderr: lastExecutionResult?.error ?? '', });
           setConversation(prev => prev.filter(b => b.id !== loadingId));
           const debugData = { explanation: data.explanation, corrected_code: data.corrected_code };
           setConversation(prev => [...prev, { type: 'debug', data: debugData, id: Date.now().toString() + 'dbg', timestamp: new Date().toISOString() }]);
           toast.success("Debugging analysis complete!");
       } catch (err: any) {
           setConversation(prev => prev.filter(b => b.id !== loadingId));
           const errorData = { explanation: null, corrected_code: null, error: err.message };
           setConversation(prev => [...prev, { type: 'debug', data: errorData, id: Date.now().toString() + 'dbg_err', timestamp: new Date().toISOString() }]);
           toast.error(`Debug failed: ${err.message}`);
       } finally { setIsDebugging(false); }
  }, [conversation, sendApiRequest]);

  const applyCorrectedCode = useCallback((correctedCode: string) => {
      const newBlockId = Date.now().toString() + 'ac';
      setConversation(prev => [...prev, { type: 'ai-code', data: correctedCode, id: newBlockId, timestamp: new Date().toISOString() }]);
      const lastUserBlock = conversation.slice().reverse().find(b => b.type === 'user');
       if (lastUserBlock) {
           setCollapsedStates(prev => ({ ...prev, [lastUserBlock.id]: false }));
       }
      toast.success("Corrected code applied.");
  }, [conversation]);
  // -------------------------------------------------

  const isBusy = isLoading || isExecuting || isReviewing || isDebugging;

  return (
    <div className="main-container">
      <ToastContainer theme="dark" position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <CenterArea
        conversation={conversation}
        isLoading={isLoading}
        isBusy={isBusy}
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        onReview={handleReviewCode}
        onExecute={handleExecute}
        onDebug={handleDebug}
        onApplyCorrectedCode={applyCorrectedCode}
        modelConfig={modelConfig}
        onConfigChange={handleConfigChange}
        onSaveSettings={handleSaveSettings}
        // Props mới
        collapsedStates={collapsedStates}
        onToggleCollapse={toggleCollapse}
        expandedOutputs={expandedOutputs}
        onToggleOutputExpand={toggleOutputExpand}
      />
    </div>
  );
}
export default App;