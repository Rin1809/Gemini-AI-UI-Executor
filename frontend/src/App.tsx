// frontend/src/App.tsx
import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import CenterArea from './components/CenterArea';
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// --- Định nghĩa kiểu dữ liệu (Interfaces) ---
export interface ExecutionResult {
  message: string;         // Thông báo từ backend (VD: "Thực thi thành công.")
  output: string;          // Output chuẩn (stdout) của code
  error: string;           // Output lỗi (stderr) của code
  return_code: number;     // Mã trả về của tiến trình
  codeThatFailed?: string; // Lưu lại đoạn code đã chạy gây lỗi (dùng cho debug)
  warning?: string;        // Cảnh báo tùy chọn từ backend (VD: về quyền admin)
}

export interface ReviewResult {
    review?: string;         // Nội dung đánh giá code (Markdown)
    error?: string;          // Thông báo lỗi nếu có
}

export interface ModelConfig {
    modelName: string;       // Tên model Gemini (VD: "gemini-1.5-flash")
    temperature: number;     // Tham số temperature
    topP: number;            // Tham số topP
    topK: number;            // Tham số topK
    safetySetting: string;   // Cài đặt an toàn (VD: "BLOCK_MEDIUM_AND_ABOVE")
    api_key?: string;        // API Key ghi đè (tùy chọn)
}

export interface DebugResult {
    explanation: string | null; // Giải thích lỗi (Markdown)
    corrected_code: string | null; // Code đã được sửa lỗi
    suggested_package?: string;  // Tên package được đề xuất cài đặt
    error?: string;            // Thông báo lỗi nếu có
}

export interface ConversationBlock {
    type: 'user' | 'ai-code' | 'review' | 'execution' | 'debug' | 'loading' | 'error' | 'installation'; // Loại khối hội thoại
    data: any;                 // Dữ liệu tương ứng (string, ExecutionResult, etc.)
    id: string;                // ID duy nhất cho khối
    timestamp: string;         // Thời gian tạo (ISO string)
    isNew?: boolean;           // Cờ đánh dấu khối mới để chạy animation
}

export interface InstallationResult {
    success: boolean;        // Cài đặt thành công hay không
    message: string;         // Thông báo từ backend
    output: string;          // Output từ pip
    error: string;           // Lỗi từ pip (stderr)
    package_name: string;    // Tên package đã cố gắng cài
}
// ---------------------------------------------

// --- Hằng số ---
const MODEL_NAME_STORAGE_KEY = 'geminiExecutorModelName'; // Key lưu tên model trong localStorage
const NEW_BLOCK_ANIMATION_DURATION = 500; // Thời gian animation (ms)
const MAX_DISPLAYED_BLOCKS = 20; // Giới hạn số khối hiển thị trong CenterArea (tăng lên để xem nhiều hơn)
// ---------------

function App() {
  // --- Trạng thái (State) của ứng dụng ---
  const [prompt, setPrompt] = useState<string>(''); // Nội dung người dùng nhập
  const [conversation, setConversation] = useState<Array<ConversationBlock>>([]); // Lịch sử hội thoại đầy đủ
  const [isLoading, setIsLoading] = useState<boolean>(false);     // Trạng thái đang chờ Gemini sinh code
  const [isExecuting, setIsExecuting] = useState<boolean>(false); // Trạng thái đang thực thi code
  const [isReviewing, setIsReviewing] = useState<boolean>(false); // Trạng thái đang đánh giá code
  const [isDebugging, setIsDebugging] = useState<boolean>(false); // Trạng thái đang gỡ lỗi code
  const [isInstalling, setIsInstalling] = useState<boolean>(false); // Trạng thái đang cài đặt package
  const [modelConfig, setModelConfig] = useState<ModelConfig>({ // Cấu hình cho Gemini
    modelName: 'gemini-1.5-flash',
    temperature: 0.7,
    topP: 0.95, // Mặc định là 0.95 thường tốt hơn 1.0
    topK: 40,
    safetySetting: 'BLOCK_MEDIUM_AND_ABOVE',
    // api_key không lưu vào state, lấy từ uiApiKey khi cần
  });
  const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({}); // Trạng thái đóng/mở của các khối user
  const [expandedOutputs, setExpandedOutputs] = useState<Record<string, { stdout: boolean; stderr: boolean }>>({}); // Trạng thái mở rộng của output/error
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // Trạng thái mở/đóng sidebar cài đặt
  const [runAsAdmin, setRunAsAdmin] = useState<boolean>(false); // Cờ yêu cầu chạy code với quyền admin
  const [uiApiKey, setUiApiKey] = useState<string>(''); // API Key người dùng nhập trong UI
  const [useUiApiKey, setUseUiApiKey] = useState<boolean>(false); // Cờ cho biết có sử dụng key từ UI hay không
  // ------------------------------------

  // --- Tải tên model đã lưu khi khởi động ---
  useEffect(() => {
    const savedModelName = localStorage.getItem(MODEL_NAME_STORAGE_KEY);
    if (savedModelName) {
      setModelConfig(prev => ({ ...prev, modelName: savedModelName }));
    }
  }, []);
  // ------------------------------------------

   // --- Xóa cờ isNew sau khi animation hoàn tất ---
   useEffect(() => {
        const timers: NodeJS.Timeout[] = [];
        // Chỉ xử lý các block đang có cờ isNew
        conversation.filter(b => b.isNew).forEach(block => {
            const timer = setTimeout(() => {
                // Cập nhật state để bỏ cờ isNew khỏi block tương ứng
                setConversation(prev =>
                    prev.map(b => (b.id === block.id ? { ...b, isNew: false } : b))
                );
            }, NEW_BLOCK_ANIMATION_DURATION + 100); // Chờ animation xong + buffer nhỏ
            timers.push(timer);
        });
        // Cleanup: Hủy các timer nếu component unmount hoặc conversation thay đổi
        return () => {
            timers.forEach(clearTimeout);
        };
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [conversation.filter(b => b.isNew).map(b => b.id).join(',')]); // Chỉ chạy khi ID của các block mới thay đổi
  // ------------------------------------------------

  // --- Các hàm xử lý sự kiện thay đổi cấu hình, lưu cài đặt, API key, admin ---
  const handleConfigChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Xử lý riêng cho các checkbox hoặc input đặc biệt
    if (name === 'runAsAdmin' && type === 'checkbox') {
        setRunAsAdmin((e.target as HTMLInputElement).checked);
    } else if (name === 'uiApiKey' && (type === 'password' || type === 'text')) {
        setUiApiKey(value);
    } else { // Xử lý các input/select còn lại của model config
        setModelConfig(prev => ({
            ...prev,
            // Chuyển đổi sang số nếu là temperature, topP, topK
            [name]: (name === 'temperature' || name === 'topP' || name === 'topK') ? parseFloat(value) : value
        }));
    }
  }, []); // Không có dependency ngoài

  const handleSaveSettings = useCallback(() => {
    try {
      // Chỉ lưu tên model vào localStorage
      localStorage.setItem(MODEL_NAME_STORAGE_KEY, modelConfig.modelName);
      toast.success(`Đã lưu lựa chọn model: ${modelConfig.modelName}`);
    } catch (e) {
      toast.error("Không thể lưu cài đặt tên model.");
      console.error("Lỗi lưu tên model:", e);
    }
  }, [modelConfig.modelName]);

  const handleApplyUiApiKey = useCallback(() => {
      if (uiApiKey.trim()) {
          setUseUiApiKey(true); // Bật cờ sử dụng key từ UI
          toast.info("Các yêu cầu API giờ sẽ dùng key từ Cài đặt.");
      } else {
          toast.warn("Vui lòng nhập API Key trước.");
      }
  }, [uiApiKey]);

  const handleUseEnvKey = useCallback(() => {
      setUseUiApiKey(false); // Tắt cờ sử dụng key từ UI
      setUiApiKey(''); // Xóa nội dung ô nhập key
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
    const controller = new AbortController(); // Để xử lý timeout
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Timeout 60 giây

    // Tạo bản sao cấu hình model để không thay đổi state gốc
    let effectiveModelConfig = { ...modelConfig };

    // Nếu đang dùng key từ UI và endpoint là generate/review/debug, thêm key vào config
    if (useUiApiKey && uiApiKey && ['generate', 'review', 'debug'].includes(endpoint)) {
        effectiveModelConfig = { ...effectiveModelConfig, api_key: uiApiKey };
    } else {
        // Đảm bảo không gửi api_key rỗng hoặc undefined nếu không dùng key UI
        delete effectiveModelConfig.api_key;
    }


    try {
        const response = await fetch(`http://localhost:5001/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Gửi kèm model_config (có thể chứa api_key hoặc không)
            body: JSON.stringify({ ...body, model_config: effectiveModelConfig }),
            signal: controller.signal // Gắn tín hiệu abort
        });
        clearTimeout(timeoutId); // Hủy timeout nếu request thành công

        const data = await response.json();
        if (!response.ok) {
            // Ném lỗi với thông báo từ backend nếu có
            throw new Error(data.error || `Lỗi API ${response.status} tại /${endpoint}`);
        }
        return data; // Trả về dữ liệu thành công
    } catch (error: any) {
         clearTimeout(timeoutId); // Hủy timeout nếu có lỗi
         if (error.name === 'AbortError') { // Bắt lỗi timeout
             throw new Error(`Yêu cầu tới /${endpoint} bị quá thời gian.`);
         }
         throw error; // Ném lại các lỗi khác
    }
  }, [modelConfig, useUiApiKey, uiApiKey]); // Phụ thuộc vào các state này
  // ----------------------------------------------

  // --- Hàm đóng/mở khối user và output ---
  const toggleCollapse = useCallback((blockId: string) => {
    setCollapsedStates(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  }, []);

  const onToggleOutputExpand = useCallback((blockId: string, type: 'stdout' | 'stderr') => {
    setExpandedOutputs(prev => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || { stdout: false, stderr: false }), // Giữ trạng thái của loại output kia
        [type]: !(prev[blockId]?.[type] ?? false) // Đảo trạng thái của loại output được click
      }
    }));
  }, []);
  // -------------------------------------

  // --- Các hàm xử lý hành động chính (Generate, Review, Execute, Debug, Install) ---
   const handleGenerate = useCallback(async (currentPrompt: string) => {
        if (!currentPrompt.trim()) { toast.warn('Vui lòng nhập yêu cầu.'); return; }
        setIsLoading(true); // Bắt đầu loading
        const now = new Date().toISOString();

        // Tự động thu gọn các khối user cũ hơn khi generate mới
        const newCollapsedStates: Record<string, boolean> = {};
        conversation.filter(b => b.type === 'user').forEach(block => { newCollapsedStates[block.id] = true; });
        setCollapsedStates(prev => ({ ...prev, ...newCollapsedStates }));

        // Tạo khối user mới và khối loading
        const newUserBlock: ConversationBlock = { type: 'user', data: currentPrompt, id: Date.now().toString() + '_u', timestamp: now, isNew: true };
        const loadingId = Date.now().toString() + '_gload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: 'Đang tạo mã...', id: loadingId, timestamp: now, isNew: true };

        // Thêm vào conversation và mở khối user mới nhất
        setConversation(prev => [...prev, newUserBlock, loadingBlock]);
        setCollapsedStates(prev => ({ ...prev, [newUserBlock.id]: false })); // Đảm bảo khối mới nhất mở

        try {
          // Gửi yêu cầu generate
          const data = await sendApiRequest('generate', { prompt: currentPrompt });
          // Tạo ID mới cho khối AI code
          const newAiBlockId = Date.now().toString() + '_a';
          // Thay thế khối loading bằng khối AI code mới
          setConversation(prev => [
              ...prev.filter(b => b.id !== loadingId), // Xóa loading
              { type: 'ai-code', data: data.code, id: newAiBlockId, timestamp: new Date().toISOString(), isNew: true } // Thêm AI code
          ]);
          toast.success("Đã tạo mã thành công!");
          setPrompt(''); // Xóa nội dung input sau khi gửi thành công
        } catch (err: any) {
          const newErrorBlockId = Date.now().toString() + '_err';
          toast.error(err.message || 'Lỗi khi tạo mã.');
          // Thay thế khối loading bằng khối lỗi
          setConversation(prev => [
              ...prev.filter(b => b.id !== loadingId),
              { type: 'error', data: err.message || 'Lỗi khi tạo mã.', id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true }
          ]);
          console.error("Lỗi tạo mã:", err);
        } finally { setIsLoading(false); } // Kết thúc loading
    }, [sendApiRequest, conversation, setPrompt]); // Thêm conversation làm dependency

    const handleReviewCode = useCallback(async (codeToReview: string | null) => {
        if (!codeToReview) { toast.warn("Không có mã để đánh giá."); return; }
        setIsReviewing(true); // Bắt đầu reviewing
        const now = new Date().toISOString();
        const loadingId = Date.now().toString() + '_rload';
        const loadingBlock: ConversationBlock = { type: 'loading', data: 'Đang đánh giá mã...', id: loadingId, timestamp: now, isNew: true };
        setConversation(prev => [...prev, loadingBlock]); // Thêm loading
        try {
            // Gửi yêu cầu review
            const data: ReviewResult = await sendApiRequest('review', { code: codeToReview });
            const newReviewBlockId = Date.now().toString() + '_r';
            // Thay loading bằng kết quả review
            setConversation(prev => [
                ...prev.filter(b => b.id !== loadingId),
                { type: 'review', data: data, id: newReviewBlockId, timestamp: new Date().toISOString(), isNew: true }
            ]);
            toast.success("Đã đánh giá xong!");
        } catch (err: any) {
            // Xử lý lỗi review
            const errorData: ReviewResult = { error: err.message || 'Lỗi trong quá trình đánh giá.' };
            const newErrorBlockId = Date.now().toString() + '_rerr';
            setConversation(prev => [
                ...prev.filter(b => b.id !== loadingId),
                { type: 'review', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true } // Vẫn dùng type 'review' để hiển thị lỗi
            ]);
            toast.error(err.message || 'Lỗi trong quá trình đánh giá.');
        } finally { setIsReviewing(false); } // Kết thúc reviewing
    }, [sendApiRequest]);

    const handleExecute = useCallback(async (codeToExecute: string | null) => {
        if (!codeToExecute) { toast.warn("Không có mã để thực thi."); return; }

        setIsExecuting(true); // Bắt đầu executing
        // Hiển thị toast loading
        const toastId = toast.loading(`Đang thực thi mã${runAsAdmin ? ' với quyền Admin/Root' : ''}...`);
        const executionBlockId = Date.now().toString() + '_ex';
        const now = new Date().toISOString();
        // Tạo đối tượng cơ sở cho khối execution
        const executionBlockBase: Partial<ConversationBlock> = { type: 'execution', id: executionBlockId, timestamp: now, isNew: true };

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // Timeout 45 giây cho thực thi

            // Gửi yêu cầu execute trực tiếp (không qua sendApiRequest vì cần xử lý status code khác)
            const response = await fetch('http://localhost:5001/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Gửi kèm code và cờ runAsAdmin
                body: JSON.stringify({ code: codeToExecute, run_as_admin: runAsAdmin }),
                signal: controller.signal
            });
             clearTimeout(timeoutId); // Hủy timeout

            const data: ExecutionResult = await response.json();
            // Gắn thêm code đã chạy vào kết quả để dùng cho debug sau này
            const executionDataWithOrigin = { ...data, codeThatFailed: codeToExecute };
            // Thêm khối kết quả vào conversation
            setConversation(prev => [...prev, { ...executionBlockBase, data: executionDataWithOrigin } as ConversationBlock]);

            // Hiển thị cảnh báo từ backend (nếu có) như một toast riêng
            if (data.warning) {
                toast.warning(data.warning, { autoClose: 7000, toastId: `warning-${executionBlockId}` });
            }

            // Kiểm tra các dấu hiệu lỗi tiềm ẩn trong stdout (ngoài stderr và return code)
            const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
            const stdoutLooksLikeError = data.output?.trim() && stdoutErrorKeywords.some(kw => data.output.toLowerCase().includes(kw));
            const hasError = data.return_code !== 0 || data.error?.trim(); // Lỗi rõ ràng từ return code hoặc stderr

            // Cập nhật toast dựa trên kết quả
            if (response.ok && !hasError && !stdoutLooksLikeError) {
                 toast.update(toastId, { render: "Thực thi thành công!", type: "success", isLoading: false, autoClose: 3000 });
            } else if (response.ok && !hasError && stdoutLooksLikeError) { // Thành công nhưng output đáng ngờ
                 toast.update(toastId, { render: "Đã thực thi, nhưng output có thể chứa vấn đề.", type: "warning", isLoading: false, autoClose: 5000 });
            } else { // Thất bại hoặc có lỗi rõ ràng
                 toast.update(toastId, { render: data.error === 'Timeout' ? "Thực thi quá thời gian." : "Thực thi thất bại hoặc có lỗi.", type: "error", isLoading: false, autoClose: 5000 });
            }
        } catch (err: any) {
             // Xử lý lỗi fetch hoặc timeout phía client
             const errorData: ExecutionResult = {
                 message: "Lỗi kết nối/fetch.", output: "",
                 error: err.name === 'AbortError' ? 'Thực thi quá thời gian (Client)' : err.message,
                 return_code: -200, // Mã lỗi tùy chỉnh cho lỗi fetch
                 codeThatFailed: codeToExecute
             };
            // Thêm khối lỗi vào conversation
            setConversation(prev => [...prev, { ...executionBlockBase, data: errorData, id: executionBlockId + '_fetcherr' } as ConversationBlock]);
            // Cập nhật toast lỗi
            toast.update(toastId, { render: `Lỗi thực thi: ${errorData.error}`, type: "error", isLoading: false, autoClose: 5000 });
        } finally { setIsExecuting(false); } // Kết thúc executing
      }, [runAsAdmin]); // Phụ thuộc runAsAdmin

      const handleDebug = useCallback(async (codeToDebug: string | null, lastExecutionResult: ExecutionResult | null) => {
          // Hàm kiểm tra xem kết quả thực thi có dấu hiệu lỗi không
          const hasErrorSignal = (execResult: ExecutionResult | null): boolean => {
              if (!execResult) return false;
              const hasStdErr = !!execResult.error?.trim(); // Có stderr không rỗng
              const nonZeroReturn = execResult.return_code !== 0; // Mã trả về khác 0
              // Các từ khóa thường gặp trong thông báo lỗi tiếng Việt/Anh
              const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
              const stdoutLooksError = !!execResult.output?.trim() && stdoutErrorKeywords.some(kw => execResult.output!.toLowerCase().includes(kw)); // Output chứa từ khóa lỗi
              return hasStdErr || nonZeroReturn || stdoutLooksError; // Chỉ cần 1 trong các điều kiện
          };

          // Điều kiện để bắt đầu debug: phải có code và kết quả thực thi có lỗi
          if (!codeToDebug || !hasErrorSignal(lastExecutionResult)) {
              toast.warn("Cần có mã và kết quả thực thi có lỗi (stderr, mã trả về khác 0, hoặc từ khóa lỗi trong output) để gỡ rối.");
              return;
           }

          setIsDebugging(true); // Bắt đầu debugging
          const now = new Date().toISOString();
          const loadingId = Date.now().toString() + '_dload';
          const loadingBlock: ConversationBlock = { type: 'loading', data: 'Đang gỡ rối mã...', id: loadingId, timestamp: now, isNew: true };
          setConversation(prev => [...prev, loadingBlock]); // Thêm loading

          // Tìm prompt gốc gần nhất liên quan đến code bị lỗi
          let userPromptForDebug = "(Không tìm thấy prompt gốc)"; // Mặc định
          let foundExecution = false; // Cờ đánh dấu đã tìm thấy khối execution tương ứng
          const reversedFullConversation = [...conversation].reverse(); // Duyệt ngược từ cuối lên
          for (const block of reversedFullConversation) {
               // Tìm khối execution khớp với code đang debug
               if (!foundExecution && block.type === 'execution' && block.data?.codeThatFailed === codeToDebug) {
                   foundExecution = true;
               }
               // Sau khi tìm thấy execution, tìm khối user ngay trước đó
               if (foundExecution && block.type === 'user') {
                   userPromptForDebug = block.data; // Lấy prompt
                   break; // Dừng tìm kiếm
               }
          }

          try {
              // Gửi yêu cầu debug
              const data: DebugResult = await sendApiRequest('debug', {
                  prompt: userPromptForDebug, // Prompt gốc tìm được
                  code: codeToDebug,          // Code bị lỗi
                  stdout: lastExecutionResult?.output ?? '', // Output của lần chạy lỗi
                  stderr: lastExecutionResult?.error ?? '',   // Stderr của lần chạy lỗi
              });
              const newDebugBlockId = Date.now().toString() + '_dbg';
              // Thay loading bằng kết quả debug
              setConversation(prev => [
                  ...prev.filter(b => b.id !== loadingId),
                  { type: 'debug', data: data, id: newDebugBlockId, timestamp: new Date().toISOString(), isNew: true }
              ]);
              toast.success("Đã phân tích gỡ rối xong!");
          } catch (err: any) {
              // Xử lý lỗi debug
              const errorData: DebugResult = { explanation: null, corrected_code: null, error: err.message };
              const newErrorBlockId = Date.now().toString() + '_dbgerr';
              setConversation(prev => [
                   ...prev.filter(b => b.id !== loadingId),
                   { type: 'debug', data: errorData, id: newErrorBlockId, timestamp: new Date().toISOString(), isNew: true } // Vẫn dùng type 'debug' để hiển thị lỗi
              ]);
              toast.error(`Gỡ rối thất bại: ${err.message}`);
          } finally { setIsDebugging(false); } // Kết thúc debugging
      }, [conversation, sendApiRequest]); // Phụ thuộc vào conversation và sendApiRequest

      // Hàm áp dụng code đã sửa từ khối debug vào một khối AI code mới
      const applyCorrectedCode = useCallback((correctedCode: string) => {
          const newBlockId = Date.now().toString() + '_ac';
          // Thêm khối AI code mới với nội dung là code đã sửa
          setConversation(prev => [...prev, { type: 'ai-code', data: correctedCode, id: newBlockId, timestamp: new Date().toISOString(), isNew: true }]);
          toast.success("Đã áp dụng code sửa lỗi vào khối mới.");
      }, []);

    // Hàm cài đặt package Python
    const handleInstallPackage = useCallback(async (packageName: string) => {
        if (!packageName) { toast.warn("Không có tên package được chỉ định."); return; }
        setIsInstalling(true); // Bắt đầu installing
        const toastId = toast.loading(`Đang thử cài đặt ${packageName}...`);
        const installBlockId = Date.now().toString() + '_inst';
        const now = new Date().toISOString();
        // Tạo đối tượng cơ sở cho khối installation
        const installBlockBase: Partial<ConversationBlock> = { type: 'installation', id: installBlockId, timestamp: now, isNew: true };

        try {
            // Gửi yêu cầu install_package
            const response = await fetch('http://localhost:5001/api/install_package', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_name: packageName }),
            });
            const data: InstallationResult = await response.json();
            // Gắn thêm tên package vào kết quả
            const resultData = { ...data, package_name: packageName };
            // Thêm khối kết quả cài đặt vào conversation
            setConversation(prev => [...prev, { ...installBlockBase, data: resultData } as ConversationBlock]);

            // Cập nhật toast dựa trên kết quả
            if (data.success) {
                toast.update(toastId, { render: `Đã cài đặt ${packageName} thành công!`, type: "success", isLoading: false, autoClose: 4000 });
            } else {
                // Hiển thị lỗi chi tiết hơn nếu có
                const errorMessage = data.error || data.output || "Cài đặt thất bại. Xem chi tiết.";
                toast.update(toastId, { render: `Cài đặt ${packageName} thất bại. ${errorMessage.split('\n')[0]}`, type: "error", isLoading: false, autoClose: 6000 });
            }
        } catch (err: any) {
            // Xử lý lỗi fetch
            const errorData: InstallationResult = { success: false, message: `Lỗi kết nối khi cài đặt.`, output: "", error: err.message, package_name: packageName };
            setConversation(prev => [...prev, { ...installBlockBase, data: errorData, id: installBlockId + '_fetcherr' } as ConversationBlock]);
            toast.update(toastId, { render: `Lỗi cài đặt: ${err.message}`, type: "error", isLoading: false, autoClose: 5000 });
        } finally { setIsInstalling(false); } // Kết thúc installing
    }, []);
    // ---------------------------------------------------------------------------

  // Biến xác định trạng thái bận chung của ứng dụng
  const isBusy = isLoading || isExecuting || isReviewing || isDebugging || isInstalling;

  // Lọc conversation để chỉ hiển thị số lượng giới hạn trong CenterArea
  const displayedConversation = conversation.slice(-MAX_DISPLAYED_BLOCKS);

  return (
    <div className="main-container">
      {/* Container cho các thông báo toast */}
      <ToastContainer theme="dark" position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />

      {/* Khu vực hiển thị hội thoại và input */}
      <CenterArea
        conversation={displayedConversation} // Chỉ truyền phần conversation đã lọc
        isLoading={isLoading}
        isBusy={isBusy}
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        onReview={handleReviewCode}
        onExecute={handleExecute}
        onDebug={handleDebug} // Hàm debug giờ lấy conversation từ state App
        onApplyCorrectedCode={applyCorrectedCode}
        onInstallPackage={handleInstallPackage}
        collapsedStates={collapsedStates}
        onToggleCollapse={toggleCollapse}
        expandedOutputs={expandedOutputs}
        onToggleOutputExpand={onToggleOutputExpand}
        onToggleSidebar={handleToggleSidebar} // Truyền hàm toggle sidebar
      />

      {/* Sidebar cài đặt */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)} // Hàm đóng sidebar
        modelConfig={modelConfig}
        onConfigChange={handleConfigChange}
        onSaveSettings={handleSaveSettings}
        isBusy={isBusy}
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