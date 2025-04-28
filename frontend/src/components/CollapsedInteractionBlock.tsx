// frontend/src/components/CollapsedInteractionBlock.tsx
import React from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { PiSparkleFill } from "react-icons/pi"; // Import icon sparkle
import './CenterArea.css'; // Dùng chung CSS

interface CollapsedInteractionBlockProps {
  promptText: string;
  blockId: string;
  timestamp: string; // Thêm timestamp
  onToggleCollapse: (id: string) => void;
}

// Helper format timestamp (có thể đưa ra file utils dùng chung)
const formatTimestamp = (isoString: string) => {
    try {
        const date = new Date(isoString);
        // Định dạng giống Gemini Web UI hơn (HH:MM AM/PM)
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return ''; }
};


const CollapsedInteractionBlock: React.FC<CollapsedInteractionBlockProps> = ({
  promptText,
  blockId,
  timestamp, // Nhận timestamp
  onToggleCollapse,
}) => {
  // Lấy một phần ngắn hơn để hiển thị dưới title
  const summarizedPrompt = promptText.length > 100 ? promptText.substring(0, 100) + '...' : promptText;

  return (
    // Class mới và cấu trúc mới
    <div className="collapsed-section-block interactive" onClick={() => onToggleCollapse(blockId)} title="Expand conversation">
       <div className="collapsed-section-header">
            <div className="collapsed-title-group">
                 <PiSparkleFill className="collapsed-sparkle-icon" />
                 {/* Thay "Conversation" bằng "Prompt" hoặc để trống */}
                 <span className="collapsed-title-text">Prompt</span>
            </div>
            {/* Timestamp */}
            <span className="block-timestamp collapsed-timestamp">{formatTimestamp(timestamp)}</span>
       </div>
       <div className="collapsed-section-body">
           {/* Hiện prompt tóm tắt */}
           <p className="collapsed-prompt-summary">{summarizedPrompt}</p>
       </div>
       <div className="collapsed-section-footer">
           {/* Text expand */}
           <span className="expand-prompt-text">Expand to view full conversation</span>
           {/* Icon expand */}
           <FiChevronDown className="expand-icon" />
       </div>
    </div>
  );
};

export default CollapsedInteractionBlock;