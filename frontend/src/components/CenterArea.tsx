// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect, useState, ChangeEvent } from 'react';
import { FiSettings, FiX, FiChevronUp } from 'react-icons/fi'; // Icons cần thiết
// Các imports khác
import UserInput from './UserInput';
import SettingsPanel from './SettingsPanel';
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
import { ConversationBlock, ModelConfig, ExecutionResult, ReviewResult, DebugResult } from '../App';
import './CenterArea.css'; // Import CSS

// Interface Props (Đã bao gồm các props mới)
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
  modelConfig: ModelConfig;
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveSettings: () => void;
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
}

const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    modelConfig, onConfigChange, onSaveSettings,
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll Effect (Đã cập nhật dependencies)
  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
             scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
       return () => clearTimeout(timer);
    }
  }, [conversation, isLoading, expandedOutputs, collapsedStates]); // Thêm collapsedStates

  const renderConversation = () => {
    // Logic gom rounds
    const rounds: { userBlock: ConversationBlock; childrenBlocks: ConversationBlock[] }[] = [];
    let currentUserBlock: ConversationBlock | null = null;
    let currentRoundBlocks: ConversationBlock[] = [];
    for (const block of conversation) {
      if (block.type === 'user') {
        if (currentUserBlock) rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
        currentUserBlock = block;
        currentRoundBlocks = [];
      } else if (currentUserBlock) {
        currentRoundBlocks.push(block);
      } else {
         rounds.push({ userBlock: { type: 'placeholder', data: null, id: block.id + '_placeholder', timestamp: block.timestamp}, childrenBlocks: [block] });
      }
    }
    if (currentUserBlock) rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });

    // Render rounds
    return rounds.map((round, index) => {
      const userBlockId = round.userBlock.id;
      // Mặc định không collapse round cuối cùng
      const isLastRound = index === rounds.length - 1;
      const isCollapsed = (round.userBlock.type !== 'placeholder' && !isLastRound) ? (collapsedStates[userBlockId] ?? false) : false;

      if (round.userBlock.type === 'placeholder') {
         // Render block lẻ (nếu có)
         return (
             <React.Fragment key={userBlockId + "-frag"}>
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
             </React.Fragment>
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
          // Key quan trọng cho React nhận biết thay đổi để CSS transition hoạt động
          <div key={userBlockId + '-expanded'}
               className="interaction-round expanded-round">
            {/* User Block Header */}
            <InteractionBlock
              key={userBlockId}
              block={round.userBlock}
              isBusy={isBusy} // Không cần isBusy ở đây nữa nếu user block chỉ là header
              onReview={onReview} // Không cần các action handler ở user block
              onExecute={onExecute}
              onDebug={onDebug}
              onApplyCorrectedCode={onApplyCorrectedCode}
              expandedOutputs={expandedOutputs} // Không cần thiết ở user block
              onToggleOutputExpand={onToggleOutputExpand} // Không cần thiết ở user block
            />
            {/* Container cho các block con (Animation bằng CSS) */}
            <div
              className={`collapsible-content ${isCollapsed ? 'collapsed' : 'expanded'}`} // Class 'expanded' được thêm khi không collapsed
            >
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
               {/* Nút Collapse Round ở cuối (chỉ hiển thị nếu không phải round cuối) */}
               {!isLastRound && (
                    <div className="collapse-round-wrapper">
                        <button
                            onClick={() => onToggleCollapse(userBlockId)}
                            className="collapse-round-button"
                            title="Collapse conversation round"
                        >
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