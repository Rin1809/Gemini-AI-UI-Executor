// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect } from 'react';
import { FiSettings, FiChevronUp } from 'react-icons/fi';
import UserInput from './UserInput';
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
// Import các kiểu dữ liệu cần thiết
import { ConversationBlock, ExecutionResult, ReviewResult, DebugResult, InstallationResult, ExplainResult } from '../App';
import './CenterArea.css';

// --- Props Interface ---
interface CenterAreaProps {
  conversation: Array<ConversationBlock>;
  isLoading: boolean; // Cho UserInput
  isBusy: boolean;    // Cho các nút trong InteractionBlock
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: (prompt: string) => void;
  onReview: (codeToReview: string, blockId: string) => void; // Thêm blockId
  onExecute: (codeToExecute: string, blockId: string) => void; // Thêm blockId
  onDebug: (codeToDebug: string, executionResult: ExecutionResult, blockId: string) => void; // Thêm blockId
  onApplyCorrectedCode: (code: string, originalDebugBlockId: string) => void; // Thêm blockId
  onInstallPackage: (packageName: string, originalDebugBlockId: string) => Promise<void>; // Thêm blockId
  onExplain: (blockId: string, contentToExplain: any, context: string) => void; // Hàm explain mới
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
  onToggleSidebar: () => void;
}
// ------------------------

const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation,
    isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    onInstallPackage, onExplain, // Lấy onExplain từ props
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand,
    onToggleSidebar
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);

   // --- Tự động cuộn xuống khi có khối mới ---
   useEffect(() => {
    if (scrollRef.current) {
        const scrollTarget = scrollRef.current;
        const newBlock = conversation.slice().reverse().find(b => b.isNew);
        const newElementInView = newBlock ? scrollTarget.querySelector(`[data-block-id="${newBlock.id}"]`) : null;

        if (newElementInView) {
             const timer = setTimeout(() => {
                 if (scrollTarget && newElementInView) {
                     const elementTop = (newElementInView as HTMLElement).offsetTop;
                     const elementHeight = newElementInView.clientHeight;
                     const containerHeight = scrollTarget.clientHeight;
                     const scrollTo = elementTop - containerHeight + elementHeight + 30;
                     scrollTarget.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
                 }
             }, 100);
             return () => clearTimeout(timer);
        }
    }
   }, [conversation]);
  // ---------------------------------------

  // --- Hàm render các khối hội thoại ---
  const renderConversation = () => {
    const rounds: { userBlock: ConversationBlock; childrenBlocks: ConversationBlock[] }[] = [];
    let currentUserBlock: ConversationBlock | null = null;
    let currentRoundBlocks: ConversationBlock[] = [];

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

    return rounds.map((round, index) => {
        const userBlockId = round.userBlock.id;
        const isPlaceholder = round.userBlock.type === 'placeholder';
        const isLastRound = index === rounds.length - 1;
        const isCollapsed = !isLastRound && !isPlaceholder && (collapsedStates[userBlockId] !== false);

        if (isPlaceholder) {
             return (
                 <div key={userBlockId} className="interaction-round placeholder-round">
                      {round.childrenBlocks.map(childBlock => (
                         <InteractionBlock
                             key={childBlock.id} block={childBlock} isBusy={isBusy}
                             onReview={onReview} onExecute={onExecute} onDebug={onDebug}
                             onApplyCorrectedCode={onApplyCorrectedCode} onInstallPackage={onInstallPackage}
                             onExplain={onExplain} // Truyền onExplain
                             expandedOutputs={expandedOutputs} onToggleOutputExpand={onToggleOutputExpand}
                             data-block-id={childBlock.id}
                         />
                     ))}
                 </div>
             );
         }

        return (
            <div key={userBlockId + '-round'} className={`interaction-round ${isCollapsed ? 'collapsed-round' : 'expanded-round'}`}>
                {isCollapsed ? (
                    <CollapsedInteractionBlock
                        key={userBlockId + '-collapsed-header'} promptText={round.userBlock.data}
                        blockId={userBlockId} timestamp={round.userBlock.timestamp}
                        onToggleCollapse={onToggleCollapse}
                    />
                ) : (
                    <InteractionBlock
                        key={userBlockId + '-expanded-header'} block={round.userBlock} isBusy={isBusy}
                        onReview={() => {}} onExecute={() => {}} onDebug={() => {}} // User block không có action
                        onApplyCorrectedCode={() => {}} onInstallPackage={async () => {}}
                        onExplain={() => {}} // User block không có explain
                        expandedOutputs={expandedOutputs} onToggleOutputExpand={onToggleOutputExpand}
                        data-block-id={round.userBlock.id}
                    />
                )}
                <div className={`collapsible-content ${isCollapsed ? '' : 'expanded'}`}>
                    {round.childrenBlocks.map(childBlock => (
                        <InteractionBlock
                            key={childBlock.id} block={childBlock} isBusy={isBusy}
                            onReview={onReview} onExecute={onExecute} onDebug={onDebug}
                            onApplyCorrectedCode={onApplyCorrectedCode} onInstallPackage={onInstallPackage}
                            onExplain={onExplain} // Truyền onExplain
                            expandedOutputs={expandedOutputs} onToggleOutputExpand={onToggleOutputExpand}
                            data-block-id={childBlock.id}
                        />
                    ))}
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
      <div className="top-bar">
         <h2>ᓚᘏᗢ</h2>
         <button
            onClick={onToggleSidebar}
            className="icon-button subtle settings-trigger-button"
            title="Mở Cài đặt"
            disabled={isBusy} // Disable cả nút settings khi bận
            aria-label="Mở cài đặt"
         >
            <FiSettings />
         </button>
      </div>
      <div className="interaction-container" ref={scrollRef}>
        {renderConversation()}
      </div>
      <UserInput prompt={prompt} setPrompt={setPrompt} onSend={() => onGenerate(prompt)} isLoading={isLoading} />
    </main>
  );
};
export default CenterArea;