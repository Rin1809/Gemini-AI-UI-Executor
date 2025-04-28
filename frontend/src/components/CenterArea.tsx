// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect } from 'react';
import { FiSettings, FiChevronUp } from 'react-icons/fi';
import UserInput from './UserInput';
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
// Thêm InstallationResult vào import nếu bạn định nghĩa nó ở App.tsx
import { ConversationBlock, ExecutionResult, InstallationResult } from '../App'; // Import interfaces
import './CenterArea.css';

// --- Interface Props (THÊM onInstallPackage) ---
interface CenterAreaProps {
  conversation: Array<ConversationBlock>;
  isLoading: boolean;
  isBusy: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: (prompt: string) => void;
  onReview: (codeToReview: string) => void;
  onExecute: (codeToExecute: string) => void;
  onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
  onApplyCorrectedCode: (code: string) => void;
  onInstallPackage: (packageName: string) => Promise<void>; // <-- THÊM PROP MỚI
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
  onToggleSidebar: () => void;
}
// --------------------------------------------

const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    onInstallPackage, // <-- Lấy prop mới
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand,
    onToggleSidebar
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);

   // --- Scroll Effect ---
   useEffect(() => {
    if (scrollRef.current) {
        const scrollTarget = scrollRef.current;
        // Tìm block MỚI NHẤT có cờ isNew
        const newBlock = conversation.slice().reverse().find(b => b.isNew);
        const newElementInView = newBlock ? scrollTarget.querySelector(`[data-block-id="${newBlock.id}"]`) : null;

        if (newElementInView) {
            const timer = setTimeout(() => {
                if (scrollTarget && newElementInView) {
                     // Tính toán vị trí cuộn để block mới nằm gần cuối view
                     const elementTop = (newElementInView as HTMLElement).offsetTop;
                     const elementHeight = newElementInView.clientHeight;
                     const containerHeight = scrollTarget.clientHeight;
                     // Cuộn sao cho phần tử ở gần dưới cùng, có chút khoảng đệm
                     const scrollTo = elementTop - containerHeight + elementHeight + 30; // 30px padding bottom
                     scrollTarget.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
                 }
            }, 100); // Delay nhẹ để chờ DOM update và animation CSS bắt đầu
            return () => clearTimeout(timer);
        }
    }
  }, [conversation]); // Chỉ phụ thuộc conversation
  // ---------------------------

  const renderConversation = () => {
    const rounds: { userBlock: ConversationBlock; childrenBlocks: ConversationBlock[] }[] = [];
    let currentUserBlock: ConversationBlock | null = null;
    let currentRoundBlocks: ConversationBlock[] = [];

    // --- Logic phân chia round (giữ nguyên như đã sửa ở bước trước) ---
    for (const block of conversation) {
        if (block.type === 'user') {
            if (currentUserBlock) { rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks }); }
            currentUserBlock = block;
            currentRoundBlocks = [];
        } else if (currentUserBlock) {
            currentRoundBlocks.push(block);
        } else {
             rounds.push({ userBlock: { type: 'placeholder', data: null, id: `placeholder-${block.id}`, timestamp: block.timestamp, isNew: block.isNew }, childrenBlocks: [block] });
             currentUserBlock = null;
        }
    }
    if (currentUserBlock) { rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks }); }
    // ---------------------------------------------------------------

    return rounds.map((round, index) => {
        const userBlockId = round.userBlock.id;
        const isPlaceholder = round.userBlock.type === 'placeholder';
        const isLastRound = index === rounds.length - 1;
        // Sửa logic collapse: Mặc định là true cho các round cũ, trừ khi state chỉ định khác
        const isCollapsed = !isLastRound && !isPlaceholder && (collapsedStates[userBlockId] !== false); // Nếu state là undefined hoặc true -> collapsed


        if (isPlaceholder) {
             return (
                 <div key={userBlockId} className="interaction-round placeholder-round">
                      {round.childrenBlocks.map(childBlock => (
                         <InteractionBlock
                             key={childBlock.id}
                             block={childBlock}
                             isBusy={isBusy}
                             onReview={onReview}
                             onExecute={onExecute}
                             onDebug={onDebug}
                             onApplyCorrectedCode={onApplyCorrectedCode}
                             onInstallPackage={onInstallPackage} // <-- TRUYỀN XUỐNG
                             expandedOutputs={expandedOutputs}
                             onToggleOutputExpand={onToggleOutputExpand}
                             data-block-id={childBlock.id} // Quan trọng cho scroll
                         />
                     ))}
                 </div>
             );
         }

        // Render round bình thường
        return (
            <div key={userBlockId + '-round'} className={`interaction-round ${isCollapsed ? 'collapsed-round' : 'expanded-round'}`}>
                {/* Phần Header: Collapsed hoặc User Block */}
                {isCollapsed ? (
                    <CollapsedInteractionBlock
                        key={userBlockId + '-collapsed-header'}
                        promptText={round.userBlock.data}
                        blockId={userBlockId}
                        timestamp={round.userBlock.timestamp}
                        onToggleCollapse={onToggleCollapse}
                    />
                ) : (
                    <InteractionBlock
                        key={userBlockId + '-expanded-header'}
                        block={round.userBlock}
                        isBusy={isBusy}
                        // Các hàm action không áp dụng cho user block nên không cần truyền
                        onReview={() => {}}
                        onExecute={() => {}}
                        onDebug={() => {}}
                        onApplyCorrectedCode={() => {}}
                        onInstallPackage={() => Promise.resolve()} // Hàm rỗng
                        expandedOutputs={expandedOutputs}
                        onToggleOutputExpand={onToggleOutputExpand}
                        data-block-id={round.userBlock.id} // Quan trọng cho scroll
                    />
                )}

                {/* ---->>> Container luôn render <<<---- */}
                <div className={`collapsible-content ${isCollapsed ? '' : 'expanded'}`}>
                    {round.childrenBlocks.map(childBlock => (
                        <InteractionBlock
                            key={childBlock.id}
                            block={childBlock}
                            isBusy={isBusy}
                            onReview={onReview}
                            onExecute={onExecute}
                            onDebug={onDebug}
                            onApplyCorrectedCode={onApplyCorrectedCode}
                            onInstallPackage={onInstallPackage} // <-- TRUYỀN XUỐNG
                            expandedOutputs={expandedOutputs}
                            onToggleOutputExpand={onToggleOutputExpand}
                            data-block-id={childBlock.id} // Quan trọng cho scroll
                        />
                    ))}
                    {/* Nút Collapse chỉ hiển thị khi expanded và không phải round cuối */}
                    {!isLastRound && !isCollapsed && (
                        <div className="collapse-round-wrapper">
                            <button onClick={() => onToggleCollapse(userBlockId)} className="collapse-round-button">
                                <FiChevronUp /> Collapse section
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    });
  };

  return (
    <main className="center-area-wrapper">
      <div className="top-bar">
         <h2>ᓚᘏᗢ</h2>
         <button
            onClick={onToggleSidebar}
            className="icon-button subtle settings-trigger-button"
            title="Show Settings"
            disabled={isBusy}
         >
            <FiSettings />
         </button>
      </div>
      <div className="interaction-container" ref={scrollRef}>
        {renderConversation()}
      </div>
      <UserInput
        prompt={prompt} setPrompt={setPrompt}
        onSend={() => onGenerate(prompt)}
        isLoading={isLoading} // Chỉ truyền isLoading cho generate
      />
    </main>
  );
};
export default CenterArea;