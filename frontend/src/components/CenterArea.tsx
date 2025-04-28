// frontend/src/components/CenterArea.tsx
import React, { useRef, useEffect } from 'react';
import { FiSettings, FiChevronUp, FiChevronDown } from 'react-icons/fi'; // Đảm bảo import FiChevronDown nếu dùng trong CollapsedInteractionBlock
import UserInput from './UserInput';
import InteractionBlock from './InteractionBlock';
import CollapsedInteractionBlock from './CollapsedInteractionBlock';
import { ConversationBlock, ExecutionResult } from '../App';
import './CenterArea.css';

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
  collapsedStates: Record<string, boolean>;
  onToggleCollapse: (id: string) => void;
  expandedOutputs: Record<string, { stdout: boolean; stderr: boolean }>;
  onToggleOutputExpand: (blockId: string, type: 'stdout' | 'stderr') => void;
  onToggleSidebar: () => void;
}

const CenterArea: React.FC<CenterAreaProps> = (props) => {
  const {
    conversation, isLoading, isBusy,
    prompt, setPrompt, onGenerate, onReview, onExecute, onDebug, onApplyCorrectedCode,
    collapsedStates, onToggleCollapse, expandedOutputs, onToggleOutputExpand,
    onToggleSidebar
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Scroll Effect ---
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTarget = scrollRef.current;
      // Tìm block MỚI NHẤT có cờ isNew để cuộn tới
      const newBlock = conversation.slice().reverse().find(b => b.isNew);

      if (newBlock) {
          const newElementInView = scrollTarget.querySelector(`[data-block-id="${newBlock.id}"]`);

          if (newElementInView) {
              const timer = setTimeout(() => {
                  if (scrollTarget && newElementInView) {
                      // Tính toán vị trí cuộn để block mới nằm gần cuối view
                      const elementTop = (newElementInView as HTMLElement).offsetTop;
                      const elementHeight = newElementInView.clientHeight;
                      const containerHeight = scrollTarget.clientHeight;
                      // Scroll đến vị trí dưới cùng của element mới + chút padding
                      const scrollTo = elementTop + elementHeight - containerHeight + 50; // +50 padding

                      scrollTarget.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
                  }
              }, 100); // Delay nhỏ để chờ DOM update và animation CSS
              return () => clearTimeout(timer);
          }
       }
       // Không scroll nếu không có block mới hoặc user đang scroll thủ công
    }
  }, [conversation]); // Chỉ phụ thuộc vào conversation để trigger scroll khi có block mới


  const renderConversation = () => {
    const rounds: { userBlock: ConversationBlock; childrenBlocks: ConversationBlock[] }[] = [];
    let currentUserBlock: ConversationBlock | null = null;
    let currentRoundBlocks: ConversationBlock[] = [];

    for (const block of conversation) {
        if (block.type === 'user') {
            // Nếu đã có user block trước đó, hoàn thành round cũ
            if (currentUserBlock) {
                rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
            }
            // Bắt đầu round mới
            currentUserBlock = block;
            currentRoundBlocks = []; // Reset block con cho round mới
        } else if (currentUserBlock) {
            // Thêm block con vào round hiện tại
            currentRoundBlocks.push(block);
        } else {
            // Xử lý các block không có user prompt trước đó (vd: lỗi ban đầu)
            rounds.push({
                // Tạo một "placeholder" user block để nhóm các block con này lại
                userBlock: { type: 'placeholder', data: null, id: `placeholder-${block.id}`, timestamp: block.timestamp, isNew: block.isNew },
                childrenBlocks: [block] // Chỉ chứa block hiện tại
            });
             // Đảm bảo các block tiếp theo không bị nhóm vào placeholder này
             // Không reset currentUserBlock ở đây vì có thể block tiếp theo là user
        }
    }
    // Đảm bảo round cuối cùng được thêm vào
    if (currentUserBlock) {
        rounds.push({ userBlock: currentUserBlock, childrenBlocks: currentRoundBlocks });
    }


    return rounds.map((round, index) => {
      const userBlockId = round.userBlock.id;
      const isPlaceholder = round.userBlock.type === 'placeholder';
      const isLastRound = index === rounds.length - 1;
      // Mặc định collapse các round cũ, không collapse round cuối và placeholder
      const isCollapsed = !isLastRound && !isPlaceholder && (collapsedStates[userBlockId] ?? true);

      // Render các block không thuộc round nào (ví dụ lỗi ban đầu)
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
                           data-block-id={childBlock.id} // Pass id for scrolling
                       />
                   ))}
               </div>
           );
       }

      // Render một round bình thường (có user prompt)
      return (
          <div key={userBlockId + '-round'} className={`interaction-round ${isCollapsed ? 'collapsed-round' : 'expanded-round'}`}>
              {/* Luôn render phần header: Hoặc là summary, hoặc là full user block */}
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
                      // Các hàm callback không cần thiết cho user block
                      onReview={() => {}}
                      onExecute={() => {}}
                      onDebug={() => {}}
                      onApplyCorrectedCode={() => {}}
                      expandedOutputs={{}}
                      onToggleOutputExpand={() => {}}
                      data-block-id={round.userBlock.id} // Pass id for scrolling
                  />
              )}

              {/* ---->>> Luôn render container này <<<---- */}
              <div className={`collapsible-content ${isCollapsed ? '' : 'expanded'}`}>
                  {/* Render nội dung bên trong (AI, exec, review, debug) */}
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
                          data-block-id={childBlock.id} // Pass id for scrolling
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
        isLoading={isLoading}
      />
    </main>
  );
};
export default CenterArea;