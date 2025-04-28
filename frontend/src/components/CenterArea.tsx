// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect } from 'react';
import { FiSettings, FiChevronUp } from 'react-icons/fi'; // Chỉ cần FiSettings ở đây
import UserInput from './UserInput';
// SettingsPanel không còn được import trực tiếp ở đây
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
import { ConversationBlock, ExecutionResult } from '../App'; // Import interfaces
import './CenterArea.css'; // CSS chính cho component này

// Interface Props cho CenterArea (đã cập nhật)
interface CenterAreaProps {
  conversation: Array<ConversationBlock>;
  isLoading: boolean; // Generate loading
  isBusy: boolean; // Trạng thái busy chung
  prompt: string;
  setPrompt: (value: string) => void;
  onGenerate: (prompt: string) => void;
  onReview: (codeToReview: string) => void;
  onExecute: (codeToExecute: string) => void;
  onDebug: (codeToDebug: string, executionResult: ExecutionResult) => void;
  onApplyCorrectedCode: (code: string) => void;
  // Props cho collapse/expand
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
  onToggleSidebar: () => void; // Prop để mở/đóng sidebar
}

// --- Component Chính CenterArea ---
const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand,
    onToggleSidebar // Lấy hàm toggle sidebar
  } = props;

  // Không cần state showSettings nữa
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // --- Scroll Effect --- (Giữ nguyên)
  useEffect(() => {
    if (scrollRef.current) {
        const scrollTarget = scrollRef.current;
        const newBlockElement = conversation.find(b => b.isNew) ? scrollTarget.querySelector('.interaction-block.newly-added:last-of-type') : null;
        const shouldScroll = newBlockElement !== null;

        if (shouldScroll) {
            const timer = setTimeout(() => {
                if (scrollTarget) {
                    scrollTarget.scrollTo({ top: scrollTarget.scrollHeight, behavior: 'smooth' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }
    isInitialMount.current = false;
  }, [conversation, expandedOutputs]);
  // ---------------------------

  const renderConversation = () => {
    const rounds: { userBlock: ConversationBlock; childrenBlocks: ConversationBlock[] }[] = [];
    let currentUserBlock: ConversationBlock | null = null;
    let currentRoundBlocks: ConversationBlock[] = [];

    for (const block of conversation) {
      if (block.type === 'user') {
        if (currentUserBlock) {
          rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
        }
        currentUserBlock = block;
        currentRoundBlocks = [];
      } else if (currentUserBlock) {
        currentRoundBlocks.push(block);
      } else {
        rounds.push({
            userBlock: { type: 'placeholder', data: null, id: `placeholder-${block.id}`, timestamp: block.timestamp },
            childrenBlocks: [block]
        });
      }
    }
    if (currentUserBlock) {
      rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
    }

    return rounds.map((round, index) => {
      const userBlockId = round.userBlock.id;
      const isPlaceholder = round.userBlock.type === 'placeholder';
      const isLastRound = index === rounds.length - 1;
      const isCollapsed = !isLastRound && !isPlaceholder && (collapsedStates[userBlockId] ?? false);

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
                          expandedOutputs={expandedOutputs}
                          onToggleOutputExpand={onToggleOutputExpand}
                      />
                  ))}
              </div>
          );
      }
      else if (isCollapsed) {
        return (
          <CollapsedInteractionBlock
            key={userBlockId}
            promptText={round.userBlock.data}
            blockId={userBlockId}
            timestamp={round.userBlock.timestamp}
            onToggleCollapse={onToggleCollapse}
          />
        );
      } else {
        return (
          <div key={userBlockId + '-expanded'} className="interaction-round expanded-round">
            <InteractionBlock
              key={userBlockId}
              block={round.userBlock}
              isBusy={isBusy}
              onReview={onReview}
              onExecute={onExecute}
              onDebug={onDebug}
              onApplyCorrectedCode={onApplyCorrectedCode}
              expandedOutputs={expandedOutputs}
              onToggleOutputExpand={onToggleOutputExpand}
            />
            {/* Đảm bảo class 'expanded' được thêm khi không collapsed */}
            <div className={`collapsible-content ${!isCollapsed ? 'expanded' : ''}`}>
              {round.childrenBlocks.map(childBlock => (
                <InteractionBlock
                  key={childBlock.id}
                  block={childBlock}
                  isBusy={isBusy}
                  onReview={onReview}
                  onExecute={onExecute}
                  onDebug={onDebug}
                  onApplyCorrectedCode={onApplyCorrectedCode}
                  expandedOutputs={expandedOutputs}
                  onToggleOutputExpand={onToggleOutputExpand}
                />
              ))}
               {!isLastRound && (
                    <div className="collapse-round-wrapper">
                        <button onClick={() => onToggleCollapse(userBlockId)} className="collapse-round-button">
                           <FiChevronUp /> Collapse section
                        </button>
                    </div>
               )}
            </div>
          </div>
        );
      }
    });
  };

  return (
    <main className="center-area-wrapper">
      {/* Thanh bar trên cùng mới */}
      <div className="top-bar">
         <h2>ᓚᘏᗢ</h2>
         <button
            onClick={onToggleSidebar} // Sử dụng hàm được truyền vào
            className="icon-button subtle settings-trigger-button"
            title="Show Settings"
            disabled={isBusy} // Có thể disable nút khi đang busy
         >
            <FiSettings />
         </button>
      </div>
      {}
      <div className="interaction-container" ref={scrollRef}>
        {renderConversation()}
      </div>
      <UserInput
        prompt={prompt} setPrompt={setPrompt}
        onSend={() => onGenerate(prompt)}
        isLoading={isLoading}
      />
    </main>
  );
};
export default CenterArea;