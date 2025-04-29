// frontend/src/components/CollapsedInteractionBlock.tsx
import React from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { PiSparkleFill } from "react-icons/pi"; 
import './CenterArea.css';

// --- Props Interface ---
interface CollapsedInteractionBlockProps {
  promptText: string; // Nội dung prompt của người dùng
  blockId: string;    // ID của khối user tương ứng
  timestamp: string;  // Thời gian tạo
  onToggleCollapse: (id: string) => void; // Hàm để mở lại khối này
}
// ---------------------

// --- Hàm định dạng thời gian ---
const formatTimestamp = (isoString: string) => {
    try {
        const date = new Date(isoString);
        // Định dạng: 8:44 CH (hoặc SA tùy locale)
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) { return ''; } // Trả về rỗng nếu lỗi
};
// ---------------------------

const CollapsedInteractionBlock: React.FC<CollapsedInteractionBlockProps> = ({
  promptText,
  blockId,
  timestamp,
  onToggleCollapse,
}) => {

  // Lấy dòng đầu tiên của prompt để hiển thị tóm tắt
  const firstLinePrompt = promptText.split('\n')[0];

  return (
    <div
      className="collapsed-section-block interactive" // 'interactive' cho biết có thể click
      onClick={() => onToggleCollapse(blockId)} // Click để mở
      title="Mở rộng cuộc hội thoại này" // Tooltip
    >
       {/* Phần header của khối thu gọn */}
       <div className="collapsed-section-header">
            <div className="collapsed-title-group">
                 <PiSparkleFill className="collapsed-sparkle-icon" /> {/* Icon */}
                 <span className="collapsed-title-text">Yêu cầu</span> {/* Tiêu đề */}
            </div>
            {/* Thời gian */}
            <span className="block-timestamp collapsed-timestamp">{formatTimestamp(timestamp)}</span>
       </div>
       {/* Phần thân: hiển thị dòng đầu tiên của prompt */}
       <div className="collapsed-section-body">
           <p className="collapsed-prompt-summary">{firstLinePrompt}</p>
       </div>
       {/* Phần footer: chỉ dẫn và icon mở rộng */}
       <div className="collapsed-section-footer">
           <span className="expand-prompt-text">Mở rộng để xem toàn bộ cuộc hội thoại</span>
           <FiChevronDown className="expand-icon" />
       </div>
    </div>
  );
};

export default CollapsedInteractionBlock;