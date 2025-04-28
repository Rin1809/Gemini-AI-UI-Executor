// frontend/src/App.tsx
import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import CenterArea from './components/CenterArea';
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// --- Interfaces (CẬP NHẬT DebugResult, THÊM InstallationResult) ---
export interface ExecutionResult {
  message: string;
  output: string;
  error: string;
  return_code: number;
  codeThatFailed?: string; // Giữ lại để biết code nào gây lỗi
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
    suggested_package?: string; // <-- THÊM DÒNG NÀY, optional
    error?: string;
}
export interface ConversationBlock {
    type: 'user' | 'ai-code' | 'review' | 'execution' | 'debug' | 'loading' | 'error' | 'installation'; // Thêm 'installation'
    data: any; // Có thể là string, ExecutionResult, ReviewResult, DebugResult, InstallationResult, null
    id: string;
    timestamp: string;
    isNew?: boolean;
}
// --- Interface Mới cho kết quả cài đặt ---
export interface InstallationResult {
    success: boolean;
    message: string;
    output: string;
    error: string;
    package_name: string; // Thêm tên package để hiển thị lại
}
// --------------------

const MODEL_NAME_STORAGE_KEY = 'geminiExecutorModelName';
const NEW_BLOCK_ANIMATION_DURATION = 500; // ms

function App() {
  // --- State (Thêm isInstalling) ---
  const [prompt, setPrompt] = useState<string>('');
  const [conversation, setConversation] = useState<Array<ConversationBlock>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Generate loading
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false); // <-- State mới
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelName: 'gemini-1.5-flash', // Hoặc model khác
    temperature: 0.7,
    topP: 0.95, // Hoặc 1.0 tùy theo API default
    topK: 40,   // Hoặc 1 tùy theo API default
    safetySetting: 'BLOCK_MEDIUM_AND_ABOVE',
  });
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, { stdout: boolean; stderr: boolean }>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  // -------------

  // --- Load Model Name ---
  useEffect(() => {
    const savedModelName = localStorage.getItem(MODEL_NAME_STORAGE_KEY);
    if (savedModelName) {
      setModelConfig(prev => ({ ...prev, modelName: savedModelName }));
    }
  }, []);
  // -----------------------

   // --- useEffect để xóa cờ isNew sau animation ---
   useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        conversation.forEach(block => {
            if (block.isNew) {
                const timer = setTimeout(() => {
                    setConversation(prev =>
                        prev.map(b => (b.id === block.id ? { ...b, isNew: false } : b))
                    );
                }, NEW_BLOCK_ANIMATION_DURATION + 100); // Thêm 100ms buffer
                timers.push(timer);
            }
        });
        return () => {
            timers.forEach(clearTimeout);
        };
    // Chỉ chạy lại khi danh sách ID của block mới thay đổi
   }, [conversation.filter(b => b.isNew).map(b => b.id).join(',')]);
  // -----------------------------------------------

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

  // --- Sidebar Toggle Handler ---
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  // ------------------------------

  // --- API Request Helper ---
  const sendApiRequest = useCallback(async (endpoint: string, body: object) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const response = await fetch(`http://localhost:5001/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, model_config: modelConfig }),
            signal: controller.signal
        });
        clearTimeout(timeoutId); // Hủy timeout nếu request thành công

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `API Error ${response.status} on /${endpoint}`);
        }
        return data;
    } catch (error: any) {
         clearTimeout(timeoutId);
         if (error.name === 'AbortError') {
             throw new Error(`Request to /${endpoint} timed out.`);
         }
         throw error; // Ném lại lỗi khác
    }
  }, [modelConfig]); // Phụ thuộc vào modelConfig
  // ------------------------

  // --- Collapse/Expand Handlers ---
  const toggleCollapse = useCallback((blockId: string) => {
    setCollapsedStates(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  const toggleOutputExpand = useCallback((blockId: string, type: 'stdout' | 'stderr') => {
    setExpandedOutputs(prev => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || { stdout: false, stderr: false }), // Đảm bảo object tồn tại
        [type]: !(prev[blockId]?.[type] ?? false) // Toggle giá trị hiện tại hoặc false nếu chưa có
      }
    }));
  }, []);
  // --------------------------------

  // --- Action Handlers ---
   const handleGenerate = useCallback(async (currentPrompt: string) => {
        if (!currentPrompt.trim()) { toast.warn('Vui lòng nhập yêu cầu.'); return; }
        setIsLoading(true);
        const now = new Date().toISOString();

        // Collapse các round trước đó
        const newCollapsedStates: Record<string, boolean> = {};
        conversation.filter(b => b.type === 'user').forEach(block => { newCollapsedStates[block.id] = true; });
        setCollapsedStates(prev => ({ ...prev, ...newCollapsedStates }));

        const newUserBlock: ConversationBlock = { type: 'user', data: currentPrompt, id: Date.now().toString() + '_u', timestamp: now, isNew: true };
        const loadingId = Date.now().toString() + '_gload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: 'Generating code...', id: loadingId, timestamp: now, isNew: true };

        // Thêm user và loading block, đảm bảo user block MỚI NHẤT không bị collapse ngay
        setConversation(prev => [...prev, newUserBlock, loadingBlock]);
        setCollapsedStates(prev => ({ ...prev, [newUserBlock.id]: false })); // Explicitly expand the new user block

        try {
          const data = await sendApiRequest('generate', { prompt: currentPrompt });
          const newAiBlockId = Date.now().toString() + '_a';
          setConversation(prev => [
              ...prev.filter(b => b.id !== loadingId), // Lọc bỏ loading block
              { type: 'ai-code', data: data.code, id: newAiBlockId, timestamp: new Date().toISOString(), isNew: true }
          ]);
          toast.success("Code generated!");
          setPrompt(''); // Xóa input sau khi gửi thành công
        } catch (err: any) {
          const newErrorBlockId = Date.now().toString() + '_err';
          toast.error(err.message || 'Error generating code.');
          setConversation(prev => [
              ...prev.filter(b => b.id !== loadingId), // Lọc bỏ loading block
              { type: 'error', data: err.message || 'Error generating code.', id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
          ]);
          console.error("Error generating code:", err);
        } finally { setIsLoading(false); }
    }, [sendApiRequest, conversation, setPrompt]); // Thêm setPrompt vào dependency

    const handleReviewCode = useCallback(async (codeToReview: string | null) => {
        if (!codeToReview) { toast.warn("No code to review."); return; }
        setIsReviewing(true);
        const now = new Date().toISOString();
        const loadingId = Date.now().toString() + '_rload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: 'Reviewing code...', id: loadingId, timestamp: now, isNew: true };
        setConversation(prev => [...prev, loadingBlock]);
        try {
            const data: ReviewResult = await sendApiRequest('review', { code: codeToReview });
            const newReviewBlockId = Date.now().toString() + '_r';
            setConversation(prev => [
                ...prev.filter(b => b.id !== loadingId),
                { type: 'review', data: data, id: newReviewBlockId, timestamp: new Date().toISOString(), isNew: true }
            ]);
            toast.success("Review complete!");
        } catch (err: any) {
            const errorData: ReviewResult = { error: err.message || 'Error during review.' };
            const newErrorBlockId = Date.now().toString() + '_rerr';
            setConversation(prev => [
                ...prev.filter(b => b.id !== loadingId),
                { type: 'review', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
            ]);
            toast.error(err.message || 'Error during review.');
        } finally { setIsReviewing(false); }
    }, [sendApiRequest]); // Bỏ conversation khỏi dependency vì chỉ thêm block mới

    const handleExecute = useCallback(async (codeToExecute: string | null) => {
        if (!codeToExecute) { toast.warn("No code to execute."); return; }
        const userConfirmation = window.confirm("⚠️ SECURITY WARNING! ⚠️\n\nExecuting AI-generated code can be dangerous and might harm your system or data.\n\nReview the code carefully before proceeding.\n\nContinue execution?");
        if (!userConfirmation) { toast.info("Execution cancelled."); return; }

        setIsExecuting(true);
        const toastId = toast.loading("Executing code...");
        const executionBlockId = Date.now().toString() + '_ex';
        const now = new Date().toISOString();
        const executionBlockBase: Partial<ConversationBlock> = { type: 'execution', id: executionBlockId, timestamp: now, isNew: true };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout cho execute

            const response = await fetch('http://localhost:5001/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToExecute }),
                signal: controller.signal
            });
             clearTimeout(timeoutId);

            const data: ExecutionResult = await response.json();
            // Luôn thêm code gốc vào data để dùng cho debug sau này
            const executionDataWithOrigin = { ...data, codeThatFailed: codeToExecute };
            setConversation(prev => [...prev, { ...executionBlockBase, data: executionDataWithOrigin } as ConversationBlock]);

            // Kiểm tra kết quả để cập nhật toast
            const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
            const stdoutLooksLikeError = data.output?.trim() && stdoutErrorKeywords.some(kw => data.output.toLowerCase().includes(kw));
            const hasError = data.return_code !== 0 || data.error?.trim();

            if (response.ok && !hasError && !stdoutLooksLikeError) {
                 toast.update(toastId, { render: "Execution successful!", type: "success", isLoading: false, autoClose: 3000 });
            } else if (response.ok && !hasError && stdoutLooksLikeError) {
                 toast.update(toastId, { render: "Executed, but output might indicate issues.", type: "warning", isLoading: false, autoClose: 5000 });
            } else { // response not ok hoặc có lỗi rõ ràng
                 toast.update(toastId, { render: data.error === 'Timeout' ? "Execution Timed Out." : "Execution failed or had errors.", type: "error", isLoading: false, autoClose: 5000 });
            }
        } catch (err: any) {
             const errorData: ExecutionResult = {
                 message: "Connection/Fetch error.",
                 output: "",
                 error: err.name === 'AbortError' ? 'Execution Timed Out (Client-side)' : err.message,
                 return_code: -200, // Mã lỗi tùy chỉnh cho lỗi fetch/timeout client
                 codeThatFailed: codeToExecute
             };
            setConversation(prev => [...prev, { ...executionBlockBase, data: errorData, id: executionBlockId + '_fetcherr' } as ConversationBlock]);
            toast.update(toastId, { render: `Execution Error: ${errorData.error}`, type: "error", isLoading: false, autoClose: 5000 });
        } finally { setIsExecuting(false); }
      }, []); // Không cần dependency

      const handleDebug = useCallback(async (codeToDebug: string | null, lastExecutionResult: ExecutionResult | null) => {
          // Helper để kiểm tra tín hiệu lỗi
          const hasErrorSignal = (execResult: ExecutionResult | null): boolean => {
              if (!execResult) return false;
              const hasStdErr = !!execResult.error?.trim();
              const nonZeroReturn = execResult.return_code !== 0;
              const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
              const stdoutLooksError = !!execResult.output?.trim() && stdoutErrorKeywords.some(kw => execResult.output!.toLowerCase().includes(kw));
              return hasStdErr || nonZeroReturn || stdoutLooksError;
          };

          if (!codeToDebug || !hasErrorSignal(lastExecutionResult)) {
              toast.warn("Code and an execution result with errors (stderr, non-zero code, or error keywords in stdout) are needed to debug.");
              return;
           }

          setIsDebugging(true);
          const now = new Date().toISOString();
          const loadingId = Date.now().toString() + '_dload';
          const loadingBlock: ConversationBlock = { type: 'loading', data: 'Debugging code...', id: loadingId, timestamp: now, isNew: true };
          setConversation(prev => [...prev, loadingBlock]);

          // Tìm prompt gốc gần nhất trước execution block này
          let userPromptForDebug = "Original prompt unknown";
          let foundExecution = false;
          const reversedConversation = [...conversation].reverse(); // Tạo bản sao đảo ngược để duyệt
          for (const block of reversedConversation) {
               // Tìm execution block tương ứng với code này
               if (!foundExecution && block.type === 'execution' && block.data?.codeThatFailed === codeToDebug) {
                   foundExecution = true;
               }
               // Sau khi tìm thấy execution, tìm user block trước nó
               if (foundExecution && block.type === 'user') {
                   userPromptForDebug = block.data;
                   break; // Đã tìm thấy prompt gốc, thoát vòng lặp
               }
          }

          try {
              const data: DebugResult = await sendApiRequest('debug', {
                  prompt: userPromptForDebug,
                  code: codeToDebug,
                  stdout: lastExecutionResult?.output ?? '',
                  stderr: lastExecutionResult?.error ?? '',
              });
              const newDebugBlockId = Date.now().toString() + '_dbg';
              setConversation(prev => [
                  ...prev.filter(b => b.id !== loadingId),
                  { type: 'debug', data: data, id: newDebugBlockId, timestamp: new Date().toISOString(), isNew: true }
              ]);
              toast.success("Debugging analysis complete!");
          } catch (err: any) {
              const errorData: DebugResult = { explanation: null, corrected_code: null, error: err.message };
              const newErrorBlockId = Date.now().toString() + '_dbgerr';
              setConversation(prev => [
                   ...prev.filter(b => b.id !== loadingId),
                   { type: 'debug', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
              ]);
              toast.error(`Debug failed: ${err.message}`);
          } finally { setIsDebugging(false); }
      }, [conversation, sendApiRequest]); // Phụ thuộc conversation để tìm prompt gốc

      const applyCorrectedCode = useCallback((correctedCode: string) => {
          const newBlockId = Date.now().toString() + '_ac';
          // Thêm block code mới vào cuối
          setConversation(prev => [...prev, { type: 'ai-code', data: correctedCode, id: newBlockId, timestamp: new Date().toISOString(), isNew: true }]);
          // Không cần collapse/expand ở đây nữa, scroll effect sẽ xử lý
          toast.success("Corrected code applied as a new block.");
      }, []); // Không cần dependency

    // --- Hàm Mới: Handle Install Package ---
    const handleInstallPackage = useCallback(async (packageName: string) => {
        if (!packageName) { toast.warn("No package name specified."); return; }
        setIsInstalling(true);
        const toastId = toast.loading(`Attempting to install ${packageName}...`);
        const installBlockId = Date.now().toString() + '_inst';
        const now = new Date().toISOString();
        const installBlockBase: Partial<ConversationBlock> = { type: 'installation', id: installBlockId, timestamp: now, isNew: true };

        try {
            const response = await fetch('http://localhost:5001/api/install_package', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_name: packageName }),
            });
            // Backend sẽ trả về JSON ngay cả khi cài đặt lỗi (với success: false)
            const data: InstallationResult = await response.json();
            const resultData = { ...data, package_name: packageName }; // Đảm bảo tên package có trong data

            setConversation(prev => [...prev, { ...installBlockBase, data: resultData } as ConversationBlock]);

            if (data.success) {
                toast.update(toastId, { render: `Successfully installed ${packageName}!`, type: "success", isLoading: false, autoClose: 4000 });
            } else {
                // Bao gồm output lỗi từ pip nếu có
                const errorMessage = data.error || data.output || "Installation failed. See details.";
                toast.update(toastId, { render: `Failed to install ${packageName}. ${errorMessage.split('\n')[0]}`, type: "error", isLoading: false, autoClose: 6000 });
            }
        } catch (err: any) {
            const errorData: InstallationResult = { success: false, message: `Connection error during installation.`, output: "", error: err.message, package_name: packageName };
            setConversation(prev => [...prev, { ...installBlockBase, data: errorData, id: installBlockId + '_fetcherr' } as ConversationBlock]);
            toast.update(toastId, { render: `Installation Error: ${err.message}`, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsInstalling(false);
        }
    }, []); // Không cần dependency
    // ----------------------------------------

  // Cập nhật isBusy
  const isBusy = isLoading || isExecuting || isReviewing || isDebugging || isInstalling;

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
        onInstallPackage={handleInstallPackage} // <-- TRUYỀN HÀM MỚI
        collapsedStates={collapsedStates}
        onToggleCollapse={toggleCollapse}
        expandedOutputs={expandedOutputs}
        onToggleOutputExpand={toggleOutputExpand}
        onToggleSidebar={handleToggleSidebar}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        modelConfig={modelConfig}
        onConfigChange={handleConfigChange}
        onSaveSettings={handleSaveSettings}
        isBusy={isBusy}
      />
    </div>
  );
}
export default App;