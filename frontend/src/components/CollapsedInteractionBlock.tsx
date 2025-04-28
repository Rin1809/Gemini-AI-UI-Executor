// frontend/src/components/CollapsedInteractionBlock.tsx
import React from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { PiSparkleFill } from "react-icons/pi"; 
import './CenterArea.css'; 

interface CollapsedInteractionBlockProps {
  promptText: string;
  blockId: string;
  timestamp: string;
  onToggleCollapse: (id: string) => void;
}

// Helper format timestamp
const formatTimestamp = (isoString: string) => {
    try {
        const date = new Date(isoString);
        // Format: 8:44 PM
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return ''; }
};


const CollapsedInteractionBlock: React.FC<CollapsedInteractionBlockProps> = ({
  promptText,
  blockId,
  timestamp,
  onToggleCollapse,
}) => {

  const firstLinePrompt = promptText.split('\n')[0];


  return (
    <div className="collapsed-section-block interactive" onClick={() => onToggleCollapse(blockId)} title="Expand conversation">
       <div className="collapsed-section-header">
            <div className="collapsed-title-group">
                 <PiSparkleFill className="collapsed-sparkle-icon" />
                 <span className="collapsed-title-text">Prompt</span>
            </div>
            <span className="block-timestamp collapsed-timestamp">{formatTimestamp(timestamp)}</span>
       </div>
       {/* Hiển thị dòng đầu tiên của prompt */}
       <div className="collapsed-section-body">
           <p className="collapsed-prompt-summary">{firstLinePrompt}</p>
       </div>
       {/* Footer với text và icon */}
       <div className="collapsed-section-footer">
           <span className="expand-prompt-text">Expand to view full conversation</span>
           <FiChevronDown className="expand-icon" />
       </div>
    </div>
  );
};

export default CollapsedInteractionBlock;