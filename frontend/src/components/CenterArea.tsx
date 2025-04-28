// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect, useState, ChangeEvent } from 'react';
import { FiSend, FiCode, FiPlay, FiEye, FiAlertTriangle, FiTool, FiCheckCircle, FiLoader, FiUser, FiCopy, FiDownload, FiSettings, FiX, FiChevronUp } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ConversationBlock, ModelConfig, ExecutionResult } from '../App'; // Import ConversationBlock
import UserInput from './UserInput';
import SettingsPanel from './SettingsPanel';
import InteractionBlock from './InteractionBlock'; // Import component block đầy đủ
import CollapsedInteractionBlock from './CollapsedInteractionBlock'; // Import component thu gọn
import { toast } from 'react-toastify';
import './CenterArea.css';


// Interface Props cho CenterArea
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
  // Props mới
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
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({}); // Ref cho content để tính chiều cao

  // Scroll to bottom on new message or loading state change
  useEffect(() => {
    if (scrollRef.current) {
        // Delay slightly to allow DOM updates
        const timer = setTimeout(() => {
            if (scrollRef.current) {
                 scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 50);
        return () => clearTimeout(timer); // Cleanup timer
    }
}, [conversation, isLoading]); // Trigger on conversation change or loading

// --- Animate Collapsible Content Height ---
useEffect(() => {
    Object.keys(contentRefs.current).forEach(key => {
      const element = contentRefs.current[key];
      const isUserBlock = conversation.find(b => b.id === key)?.type === 'user';
      if (element && isUserBlock) { // Chỉ animate cho user block rounds
        const isCollapsed = collapsedStates[key] ?? false;
        // Force reflow before changing max-height for smooth transition
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = element.offsetHeight;

        if (!isCollapsed) {
           element.style.maxHeight = element.scrollHeight + "px";
           element.style.opacity = '1';
           element.style.marginTop = 'var(--spacing-unit)'; // Reset margin-top
           element.style.paddingTop = 'var(--spacing-unit)'; // Reset padding-top
        } else {
           element.style.maxHeight = "0px";
           element.style.opacity = '0';
           element.style.marginTop = '0';
           element.style.paddingTop = '0';
        }
      }
    });
}, [collapsedStates, conversation]); // Re-run when collapse state or conversation changes
// ---------------------------------------------------------


  const renderConversation = () => {
    // --- Logic gom rounds ---
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
         // Xử lý block lẻ không thuộc round nào
          rounds.push({ userBlock: { type: 'placeholder', data: null, id: block.id + '_placeholder', timestamp: block.timestamp || new Date().toISOString()}, childrenBlocks: [block] });
       }
     }
     if (currentUserBlock) rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
    // --- Kết thúc logic gom rounds ---


    return rounds.map((round, index) => {
      const userBlockId = round.userBlock.id;
      const isPlaceholder = round.userBlock.type === 'placeholder';
      // Round cuối cùng hoặc placeholder sẽ không bao giờ bị collapsed bởi logic tự động
      const isLastRound = index === rounds.length - 1;
      const isCollapsed = !isPlaceholder && !isLastRound && (collapsedStates[userBlockId] ?? false);

      if (isPlaceholder) {
         // Render các block lẻ không có user prompt
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
          return (
            <CollapsedInteractionBlock
              key={userBlockId}
              promptText={round.userBlock.data}
              blockId={userBlockId}
              timestamp={round.userBlock.timestamp} // Truyền timestamp
              onToggleCollapse={onToggleCollapse}
            />
          );
      } else {
        // Render Expanded Round
        return (
          <div key={userBlockId + "-round"} className="interaction-round expanded">
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
            {/* Container cho các block con (để animate) */}
            <div
              ref={el => contentRefs.current[userBlockId] = el} // Gán ref
              className={`collapsible-content ${isCollapsed ? 'collapsed' : 'expanded'}`}
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
               {/* Nút Collapse Round (Chỉ hiển thị nếu không phải round cuối cùng) */}
               {!isLastRound && (
                    <div className="collapse-round-wrapper">
                        <button
                            onClick={() => onToggleCollapse(userBlockId)}
                            className="collapse-round-button"
                            title="Collapse conversation round"
                        >
                           <FiChevronUp /> Collapse Section
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