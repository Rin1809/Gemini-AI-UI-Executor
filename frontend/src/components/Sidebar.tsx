// frontend/src/components/Sidebar.tsx
import React, { ChangeEvent } from 'react';
import { FiX, FiHeadphones } from 'react-icons/fi'; 
import SettingsPanel from './SettingsPanel';
import { ModelConfig } from '../App';
import './Sidebar.css'; 

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  modelConfig: ModelConfig;
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveSettings: () => void;
  isBusy: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  modelConfig,
  onConfigChange,
  onSaveSettings,
  isBusy,
}) => {

  return (
    <>
      {/* Overlay để click ra ngoài đóng sidebar. Hiện khi isOpen=true */}
      <div
         className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
         onClick={onClose}
         aria-hidden={!isOpen} 
       ></div>
      {/* Container chính của Sidebar */}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`} aria-label="Run settings sidebar">
        <div className="sidebar-header">
          <h3>Run settings</h3>
          <div>
             {}
             {}
             <button onClick={onClose} className="icon-button subtle close-sidebar-button" title="Close Settings" aria-label="Close settings">
               <FiX />
             </button>
          </div>
        </div>
        <div className="sidebar-content">
          {/* settingsPanel bỏ vào đây */}
          <SettingsPanel
            modelConfig={modelConfig}
            onConfigChange={onConfigChange}
            onSaveSettings={onSaveSettings}
            isDisabled={isBusy}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;