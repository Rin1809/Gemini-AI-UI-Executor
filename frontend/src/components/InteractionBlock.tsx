// frontend/src/components/InteractionBlock.tsx
import React from 'react';
import { FiUser, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiCopy, FiDownload, FiTerminal } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin cho GitHub Flavored Markdown (tables, strikethrough, etc.)
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Chọn theme tối
import ExpandableOutput from './ExpandableOutput'; // Component hiển thị output mở rộng được
import { ConversationBlock, ExecutionResult, ReviewResult, DebugResult, InstallationResult } from '../App'; // Import các kiểu dữ liệu
import { toast } from 'react-toastify'; // Thư viện hiển thị thông báo
import './CenterArea.css';

// --- Props Interface ---
interface InteractionBlockProps {
    block: ConversationBlock; // Dữ liệu của khối này
    isBusy: boolean;          // Trạng thái bận của ứng dụng (để disable nút)
    onReview: (codeToReview: string) => void;       // Hàm xử lý khi nhấn nút Review
    onExecute: (codeToExecute: string) => void;     // Hàm xử lý khi nhấn nút Execute
    onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void; // Hàm xử lý khi nhấn nút Debug
    onApplyCorrectedCode: (code: string) => void; // Hàm xử lý khi áp dụng code đã sửa
    onInstallPackage: (packageName: string) => Promise<void>; // Hàm xử lý cài đặt package
    expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>; // State mở rộng output từ App
    onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void; // Hàm thay đổi state mở rộng output
    'data-block-id'?: string; // Thuộc tính data để hỗ trợ cuộn tới khối này
}
// ------------------------

// --- Hàm định dạng thời gian ---
const formatTimestamp = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return '';
    }
};
// ---------------------------

// --- Component tùy chỉnh cho Markdown (để highlight code) ---
const MarkdownComponents = {
    // Tùy chỉnh cách hiển thị thẻ <code>
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || ''); // Tìm ngôn ngữ (vd: language-python)
      const codeString = String(children ?? '').replace(/\n$/, ''); // Lấy nội dung code

      // Hàm copy code bên trong Markdown
      const handleCopyMdCode = () => {
          navigator.clipboard.writeText(codeString).then(() => toast.info("Đã sao chép mã Markdown!"));
      };

      // Nếu là khối code (không phải inline) và có ngôn ngữ được xác định
      return !inline && match ? (
        <div className="markdown-code-block">
            {/* Header của khối code Markdown */}
            <div className="code-block-header">
                <span>{match[1]}</span> {/* Hiển thị tên ngôn ngữ */}
                <button onClick={handleCopyMdCode} className="icon-button subtle small copy-button" title="Sao chép mã"><FiCopy /></button>
             </div>
             {/* Dùng SyntaxHighlighter để tô màu */}
            <SyntaxHighlighter
              style={vscDarkPlus as any} // Áp dụng theme
              language={match[1]}        // Ngôn ngữ
              PreTag="div"               // Dùng div thay vì pre mặc định
              {...props}                 // Các props khác
            >
                {codeString}
            </SyntaxHighlighter>
        </div>
      ) : (
        // Nếu là code inline (ví dụ: `variable_name`)
        <code className={`inline-code ${className || ''}`} {...props}>{children}</code>
      );
    }
};
// -------------------------------------------------------

// --- Component InteractionBlock ---
const InteractionBlock: React.FC<InteractionBlockProps> = React.memo(({
    block, isBusy, onReview, onExecute, onDebug, onApplyCorrectedCode,
    onInstallPackage,
    expandedOutputs, onToggleOutputExpand
 }) => {
  const { type, data, id, timestamp, isNew } = block; // Lấy thông tin từ props

  // --- Hàm xử lý Sao chép / Tải xuống code ---
  const handleCopy = (text: string | null | undefined) => {
    if (typeof text === 'string') {
      navigator.clipboard.writeText(text).then(() => toast.info("Đã sao chép mã!"));
    }
  };
  const handleDownload = (filename: string, text: string | null | undefined) => {
    if (typeof text === 'string') {
      const element = document.createElement("a");
      const file = new Blob([text], {type: 'text/plain;charset=utf-8'}); // Tạo Blob UTF-8
      element.href = URL.createObjectURL(file); // Tạo URL object
      element.download = filename; // Đặt tên file
      document.body.appendChild(element); // Thêm vào DOM để có thể click
      element.click(); // Giả lập click để tải
      document.body.removeChild(element); // Xóa khỏi DOM
      URL.revokeObjectURL(element.href); // Giải phóng URL object
    }
  };
  // -----------------------------------------

  // --- Hàm kiểm tra dấu hiệu lỗi trong kết quả thực thi ---
  const hasErrorSignal = (execData: any): boolean => {
      if (!execData) return false;
      const hasStdErr = !!execData?.error?.trim();
      const nonZeroReturn = execData?.return_code !== 0;
      const stdoutErrorKeywords = ['lỗi', 'error', 'fail', 'cannot', 'unable', 'traceback', 'exception', 'not found', 'không tìm thấy', 'invalid'];
      const stdoutLooksError = !!execData?.output?.trim() && stdoutErrorKeywords.some(kw => execData.output!.toLowerCase().includes(kw));
      return !!(nonZeroReturn || hasStdErr || stdoutLooksError);
  };
  // ------------------------------------------------------

  // --- Hàm render nội dung chính của khối tùy theo type ---
  const renderContent = () => {
    // Kiểm tra dữ liệu không hợp lệ (trừ loading và user rỗng)
    if (!data && type !== 'loading' && !(type === 'user' && data === '')) {
        return <div className="error-inline">Lỗi: Dữ liệu khối không hợp lệ hoặc bị thiếu cho loại '{type}'</div>;
    }

    switch (type) {
      // --- Khối User ---
      case 'user':
        return <div className="prompt-text">{String(data ?? '')}</div>;

      // --- Khối AI Code ---
      case 'ai-code':
        const codeStr = String(data ?? '').trim(); // Lấy code, bỏ khoảng trắng thừa
        return codeStr ? ( // Chỉ render nếu có code
            <div className="code-block-container">
                 {/* Header với tên ngôn ngữ và nút Copy/Download */}
                 <div className="code-block-header">
                    <span>python</span>
                    <div>
                        <button onClick={() => handleCopy(codeStr)} className="icon-button subtle small" title="Sao chép"><FiCopy /></button>
                        <button onClick={() => handleDownload("script.py", codeStr)} className="icon-button subtle small" title="Tải xuống"><FiDownload /></button>
                    </div>
                </div>
                {/* Highlight code */}
                <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block">
                    {codeStr}
                </SyntaxHighlighter>
             </div>
         ) : <p className="error-inline">Nhận được khối mã rỗng.</p>; // Thông báo nếu code rỗng

      // --- Khối Review ---
      case 'review':
         const reviewData = data as ReviewResult;
        return (
            <div className="markdown-content review-content">
                {reviewData?.error ? ( // Hiển thị lỗi nếu có
                    <p className="error-inline">{reviewData.error}</p>
                 ) : ( // Hiển thị nội dung review dạng Markdown
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {reviewData?.review || '(Không có nội dung đánh giá)'}
                    </ReactMarkdown>
                 )}
            </div>
        );

      // --- Khối Execution ---
      case 'execution':
        const execData = data as (ExecutionResult & { codeThatFailed?: string }); // Cast type, bao gồm code gốc
        const currentOutputStateExec = expandedOutputs[id] || { stdout: false, stderr: false }; // Lấy trạng thái mở rộng output
        const execHasError = hasErrorSignal(execData); // Kiểm tra dấu hiệu lỗi
        return (
          <div className={`execution-content ${execHasError ? 'error' : ''}`}>
             {/* Hiển thị cảnh báo từ backend (nếu có) */}
             {execData?.warning && (
                 <p className="exec-warning error-inline"> {/* Dùng style cảnh báo */}
                    <FiAlertTriangle style={{ marginRight: '5px', verticalAlign: 'middle' }}/> {execData.warning}
                 </p>
             )}
            {/* Hiển thị thông báo chính (nếu khác mặc định) */}
            {execData?.message && !execData.message.startsWith("Thực thi") && <p className="exec-message">{execData.message}</p>}
            {/* Output chuẩn (stdout) */}
            <ExpandableOutput
              text={execData?.output} label="stdout" isExpanded={currentOutputStateExec.stdout}
              onToggleExpand={() => onToggleOutputExpand(id, 'stdout')} className="stdout-section"
            />
            {/* Output lỗi (stderr) */}
            <ExpandableOutput
              text={execData?.error} label="stderr" isExpanded={currentOutputStateExec.stderr}
              onToggleExpand={() => onToggleOutputExpand(id, 'stderr')} className="stderr-section"
            />
            {/* Mã trả về */}
            <p className="return-code">Mã trả về: {execData?.return_code ?? 'N/A'}</p>
          </div>
        );

      // --- Khối Debug ---
      case 'debug':
        const debugData = data as DebugResult;
        const correctedCode = debugData?.corrected_code?.trim(); // Code đã sửa
        const suggestedPackage = debugData?.suggested_package; // Package đề xuất cài
        return (
            <div className="debug-content">
                {/* Hiển thị lỗi nếu debug thất bại */}
                {debugData?.error && <p className="error-inline">{debugData.error}</p>}
                {/* Hiển thị giải thích */}
                {debugData?.explanation && (
                    <div className="markdown-content explanation-content">
                        <h4>Giải thích & Đề xuất</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {debugData.explanation}
                        </ReactMarkdown>
                    </div>
                 )}
                 {/* Hiển thị nút cài đặt nếu có đề xuất */}
                 {suggestedPackage && (
                     <div className="install-suggestion-area block-actions-area"> {/* Dùng chung style với action */}
                         <button onClick={() => onInstallPackage(suggestedPackage)} disabled={isBusy}
                             className="install-package-button" title={`Cài đặt package '${suggestedPackage}' bằng pip`} >
                             <FiDownload /> Cài đặt <code>{suggestedPackage}</code>
                         </button>
                     </div>
                 )}
                 {/* Hiển thị code đã sửa nếu có */}
                 {correctedCode && (
                    <>
                        <h4>Mã đề xuất</h4>
                        <div className="code-block-container">
                            <div className="code-block-header">
                                <span>python (đã sửa)</span>
                                <div>
                                    <button onClick={() => handleCopy(correctedCode)} className="icon-button subtle small" title="Sao chép mã đã sửa"><FiCopy /></button>
                                    <button onClick={() => handleDownload("corrected_script.py", correctedCode)} className="icon-button subtle small" title="Tải xuống mã đã sửa"><FiDownload /></button>
                                </div>
                            </div>
                            <SyntaxHighlighter language="python" style={vscDarkPlus as any} className="main-code-block corrected-code">
                                {correctedCode}
                            </SyntaxHighlighter>
                            {/* Nút áp dụng code đã sửa */}
                            <div className="block-actions-area apply-action-area">
                                <button onClick={() => onApplyCorrectedCode(correctedCode)} disabled={isBusy} className="apply-code" title="Sử dụng mã này">Sử dụng Mã Này</button>
                            </div>
                        </div>
                    </>
                 )}
                 {/* Thông báo nếu không có gì được trả về */}
                 {!debugData?.error && !debugData?.explanation && !correctedCode && !suggestedPackage && (
                    <p className="info-inline">(Không có đề xuất hoặc mã sửa lỗi cụ thể từ trình gỡ rối.)</p>
                 )}
            </div>
         );

      // --- Khối Installation ---
      case 'installation':
        const installData = data as InstallationResult;
        const currentOutputStateInst = expandedOutputs[id] || { stdout: false, stderr: false }; // State mở rộng output pip
        return (
            <div className={`installation-content ${!installData.success ? 'error' : ''}`}>
                {/* Thông báo thành công/thất bại */}
                <p className="install-message">
                    {installData.success
                       ? <FiCheckCircle style={{ color: 'var(--success-color)', marginRight: '8px', flexShrink: 0 }}/>
                       : <FiAlertTriangle style={{ color: 'var(--danger-color)', marginRight: '8px', flexShrink: 0 }}/>
                     }
                    Cài đặt <strong>{installData.package_name || 'package'}</strong>: {installData.message}
                </p>
                {/* Output từ pip */}
                <ExpandableOutput
                  text={installData?.output} label="pip output" isExpanded={currentOutputStateInst.stdout}
                  onToggleExpand={() => onToggleOutputExpand(id, 'stdout')} className="stdout-section installation-output"
                />
                {/* Lỗi từ pip (stderr) */}
                <ExpandableOutput
                  text={installData?.error} label="pip error" isExpanded={currentOutputStateInst.stderr}
                  onToggleExpand={() => onToggleOutputExpand(id, 'stderr')} className="stderr-section installation-error"
                />
            </div>
        );

      // --- Khối Loading ---
      case 'loading':
         return <div className="loading-content"><FiLoader className="spinner" /> <p>{String(data ?? 'Đang tải...')}</p></div>;

      // --- Khối Error ---
      case 'error':
          return <div className="error-inline">{String(data ?? 'Đã xảy ra lỗi không xác định.')}</div>;

      // --- Trường hợp mặc định (lỗi không xác định type) ---
      default:
         console.warn("Gặp phải loại khối không xác định:", type, block);
         return <div className="unknown-block error-inline">Loại khối không xác định: {type}</div>;
    }
  };
  // ---------------------------------------------------

  // --- Hàm render icon cho từng loại khối ---
  const renderIcon = () => {
       switch(type) {
           case 'user': return <span className="block-icon user-icon"><FiUser/></span>;
           case 'ai-code': return <span className="block-icon ai-icon"><FiCode/></span>;
           case 'review': return <span className="block-icon review-icon"><FiEye/></span>;
           case 'execution':
               const execHasErr = hasErrorSignal(data); // Kiểm tra lỗi
               // Icon xanh lá nếu thành công, đỏ nếu lỗi
               return <span className={`block-icon execution-icon ${execHasErr ? 'error' : 'success'}`}>{execHasErr ? <FiAlertTriangle/> : <FiCheckCircle/>}</span>;
           case 'debug': return <span className="block-icon debug-icon"><FiTool/></span>;
           case 'loading': return <span className="block-icon loading-icon"><FiLoader className="spinner"/></span>;
           case 'error': return <span className="block-icon error-icon"><FiAlertTriangle/></span>;
           case 'installation':
                const installSuccess = (data as InstallationResult)?.success;
                // Icon xanh lá nếu thành công, icon terminal đỏ nếu lỗi
                return <span className={`block-icon installation-icon ${installSuccess ? 'success' : 'error'}`}>{installSuccess ? <FiCheckCircle/> : <FiTerminal/>}</span>;
           default: return <span className="block-icon unknown-icon">?</span>;
       }
   };
  // ---------------------------------------

   // --- Hàm render các nút hành động (Review, Execute, Debug) ---
   const renderActions = () => {
        const actions = [];
        // Nếu là khối AI code và có dữ liệu code
        if (type === 'ai-code' && data) {
            actions.push(<button key="review" onClick={() => onReview(data)} disabled={isBusy} title="Đánh giá mã"><FiEye /> Đánh giá</button>);
            actions.push(<button key="execute" onClick={() => onExecute(data)} disabled={isBusy} className="execute" title="Thực thi mã"><FiPlay /> Thực thi</button>);
        }
        // Nếu là khối execution và có lỗi
        if (type === 'execution' && hasErrorSignal(data)) {
            const codeThatFailed = (data as ExecutionResult)?.codeThatFailed; // Lấy code đã chạy gây lỗi
            if (codeThatFailed) { // Chỉ hiển thị nút Debug nếu lấy được code gốc
                 actions.push(<button key="debug" onClick={() => onDebug(codeThatFailed, data as ExecutionResult)} disabled={isBusy} className="debug" title="Gỡ lỗi"><FiTool /> Gỡ lỗi</button>);
            }
        }
        // Trả về mảng các nút hoặc null nếu không có action nào
        return actions.length > 0 ? actions : null;
   };
   // --------------------------------------------------------

   // Xác định xem có nên hiển thị khu vực action chính không
   const showActionsArea = type === 'ai-code' || (type === 'execution' && hasErrorSignal(data));

  // --- Render JSX ---
  return (
    // Thêm data-block-id để cuộn tới khối này
    <div className={`interaction-block block-type-${type} ${isNew ? 'newly-added' : ''}`} data-block-id={id}>
      {/* Avatar / Icon */}
      <div className="block-avatar"> {renderIcon()} </div>
      {/* Nội dung chính */}
      <div className="block-main-content">
         {/* Header riêng cho khối User */}
         {type === 'user' && (
            <div className="block-header user-header">
               <span className="user-header-title">Yêu cầu</span>
               <span className="block-timestamp">{formatTimestamp(timestamp)}</span>
            </div>
         )}
         {/* Khu vực nội dung (code, markdown, output, ...) */}
        <div className="block-content-area">{renderContent()}</div>

        {/* Khu vực chứa các nút hành động chính */}
        {showActionsArea && (
             <div className="block-actions-area">{renderActions()}</div>
        )}
      </div>
    </div>
   );
}); // Sử dụng React.memo để tối ưu hóa render nếu props không đổi

export default InteractionBlock;