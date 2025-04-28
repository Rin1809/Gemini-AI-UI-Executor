// frontend/src/components/ExpandableOutput.tsx
import React, { useRef } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './CenterArea.css';

// --- Props Interface ---
interface ExpandableOutputProps {
  text: string | null | undefined; // Nội dung output (stdout/stderr)
  label: string;                   // Nhãn hiển thị ("stdout" hoặc "stderr")
  isExpanded: boolean;             // Trạng thái đang mở rộng hay không
  onToggleExpand: () => void;      // Hàm để thay đổi trạng thái mở rộng
  previewLineCount?: number;       // Số dòng hiển thị khi thu gọn (mặc định 5)
  className?: string;              // Class CSS bổ sung cho container
}
// ---------------------

const ExpandableOutput: React.FC<ExpandableOutputProps> = ({
  text,
  label,
  isExpanded,
  onToggleExpand,
  previewLineCount = 5, // Mặc định 5 dòng preview
  className = '',
}) => {
  const preRef = useRef<HTMLPreElement>(null);

  // Không render gì nếu không có nội dung text
  if (!text?.trim()) {
    return null;
  }

  // Kiểm tra xem có cần nút Mở rộng/Thu gọn không
  const lines = text.split('\n');
  const needsExpansion = lines.length > previewLineCount;

  // Tính chiều cao preview (dùng trong CSS variable)
  const previewHeightEm = `${previewLineCount * 1.45}em`; // 1.45 là line-height ước tính

  return (
    <div className={`output-section ${className}`}>
      {/* Header chứa nhãn và nút Expand/Collapse */}
      <div className="output-header">
        <span className="output-label">{label}:</span>
        {needsExpansion && ( // Chỉ hiển thị nút nếu cần
          <button onClick={onToggleExpand} className="expand-output-button">
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            {isExpanded ? 'Thu gọn' : 'Mở rộng'}
          </button>
        )}
      </div>
      {/* Phần hiển thị nội dung text */}
      <pre
        ref={preRef}
        className={`output-pre ${isExpanded ? 'expanded' : 'collapsed'}`}
        // Truyền chiều cao preview qua CSS variable
        style={{ '--preview-height': previewHeightEm } as React.CSSProperties}
      >
        <code>{text}</code> {/* Luôn render toàn bộ text, CSS sẽ ẩn/hiện */}
      </pre>
    </div>
  );
};

export default ExpandableOutput;