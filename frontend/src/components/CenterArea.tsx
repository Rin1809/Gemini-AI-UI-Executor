// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect, useState, ChangeEvent } from 'react';
import { FiSettings, FiX, FiChevronUp } from 'react-icons/fi';
import UserInput from './UserInput';
import SettingsPanel from './SettingsPanel';
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
import { ConversationBlock, ModelConfig, ExecutionResult } from '../App'; // Import interfaces
import './CenterArea.css'; // CSS chính cho component này

// Interface Props cho CenterArea
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
  modelConfig: ModelConfig;
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveSettings: () => void;
  // Props cho collapse/expand
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
}

// --- Component Chính CenterArea ---
const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    modelConfig, onConfigChange, onSaveSettings,
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true); // Cờ để tránh scroll khi mount lần đầu

  // --- Scroll Effect ---
  useEffect(() => {
    if (scrollRef.current) {
        const scrollTarget = scrollRef.current;

        // Tìm block mới nhất có isNew=true (nếu có)
        const newBlockElement = conversation.find(b => b.isNew) ? scrollTarget.querySelector('.interaction-block.newly-added:last-of-type') : null;

        // Chỉ scroll khi có block mới hoặc output được expand/collapse gần cuối màn hình
        const shouldScroll = newBlockElement !== null; // || isOutputToggleNearBottom(); // Logic kiểm tra output toggle có thể phức tạp

        if (shouldScroll) {
            const timer = setTimeout(() => {
                if (scrollTarget) {
                    scrollTarget.scrollTo({ top: scrollTarget.scrollHeight, behavior: 'smooth' });
                }
            }, 50); // Delay nhỏ cho render/animation
            return () => clearTimeout(timer);
        }
    }
    isInitialMount.current = false; // Đánh dấu đã mount xong
}, [conversation, expandedOutputs]); // Chạy khi conversation hoặc trạng thái output thay đổi
  // ---------------------------

  const renderConversation = () => {
    // Gom các block thành các "vòng" tương tác
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
        // Xử lý block lẻ không thuộc round nào (ví dụ lỗi ban đầu)
        rounds.push({
            userBlock: { type: 'placeholder', data: null, id: `placeholder-${block.id}`, timestamp: block.timestamp }, // Placeholder user block
            childrenBlocks: [block]
        });
      }
    }
    // Đẩy round cuối cùng vào
    if (currentUserBlock) {
      rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
    }

    // Render từng round
    return rounds.map((round, index) => {
      const userBlockId = round.userBlock.id;
      const isPlaceholder = round.userBlock.type === 'placeholder';
      const isLastRound = index === rounds.length - 1;
      // Một round được coi là collapsed nếu nó không phải round cuối VÀ state của nó là collapsed
      const isCollapsed = !isLastRound && !isPlaceholder && (collapsedStates[userBlockId] ?? false);

      if (isPlaceholder) {
          // Render các block lẻ
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
        // Render Collapsed Block
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
        // Render Expanded Round
        return (
          <div key={userBlockId + '-expanded'} className="interaction-round expanded-round">
            {/* User Block */}
            <InteractionBlock
              key={userBlockId}
              block={round.userBlock}
              isBusy={isBusy}
              onReview={onReview} // Có thể không cần thiết ở đây
              onExecute={onExecute}
              onDebug={onDebug}
              onApplyCorrectedCode={onApplyCorrectedCode}
              expandedOutputs={expandedOutputs}
              onToggleOutputExpand={onToggleOutputExpand}
            />
            {/* Container cho các block con (Animation bằng CSS) */}
            <div className={`collapsible-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
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
               {/* Nút Collapse Round ở cuối (chỉ khi không phải round cuối) */}
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
        <div className="main-header">
            <h2>Gemini Executor</h2>
            <button onClick={() => setShowSettings(!showSettings)} className="icon-button subtle settings-toggle-button" title={showSettings ? "Hide Settings" : "Show Settings"}>
                {showSettings ? <FiX /> : <FiSettings />}
            </button>
        </div>
         {showSettings && ( <SettingsPanel modelConfig={modelConfig} onConfigChange={onConfigChange} onSaveSettings={onSaveSettings} isDisabled={isBusy} /> )}
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