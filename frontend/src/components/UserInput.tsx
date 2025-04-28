// frontend/src/components/UserInput.tsx
import React, { KeyboardEvent, useRef, useEffect } from 'react';
import { FiSend } from 'react-icons/fi';
import './UserInput.css'; 

interface UserInputProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSend: () => void;
  isLoading: boolean; // True khi đang chờ AI generate code
}

const UserInput: React.FC<UserInputProps> = ({ prompt, setPrompt, onSend, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && !isLoading && prompt.trim()) {
      e.preventDefault();
      onSend();
    }
  };

  useEffect(() => { // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // px
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [prompt]);

  return (
    <div className="user-input-container">
      <div className="user-input-area">
        <textarea
          ref={textareaRef}
          placeholder="Cần gì đó (Ctrl+Enter để gửi)..."
          rows={1}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !prompt.trim()}
          className="send-button icon-button"
          title="Send (Ctrl+Enter)"
        >
          <FiSend />
        </button>
      </div>
       <div className="input-footer-text">
            Là một phiên bản thử nghiệm, sẽ có nhiều lỗi. ᓚᘏᗢ
        </div>
    </div>
  );
};
export default UserInput;