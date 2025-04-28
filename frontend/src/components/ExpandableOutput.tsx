// frontend/src/components/ExpandableOutput.tsx
import React, { useRef } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './CenterArea.css'; 

interface ExpandableOutputProps {
  text: string | null | undefined;
  label: string; // "stdout" hoặc "stderr"
  isExpanded: boolean;
  onToggleExpand: () => void;
  previewLineCount?: number; 
  className?: string; 
}

const ExpandableOutput: React.FC<ExpandableOutputProps> = ({
  text,
  label,
  isExpanded,
  onToggleExpand,
  previewLineCount = 5, // Mặc định 5 dòng
  className = '',
}) => {
  const preRef = useRef<HTMLPreElement>(null);

  if (!text?.trim()) {
    return null; // Không hiển thị nếu không có nội dung
  }

  const lines = text.split('\n');
  // Vẫn kiểm tra để biết có cần nút Expand/Collapse không
  const needsExpansion = lines.length > previewLineCount;

  // Ước tính chiều cao preview dựa trên số dòng và line-height (ví dụ: 1.45em)
  const previewHeightEm = `${previewLineCount * 1.45}em`;

  return (
    <div className={`output-section ${className}`}>
      <div className="output-header">
        <span className="output-label">{label}:</span>
        {needsExpansion && (
          <button onClick={onToggleExpand} className="expand-output-button">
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>
      {/* Đặt CSS variable cho chiều cao preview */}
      <pre
        ref={preRef}
        className={`output-pre ${isExpanded ? 'expanded' : 'collapsed'}`}
        style={{ '--preview-height': previewHeightEm } as React.CSSProperties}
      >
        <code>{text}</code> {/* Luôn render full text */}
      </pre>
    </div>
  );
};

export default ExpandableOutput;