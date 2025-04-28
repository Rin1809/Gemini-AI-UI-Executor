// frontend/src/components/UserInput.tsx
import React, { KeyboardEvent, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
import './UserInput.css';

// --- Props Interface ---
interface UserInputProps {
  prompt: string;                        // Nội dung hiện tại của input
  setPrompt: (value: string) => void;    // Hàm cập nhật state prompt
  onSend: () => void;                    // Hàm xử lý khi gửi prompt
  isLoading: boolean;                    // Trạng thái loading (để disable input/button)
}
// ---------------------

const UserInput: React.FC<UserInputProps> = ({ prompt, setPrompt, onSend, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref tới textarea để tự động resize

  // --- Xử lý gửi bằng Ctrl+Enter ---
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Nếu nhấn Ctrl+Enter, không đang loading, và có nội dung
    if (e.key === 'Enter' && e.ctrlKey && !isLoading && prompt.trim()) {
      e.preventDefault(); // Ngăn xuống dòng mặc định
      onSend();           // Gọi hàm gửi
    }
  };
  // --------------------------------

  // --- Tự động resize textarea theo nội dung ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset chiều cao để tính lại
      const scrollHeight = textareaRef.current.scrollHeight; // Lấy chiều cao nội dung thực tế
      const maxHeight = 200; // Chiều cao tối đa cho phép (pixel)
      // Đặt chiều cao mới, không vượt quá max height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      // Hiện scrollbar nếu nội dung vượt quá max height
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [prompt]); // Chạy lại effect khi nội dung prompt thay đổi
  // -----------------------------------------

  return (
    <div className="user-input-container">
      {/* Khu vực chứa textarea và nút gửi */}
      <div className="user-input-area">
        <textarea
          ref={textareaRef}
          placeholder="Cần gì đó (Ctrl+Enter để gửi)..." // Placeholder tiếng Việt
          rows={1} // Bắt đầu với 1 dòng
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)} // Cập nhật state khi nhập
          onKeyDown={handleKeyDown} // Xử lý Ctrl+Enter
          disabled={isLoading} // Disable khi đang loading
        />
        {/* Nút gửi */}
        <button
          onClick={onSend}
          // Disable nếu đang loading hoặc không có nội dung
          disabled={isLoading || !prompt.trim()}
          className="send-button icon-button"
          title="Gửi (Ctrl+Enter)" // Tooltip tiếng Việt
          aria-label="Gửi yêu cầu"
        >
          <FiSend />
        </button>
      </div>
       {/* Dòng text nhỏ ở dưới */}
       <div className="input-footer-text">
            Đây là phiên bản thử nghiệm, có thể gặp lỗi trong quá trình sử dụng. ᓚᘏᗢ
        </div>
    </div>
  );
};

export default UserInput;