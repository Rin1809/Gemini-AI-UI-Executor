// frontend/src/App.tsx
import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import CenterArea from './components/CenterArea';
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
// Bỏ FiHelpCircle ở đây nếu đã import trong InteractionBlock
// import { FiHelpCircle } from 'react-icons/fi';

// --- Định nghĩa kiểu dữ liệu (Interfaces) ---
export interface ExecutionResult {
  message: string;
  output: string;
  error: string;
  return_code: number;
  codeThatFailed?: string;
  warning?: string;
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
    api_key?: string;
}

export interface DebugResult {
    explanation: string | null;
    corrected_code: string | null;
    suggested_package?: string;
    error?: string;
}

// Thêm interface cho kết quả Explain (MỚI)
export interface ExplainResult {
    explanation?: string; // Nội dung giải thích (Markdown)
    error?: string;       // Thông báo lỗi nếu có
}

export interface ConversationBlock {
    // Thêm 'explanation' vào type (MỚI)
    type: 'user' | 'ai-code' | 'review' | 'execution' | 'debug' | 'loading' | 'error' | 'installation' | 'explanation';
    data: any;
    id: string;
    timestamp: string;
    isNew?: boolean;
}

export interface InstallationResult {
    success: boolean;
    message: string;
    output: string;
    error: string;
    package_name: string;
}
// ---------------------------------------------

// --- Hằng số ---
const MODEL_NAME_STORAGE_KEY = 'geminiExecutorModelName';
const NEW_BLOCK_ANIMATION_DURATION = 500;
const MAX_DISPLAYED_BLOCKS = 20;
// ---------------

function App() {
  // --- Trạng thái (State) của ứng dụng ---
  const [prompt, setPrompt] = useState<string>('');
  const [conversation, setConversation] = useState<Array<ConversationBlock>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [isDebugging, setIsDebugging] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [isExplaining, setIsExplaining] = useState<boolean>(false); // State mới cho việc giải thích
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelName: 'gemini-1.5-flash',
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    safetySetting: 'BLOCK_MEDIUM_AND_ABOVE',
  });
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, { stdout: boolean; stderr: boolean }>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [runAsAdmin, setRunAsAdmin] = useState<boolean>(false);
  const [uiApiKey, setUiApiKey] = useState<string>('');
  const [useUiApiKey, setUseUiApiKey] = useState<boolean>(false);
  // ------------------------------------

  // --- Tải tên model đã lưu ---
  useEffect(() => {
    const savedModelName = localStorage.getItem(MODEL_NAME_STORAGE_KEY);
    if (savedModelName) {
      setModelConfig(prev => ({ ...prev, modelName: savedModelName }));
    }
  }, []);
  // ------------------------------------------

   // --- Xóa cờ isNew sau animation ---
   useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        conversation.filter(b => b.isNew).forEach(block => {
            const timer = setTimeout(() => {
                setConversation(prev =>
                    prev.map(b => (b.id === block.id ? { ...b, isNew: false } : b))
                );
            }, NEW_BLOCK_ANIMATION_DURATION + 100);
            timers.push(timer);
        });
        return () => {
            timers.forEach(clearTimeout);
        };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [conversation.filter(b => b.isNew).map(b => b.id).join(',')]);
  // ------------------------------------------------

  // --- Các hàm xử lý thay đổi cấu hình, lưu cài đặt, API key, admin ---
  const handleConfigChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'runAsAdmin' && type === 'checkbox') {
        setRunAsAdmin((e.target as HTMLInputElement).checked);
    } else if (name === 'uiApiKey' && (type === 'password' || type === 'text')) {
        setUiApiKey(value);
    } else {
        setModelConfig(prev => ({
            ...prev,
            [name]: (name === 'temperature' || name === 'topP' || name === 'topK') ? parseFloat(value) : value
        }));
    }
  }, []);

  const handleSaveSettings = useCallback(() => {
    try {
      localStorage.setItem(MODEL_NAME_STORAGE_KEY, modelConfig.modelName);
      toast.success(`Đã lưu lựa chọn model: ${modelConfig.modelName}`);
    } catch (e) {
      toast.error("Không thể lưu cài đặt tên model.");
      console.error("Lỗi lưu tên model:", e);
    }
  }, [modelConfig.modelName]);

  const handleApplyUiApiKey = useCallback(() => {
      if (uiApiKey.trim()) {
          setUseUiApiKey(true);
          toast.info("Các yêu cầu API giờ sẽ dùng key từ Cài đặt.");
      } else {
          toast.warn("Vui lòng nhập API Key trước.");
      }
  }, [uiApiKey]);

  const handleUseEnvKey = useCallback(() => {
      setUseUiApiKey(false);
      setUiApiKey('');
      toast.info("Các yêu cầu API giờ sẽ dùng key từ file .env (nếu có ở backend).");
  }, []);
  // -----------------------------------------------------------------------

  // --- Hàm đóng/mở Sidebar ---
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  // --------------------------

  // --- Hàm trợ giúp gửi yêu cầu API lên backend ---
  const sendApiRequest = useCallback(async (endpoint: string, body: object) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Timeout 60s

    let effectiveModelConfig = { ...modelConfig };

    // Thêm API key vào config cho các endpoint cần thiết nếu dùng key UI
    const needsApiKey = ['generate', 'review', 'debug', 'explain'].includes(endpoint); // Thêm 'explain'
    if (useUiApiKey && uiApiKey && needsApiKey) {
        effectiveModelConfig = { ...effectiveModelConfig, api_key: uiApiKey };
    } else {
        delete effectiveModelConfig.api_key;
    }

    try {
        const response = await fetch(`http://localhost:5001/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Gửi kèm model_config (có thể có hoặc không có api_key)
            body: JSON.stringify({ ...body, model_config: effectiveModelConfig }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Lỗi API ${response.status} tại /${endpoint}`);
        }
        return data;
    } catch (error: any) {
         clearTimeout(timeoutId);
         if (error.name === 'AbortError') {
             throw new Error(`Yêu cầu tới /${endpoint} bị quá thời gian.`);
         }
         throw error;
    }
  }, [modelConfig, useUiApiKey, uiApiKey]);
  // ----------------------------------------------

  // --- Hàm đóng/mở khối user và output ---
  const toggleCollapse = useCallback((blockId: string) => {
    setCollapsedStates(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  const onToggleOutputExpand = useCallback((blockId: string, type: 'stdout' | 'stderr') => {
    setExpandedOutputs(prev => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || { stdout: false, stderr: false }),
        [type]: !(prev[blockId]?.[type] ?? false)
      }
    }));
  }, []);
  // -------------------------------------

  // --- Các hàm xử lý hành động chính (Generate, Review, Execute, Debug, Install) ---
   const handleGenerate = useCallback(async (currentPrompt: string) => {
        if (!currentPrompt.trim()) { toast.warn('Vui lòng nhập yêu cầu.'); return; }
        setIsLoading(true);
        const now = new Date().toISOString();
        const newCollapsedStates: Record<string, boolean> = {};
        conversation.filter(b => b.type === 'user').forEach(block => { newCollapsedStates[block.id] = true; });
        setCollapsedStates(prev => ({ ...prev, ...newCollapsedStates }));
        const newUserBlock: ConversationBlock = { type: 'user', data: currentPrompt, id: Date.now().toString() + '_u', timestamp: now, isNew: true };
        const loadingId = Date.now().toString() + '_gload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: 'Đang tạo mã...', id: loadingId, timestamp: now, isNew: true };
        setConversation(prev => [...prev, newUserBlock, loadingBlock]);
        setCollapsedStates(prev => ({ ...prev, [newUserBlock.id]: false }));
        try {
          const data = await sendApiRequest('generate', { prompt: currentPrompt });
          const newAiBlockId = Date.now().toString() + '_a';
          setConversation(prev => [
              ...prev.filter(b => b.id !== loadingId),
              { type: 'ai-code', data: data.code, id: newAiBlockId, timestamp: new Date().toISOString(), isNew: true }
          ]);
          toast.success("Đã tạo mã thành công!");
          setPrompt('');
        } catch (err: any) {
          const newErrorBlockId = Date.now().toString() + '_err';
          toast.error(err.message || 'Lỗi khi tạo mã.');
          setConversation(prev => [
              ...prev.filter(b => b.id !== loadingId),
              { type: 'error', data: err.message || 'Lỗi khi tạo mã.', id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
          ]);
          console.error("Lỗi tạo mã:", err);
        } finally { setIsLoading(false); }
    }, [sendApiRequest, conversation, setPrompt]);

    const handleReviewCode = useCallback(async (codeToReview: string | null, blockId: string) => { // Thêm blockId
        if (!codeToReview) { toast.warn("Không có mã để đánh giá."); return; }
        setIsReviewing(true);
        const now = new Date().toISOString();
        const loadingId = Date.now().toString() + '_rload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: 'Đang đánh giá mã...', id: loadingId, timestamp: now, isNew: true };
        // Tìm vị trí của block code gốc
        const originalBlockIndex = conversation.findIndex(b => b.id === blockId); // Sử dụng blockId
        const newConversation = [...conversation];
        if (originalBlockIndex !== -1) {
            newConversation.splice(originalBlockIndex + 1, 0, loadingBlock);
        } else {
            newConversation.push(loadingBlock);
        }
        setConversation(newConversation);

        try {
            const data: ReviewResult = await sendApiRequest('review', { code: codeToReview });
            const newReviewBlockId = Date.now().toString() + '_r';
            setConversation(prev => prev.map(b =>
                 b.id === loadingId
                 ? { type: 'review', data: data, id: newReviewBlockId, timestamp: new Date().toISOString(), isNew: true }
                 : b
            ));
            toast.success("Đã đánh giá xong!");
        } catch (err: any) {
            const errorData: ReviewResult = { error: err.message || 'Lỗi trong quá trình đánh giá.' };
            const newErrorBlockId = Date.now().toString() + '_rerr';
            setConversation(prev => prev.map(b =>
                 b.id === loadingId
                 ? { type: 'review', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
                 : b
            ));
            toast.error(err.message || 'Lỗi trong quá trình đánh giá.');
        } finally { setIsReviewing(false); }
    }, [sendApiRequest, conversation]); // Loại bỏ phụ thuộc codeToReview nếu chỉ cần blockId

    const handleExecute = useCallback(async (codeToExecute: string | null, blockId: string) => { // Nhận thêm blockId
        if (!codeToExecute) { toast.warn("Không có mã để thực thi."); return; }
        setIsExecuting(true);
        const toastId = toast.loading(`Đang thực thi mã${runAsAdmin ? ' với quyền Admin/Root' : ''}...`);
        const executionBlockId = Date.now().toString() + '_ex';
        const now = new Date().toISOString();
        const executionBlockBase: Partial<ConversationBlock> = { type: 'execution', id: executionBlockId, timestamp: now, isNew: true };

        // Tìm vị trí của block code gốc để chèn kết quả ngay sau nó
        const originalBlockIndex = conversation.findIndex(b => b.id === blockId);
        const newConversation = [...conversation];
        let resultData: ExecutionResult | null = null; // Để lưu kết quả hoặc lỗi

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            const response = await fetch('http://localhost:5001/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: codeToExecute, run_as_admin: runAsAdmin }),
                signal: controller.signal
            });
             clearTimeout(timeoutId);

            const data: ExecutionResult = await response.json();
            resultData = { ...data, codeThatFailed: codeToExecute }; // Gắn code gốc

            if (data.warning) {
                toast.warning(data.warning, { autoClose: 7000, toastId: `warning-${executionBlockId}` });
            }

            const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
            const stdoutLooksLikeError = data.output?.trim() && stdoutErrorKeywords.some(kw => data.output.toLowerCase().includes(kw));
            const hasError = data.return_code !== 0 || data.error?.trim() || data.return_code === -200; // Bao gồm cả lỗi fetch

            if (response.ok && !hasError && !stdoutLooksLikeError) {
                 toast.update(toastId, { render: "Thực thi thành công!", type: "success", isLoading: false, autoClose: 3000 });
            } else if (response.ok && !hasError && stdoutLooksLikeError) {
                 toast.update(toastId, { render: "Đã thực thi, nhưng output có thể chứa vấn đề.", type: "warning", isLoading: false, autoClose: 5000 });
            } else {
                 toast.update(toastId, { render: data.error === 'Timeout' ? "Thực thi quá thời gian." : "Thực thi thất bại hoặc có lỗi.", type: "error", isLoading: false, autoClose: 5000 });
            }
        } catch (err: any) {
             resultData = {
                 message: "Lỗi kết nối/fetch.", output: "",
                 error: err.name === 'AbortError' ? 'Thực thi quá thời gian (Client)' : err.message,
                 return_code: -200, // Mã lỗi tùy chỉnh cho lỗi fetch/timeout
                 codeThatFailed: codeToExecute
             };
            toast.update(toastId, { render: `Lỗi thực thi: ${resultData.error}`, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsExecuting(false);
            // Chèn kết quả (thành công hoặc lỗi) vào conversation
            if (resultData) {
                 const blockToAdd = { ...executionBlockBase, data: resultData } as ConversationBlock;
                 if (originalBlockIndex !== -1) {
                     newConversation.splice(originalBlockIndex + 1, 0, blockToAdd);
                     setConversation(newConversation);
                 } else {
                     setConversation(prev => [...prev, blockToAdd]); // Thêm vào cuối nếu không tìm thấy
                 }
            }
        }
      }, [runAsAdmin, conversation]); // Phụ thuộc runAsAdmin và conversation

      const handleDebug = useCallback(async (codeToDebug: string | null, lastExecutionResult: ExecutionResult | null, blockId: string) => { // Nhận thêm blockId
          const hasErrorSignal = (execResult: ExecutionResult | null): boolean => {
              if (!execResult) return false;
              const hasStdErr = !!execResult.error?.trim();
              const nonZeroReturn = execResult.return_code !== 0;
              const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
              const stdoutLooksError = !!execResult.output?.trim() && stdoutErrorKeywords.some(kw => execResult.output!.toLowerCase().includes(kw));
              // Coi lỗi API (-200) cũng là tín hiệu lỗi
              return hasStdErr || nonZeroReturn || stdoutLooksError || execResult.return_code === -200;
          };

          if (!codeToDebug || !hasErrorSignal(lastExecutionResult)) {
              toast.warn("Cần có mã và kết quả thực thi có lỗi để gỡ rối.");
              return;
           }

          setIsDebugging(true);
          const now = new Date().toISOString();
          const loadingId = Date.now().toString() + '_dload';
          const loadingBlock: ConversationBlock = { type: 'loading', data: 'Đang gỡ rối mã...', id: loadingId, timestamp: now, isNew: true };

          // Tìm vị trí của block execution gốc để chèn kết quả debug sau nó
          const originalBlockIndex = conversation.findIndex(b => b.id === blockId);
          const newConversation = [...conversation];
          if (originalBlockIndex !== -1) {
             newConversation.splice(originalBlockIndex + 1, 0, loadingBlock);
          } else {
             newConversation.push(loadingBlock);
          }
          setConversation(newConversation);


          let userPromptForDebug = "(Không tìm thấy prompt gốc)";
          let foundExecution = false;
          const reversedFullConversation = [...conversation].reverse();
          for (const block of reversedFullConversation) {
               if (!foundExecution && block.id === blockId && block.type === 'execution') { // Tìm đúng block execution
                   foundExecution = true;
               }
               // Tìm khối user ngay TRƯỚC khối execution đó
               if (foundExecution && block.type === 'user') {
                   userPromptForDebug = block.data;
                   break;
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
              setConversation(prev => prev.map(b =>
                 b.id === loadingId
                 ? { type: 'debug', data: data, id: newDebugBlockId, timestamp: new Date().toISOString(), isNew: true }
                 : b
              ));
              toast.success("Đã phân tích gỡ rối xong!");
          } catch (err: any) {
              const errorData: DebugResult = { explanation: null, corrected_code: null, error: err.message };
              const newErrorBlockId = Date.now().toString() + '_dbgerr';
              setConversation(prev => prev.map(b =>
                 b.id === loadingId
                 ? { type: 'debug', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
                 : b
              ));
              toast.error(`Gỡ rối thất bại: ${err.message}`);
          } finally { setIsDebugging(false); }
      }, [conversation, sendApiRequest]);

      // Hàm áp dụng code đã sửa từ khối debug
      const applyCorrectedCode = useCallback((correctedCode: string, originalDebugBlockId: string) => { // Nhận thêm ID block debug gốc
          const newBlockId = Date.now().toString() + '_ac';
          const newBlock: ConversationBlock = { type: 'ai-code', data: correctedCode, id: newBlockId, timestamp: new Date().toISOString(), isNew: true };

          // Tìm vị trí của block debug gốc để chèn khối code mới sau nó
           const originalBlockIndex = conversation.findIndex(b => b.id === originalDebugBlockId);
           const newConversation = [...conversation];
           if (originalBlockIndex !== -1) {
               newConversation.splice(originalBlockIndex + 1, 0, newBlock);
               setConversation(newConversation);
           } else {
               setConversation(prev => [...prev, newBlock]); // Thêm vào cuối nếu không tìm thấy
           }

          toast.success("Đã áp dụng code sửa lỗi vào khối mới.");
      }, [conversation]); // Thêm conversation làm dependency

    // Hàm cài đặt package Python
    const handleInstallPackage = useCallback(async (packageName: string, originalDebugBlockId: string) => { // Nhận thêm ID block debug gốc
        if (!packageName) { toast.warn("Không có tên package được chỉ định."); return; }
        setIsInstalling(true);
        const toastId = toast.loading(`Đang thử cài đặt ${packageName}...`);
        const installBlockId = Date.now().toString() + '_inst';
        const now = new Date().toISOString();
        const installBlockBase: Partial<ConversationBlock> = { type: 'installation', id: installBlockId, timestamp: now, isNew: true };

         // Tìm vị trí của block debug gốc để chèn kết quả cài đặt sau nó
         const originalBlockIndex = conversation.findIndex(b => b.id === originalDebugBlockId);
         const newConversation = [...conversation];
         let resultData : InstallationResult | null = null;

        try {
            const response = await fetch('http://localhost:5001/api/install_package', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_name: packageName }),
            });
            const data: InstallationResult = await response.json();
            resultData = { ...data, package_name: packageName };

            if (data.success) {
                toast.update(toastId, { render: `Đã cài đặt ${packageName} thành công!`, type: "success", isLoading: false, autoClose: 4000 });
            } else {
                const errorMessage = data.error || data.output || "Cài đặt thất bại. Xem chi tiết.";
                toast.update(toastId, { render: `Cài đặt ${packageName} thất bại. ${errorMessage.split('\n')[0]}`, type: "error", isLoading: false, autoClose: 6000 });
            }
        } catch (err: any) {
            resultData = { success: false, message: `Lỗi kết nối khi cài đặt.`, output: "", error: err.message, package_name: packageName };
            toast.update(toastId, { render: `Lỗi cài đặt: ${err.message}`, type: "error", isLoading: false, autoClose: 5000 });
        } finally {
            setIsInstalling(false);
             // Chèn kết quả cài đặt (thành công hoặc lỗi) vào conversation
             if (resultData) {
                 const blockToAdd = { ...installBlockBase, data: resultData } as ConversationBlock;
                 if (originalBlockIndex !== -1) {
                     newConversation.splice(originalBlockIndex + 1, 0, blockToAdd);
                     setConversation(newConversation);
                 } else {
                     setConversation(prev => [...prev, blockToAdd]); // Thêm vào cuối nếu không tìm thấy
                 }
             }
        }
    }, [conversation]); // Thêm conversation làm dependency

    // --- Hàm xử lý yêu cầu giải thích (MỚI) ---
    const handleExplain = useCallback(async (blockId: string, contentToExplain: any, context: string) => {
        setIsExplaining(true);
        const now = new Date().toISOString();
        const loadingId = Date.now().toString() + '_explload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: `Đang giải thích (${context})...`, id: loadingId, timestamp: now, isNew: true };

        // Tìm vị trí của block gốc để chèn loading và kết quả ngay sau nó
        const originalBlockIndex = conversation.findIndex(b => b.id === blockId);
        const newConversation = [...conversation];
        if (originalBlockIndex !== -1) {
            newConversation.splice(originalBlockIndex + 1, 0, loadingBlock);
        } else {
            newConversation.push(loadingBlock); // Nếu không tìm thấy, thêm vào cuối
        }
        setConversation(newConversation);

        // Chuẩn bị content: Chuyển object thành JSON string nếu cần, loại bỏ code gốc khỏi execution/debug
        let processedContent = contentToExplain;
        if (typeof contentToExplain === 'object' && contentToExplain !== null) {
            try {
                let contentToSend = { ...contentToExplain }; // Tạo bản sao
                // Loại bỏ code gốc khỏi execution/debug result trước khi gửi đi giải thích
                if ((context === 'execution_result' || context === 'debug_result') && 'codeThatFailed' in contentToSend) {
                    delete contentToSend.codeThatFailed;
                }
                processedContent = JSON.stringify(contentToSend, null, 2); // Chuyển thành JSON string
            } catch (e) {
                 console.error("Lỗi khi stringify content:", e);
                 processedContent = String(contentToExplain); // Fallback về string
            }
        } else {
             processedContent = String(contentToExplain); // Đảm bảo là string
        }

        try {
            const data: ExplainResult = await sendApiRequest('explain', {
                content: processedContent,
                context: context,
            });
            const newExplainBlockId = Date.now().toString() + '_exp';
            // Thay loading bằng kết quả explanation
            setConversation(prev => prev.map(b =>
                 b.id === loadingId
                 ? { type: 'explanation', data: data, id: newExplainBlockId, timestamp: new Date().toISOString(), isNew: true }
                 : b
            ));
            toast.success("Đã tạo giải thích!");
        } catch (err: any) {
            const errorData: ExplainResult = { error: err.message || 'Lỗi khi tạo giải thích.' };
            const newErrorBlockId = Date.now().toString() + '_experr';
            // Thay loading bằng khối explanation chứa lỗi
            setConversation(prev => prev.map(b =>
                b.id === loadingId
                ? { type: 'explanation', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
                : b
            ));
            toast.error(err.message || 'Lỗi khi tạo giải thích.');
        } finally {
            setIsExplaining(false);
        }
      }, [sendApiRequest, conversation]); // Thêm conversation
      // ------------------------------------

  // Cập nhật isBusy để bao gồm isExplaining (MỚI)
  const isBusy = isLoading || isExecuting || isReviewing || isDebugging || isInstalling || isExplaining;

  const displayedConversation = conversation.slice(-MAX_DISPLAYED_BLOCKS);

  return (
    <div className="main-container">
      <ToastContainer theme="dark" position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

      <CenterArea
        conversation={displayedConversation}
        isLoading={isLoading} // Vẫn truyền isLoading riêng cho UserInput
        isBusy={isBusy}     // Truyền isBusy chung cho các nút trong InteractionBlock
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        onReview={handleReviewCode}
        onExecute={handleExecute}
        onDebug={handleDebug}
        onApplyCorrectedCode={applyCorrectedCode}
        onInstallPackage={handleInstallPackage}
        onExplain={handleExplain} // Truyền hàm explain (MỚI)
        collapsedStates={collapsedStates}
        onToggleCollapse={toggleCollapse}
        expandedOutputs={expandedOutputs}
        onToggleOutputExpand={onToggleOutputExpand}
        onToggleSidebar={handleToggleSidebar}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        modelConfig={modelConfig}
        onConfigChange={handleConfigChange}
        onSaveSettings={handleSaveSettings}
        isBusy={isBusy} // Dùng isBusy chung
        runAsAdmin={runAsAdmin}
        uiApiKey={uiApiKey}
        useUiApiKey={useUiApiKey}
        onApplyUiApiKey={handleApplyUiApiKey}
        onUseEnvKey={handleUseEnvKey}
      />
    </div>
  );
}
export default App;