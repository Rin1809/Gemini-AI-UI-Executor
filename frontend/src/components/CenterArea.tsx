// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect } from 'react';
import { FiSettings, FiChevronUp } from 'react-icons/fi';
import UserInput from './UserInput';
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
import { ConversationBlock, ExecutionResult, InstallationResult } from '../App'; // Import types
import './CenterArea.css';

// --- Props Interface ---
interface CenterAreaProps {
  conversation: Array<ConversationBlock>; // Nhận mảng conversation đã được lọc (slice)
  isLoading: boolean;
  isBusy: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: (prompt: string) => void;
  onReview: (codeToReview: string) => void;
  onExecute: (codeToExecute: string) => void;
  onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
  onApplyCorrectedCode: (code: string) => void;
  onInstallPackage: (packageName: string) => Promise<void>;
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
  onToggleSidebar: () => void; // Hàm để mở/đóng sidebar
}
// ------------------------

const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, // Sử dụng conversation đã được lọc từ props
    isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    onInstallPackage,
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand,
    onToggleSidebar // Lấy hàm toggle sidebar từ props
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);

   // --- Tự động cuộn xuống khi có khối mới ---
   useEffect(() => {
    if (scrollRef.current) {
        const scrollTarget = scrollRef.current;
        // Tìm khối mới nhất trong *phần hiển thị* (conversation đã được slice)
        const newBlock = conversation.slice().reverse().find(b => b.isNew);
        // Tìm element tương ứng trong DOM
        const newElementInView = newBlock ? scrollTarget.querySelector(`[data-block-id="${newBlock.id}"]`) : null;

        // Nếu tìm thấy element mới, cuộn tới nó sau một khoảng trễ nhỏ
        if (newElementInView) {
             const timer = setTimeout(() => {
                 if (scrollTarget && newElementInView) {
                     const elementTop = (newElementInView as HTMLElement).offsetTop;
                     const elementHeight = newElementInView.clientHeight;
                     const containerHeight = scrollTarget.clientHeight;
                     // Tính toán vị trí cuộn để element mới nằm cuối view
                     const scrollTo = elementTop - containerHeight + elementHeight + 30; // +30px padding
                     scrollTarget.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
                 }
             }, 100); // Trễ 100ms để chờ DOM cập nhật
             return () => clearTimeout(timer); // Hủy timer nếu component unmount
        }
    }
   }, [conversation]); // Chạy lại effect khi conversation (phần hiển thị) thay đổi
  // ---------------------------------------

  // --- Hàm render các khối hội thoại ---
  const renderConversation = () => {
    // Nhóm các khối theo từng "lượt" (user prompt và các phản hồi/hành động sau đó)
    const rounds: { userBlock: ConversationBlock; childrenBlocks: ConversationBlock[] }[] = [];
    let currentUserBlock: ConversationBlock | null = null;
    let currentRoundBlocks: ConversationBlock[] = [];

    // Duyệt qua conversation (đã được lọc) để nhóm
    for (const block of conversation) {
        if (block.type === 'user') {
            // Nếu đã có user block trước đó, đóng round cũ lại
            if (currentUserBlock) { rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks }); }
            // Bắt đầu round mới
            currentUserBlock = block;
            currentRoundBlocks = [];
        } else if (currentUserBlock) {
            // Thêm block con vào round hiện tại
            currentRoundBlocks.push(block);
        } else {
             // Trường hợp block đầu tiên không phải là user (ví dụ: lỗi khởi tạo)
             rounds.push({ userBlock: { type: 'placeholder', data: null, id: `placeholder-${block.id}`, timestamp: block.timestamp, isNew: block.isNew }, childrenBlocks: [block] });
             currentUserBlock = null; // Reset để không bị lỗi ở vòng lặp sau
        }
    }
    // Đảm bảo round cuối cùng được thêm vào
    if (currentUserBlock) { rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks }); }

    // Render từng round
    return rounds.map((round, index) => {
        const userBlockId = round.userBlock.id;
        const isPlaceholder = round.userBlock.type === 'placeholder'; // Là khối tạm do lỗi?
        const isLastRound = index === rounds.length - 1; // Là round cuối cùng?
        // Mặc định thu gọn nếu không phải round cuối và không phải placeholder, trừ khi state chỉ định mở (false)
        const isCollapsed = !isLastRound && !isPlaceholder && (collapsedStates[userBlockId] !== false);

        // Nếu là khối placeholder (thường là lỗi)
        if (isPlaceholder) {
             return (
                 <div key={userBlockId} className="interaction-round placeholder-round">
                      {/* Render các block con của placeholder */}
                      {round.childrenBlocks.map(childBlock => (
                         <InteractionBlock
                             key={childBlock.id} block={childBlock} isBusy={isBusy}
                             onReview={onReview} onExecute={onExecute} onDebug={onDebug}
                             onApplyCorrectedCode={onApplyCorrectedCode} onInstallPackage={onInstallPackage}
                             expandedOutputs={expandedOutputs} onToggleOutputExpand={onToggleOutputExpand}
                             data-block-id={childBlock.id} // Để cuộn tới
                         />
                     ))}
                 </div>
             );
         }

        // Render round bình thường
        return (
            <div key={userBlockId + '-round'} className={`interaction-round ${isCollapsed ? 'collapsed-round' : 'expanded-round'}`}>
                {/* Hiển thị dạng thu gọn hoặc đầy đủ của user block */}
                {isCollapsed ? (
                    <CollapsedInteractionBlock
                        key={userBlockId + '-collapsed-header'} promptText={round.userBlock.data}
                        blockId={userBlockId} timestamp={round.userBlock.timestamp}
                        onToggleCollapse={onToggleCollapse} // Hàm để mở lại
                    />
                ) : (
                    <InteractionBlock
                        key={userBlockId + '-expanded-header'} block={round.userBlock} isBusy={isBusy}
                        // Truyền các hàm xử lý trống vì user block không có action
                        onReview={() => {}} onExecute={() => {}} onDebug={() => {}}
                        onApplyCorrectedCode={() => {}} onInstallPackage={() => Promise.resolve()}
                        expandedOutputs={expandedOutputs} onToggleOutputExpand={onToggleOutputExpand}
                        data-block-id={round.userBlock.id} // Để cuộn tới
                    />
                )}
                {/* Phần nội dung có thể thu gọn (chứa các block con) */}
                <div className={`collapsible-content ${isCollapsed ? '' : 'expanded'}`}>
                    {/* Render các block con (AI, review, exec, etc.) */}
                    {round.childrenBlocks.map(childBlock => (
                        <InteractionBlock
                            key={childBlock.id} block={childBlock} isBusy={isBusy}
                            onReview={onReview} onExecute={onExecute} onDebug={onDebug}
                            onApplyCorrectedCode={onApplyCorrectedCode} onInstallPackage={onInstallPackage}
                            expandedOutputs={expandedOutputs} onToggleOutputExpand={onToggleOutputExpand}
                            data-block-id={childBlock.id} // Để cuộn tới
                        />
                    ))}
                    {/* Nút thu gọn nếu không phải round cuối và đang mở */}
                    {!isLastRound && !isCollapsed && (
                        <div className="collapse-round-wrapper">
                            <button onClick={() => onToggleCollapse(userBlockId)} className="collapse-round-button">
                                <FiChevronUp /> Thu gọn mục này
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    });
  };
  // ----------------------------------

  return (
    <main className="center-area-wrapper">
      {/* Thanh tiêu đề */}
      <div className="top-bar">
         <h2>ᓚᘏᗢ</h2> 
         {/* Nút mở sidebar cài đặt */}
         <button
            onClick={onToggleSidebar}
            className="icon-button subtle settings-trigger-button"
            title="Mở Cài đặt"
            disabled={isBusy} // Vô hiệu hóa khi đang xử lý
            aria-label="Mở cài đặt"
         >
            <FiSettings />
         </button>
      </div>
      {/* Khu vực hiển thị hội thoại (có thể cuộn) */}
      <div className="interaction-container" ref={scrollRef}>
        {renderConversation()}
      </div>
      {/* Khu vực nhập liệu */}
      <UserInput prompt={prompt} setPrompt={setPrompt} onSend={() => onGenerate(prompt)} isLoading={isLoading} />
    </main>
  );
};
export default CenterArea;