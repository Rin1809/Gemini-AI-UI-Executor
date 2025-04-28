// frontend/src/components/ExpandableOutput.tsx
import React, { useRef } from 'react'; // Chỉ cần useRef
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './CenterArea.css'; // Dùng chung CSS

interface ExpandableOutputProps {
  text: string | null | undefined;
  label: string; // "stdout" hoặc "stderr"
  isExpanded: boolean;
  onToggleExpand: () => void;
  previewLineCount?: number; // Dùng để tính class hoặc style nếu cần
  className?: string; // Cho phép thêm class (vd: stderr)
}

const ExpandableOutput: React.FC<ExpandableOutputProps> = ({
  text,
  label,
  isExpanded,
  onToggleExpand,
  previewLineCount = 5, // Mặc định 5 dòng
  className = '',
}) => {
  const preRef = useRef<HTMLPreElement>(null); // Vẫn giữ ref nếu cần

  if (!text?.trim()) {
    return null; // Không hiển thị nếu không có nội dung
  }

  const lines = text.split('\n');
  const needsExpansion = lines.length > previewLineCount;

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
      {/* Class được cập nhật bởi isExpanded */}
      <pre
        ref={preRef}
        className={`output-pre ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
};

export default ExpandableOutput;