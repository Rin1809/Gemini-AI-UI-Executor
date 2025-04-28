// frontend/src/components/ExpandableOutput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import './CenterArea.css';

interface ExpandableOutputProps {
  text: string | null | undefined;
  label: string;
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
  previewLineCount = 5, // Mặc định 5 dòng preview
  className = '',
}) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [contentHeight, setContentHeight] = useState<string | number>('auto'); // Lưu chiều cao đầy đủ
  const previewHeightEstimate = `${previewLineCount * 1.45}em`; // Ước tính chiều cao preview (line-height * lines)

  if (!text?.trim()) {
    return null;
  }

  const lines = text.split('\n');
  const needsExpansion = lines.length > previewLineCount;

  // Tính chiều cao thực tế khi component mount hoặc text thay đổi
  useEffect(() => {
    if (preRef.current && needsExpansion) {
      // Tạm thời bỏ max-height để đo scrollHeight
      const currentMaxHeight = preRef.current.style.maxHeight;
      preRef.current.style.maxHeight = 'none';
      const scrollHeight = preRef.current.scrollHeight;
      setContentHeight(scrollHeight);
      // Đặt lại max-height ban đầu (nếu đang thu gọn) hoặc chiều cao mới (nếu đang mở rộng)
      preRef.current.style.maxHeight = isExpanded ? `${scrollHeight}px` : previewHeightEstimate;
    } else if (preRef.current) {
        // Nếu không cần expansion, đặt auto hoặc reset
        setContentHeight('auto');
        preRef.current.style.maxHeight = 'none';
    }
  }, [text, previewLineCount, needsExpansion]); // Chạy lại khi text hoặc số dòng preview thay đổi

  // Áp dụng chiều cao khi state isExpanded thay đổi
  useEffect(() => {
    if (preRef.current && needsExpansion) {
      preRef.current.style.maxHeight = isExpanded ? `${contentHeight}px` : previewHeightEstimate;
    }
  }, [isExpanded, contentHeight, needsExpansion, previewHeightEstimate]);

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
      <pre ref={preRef} className={`output-pre ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <code>{text}</code> {/* Luôn render full text */}
      </pre>
    </div>
  );
};

export default ExpandableOutput;