// frontend/src/components/CollapsedInteractionBlock.tsx
import React from 'react';
import { FiUser, FiChevronDown, FiMessageSquare } from 'react-icons/fi';
import './CenterArea.css';

interface CollapsedInteractionBlockProps {
  promptText: string;
  blockId: string;
  timestamp: string; // Thêm timestamp
  onToggleCollapse: (id: string) => void;
}

// Helper format timestamp (có thể đưa ra file utils dùng chung)
const formatTimestamp = (isoString: string | undefined) => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
};


const CollapsedInteractionBlock: React.FC<CollapsedInteractionBlockProps> = ({
  promptText,
  blockId,
  timestamp, // Nhận timestamp
  onToggleCollapse,
}) => {
  const summarizedPrompt = promptText.length > 60 ? promptText.substring(0, 60) + '...' : promptText;

  return (
    // Thay đổi cấu trúc và class để giống ảnh hơn
    <div className="interaction-block collapsed-block interactive" onClick={() => onToggleCollapse(blockId)} title="Expand conversation">
      <div className="block-avatar">
        <span className="block-icon user-icon"><FiUser /></span>
      </div>
      <div className="block-main-content collapsed-summary">
         <FiMessageSquare className="summary-icon" />
        <span className="collapsed-prompt-text">{summarizedPrompt}</span>
        <span className="block-timestamp collapsed-timestamp">{formatTimestamp(timestamp)}</span>
        <FiChevronDown className="expand-icon" />
      </div>
    </div>
  );
};

export default CollapsedInteractionBlock;