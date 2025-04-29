// frontend/src/components/Sidebar.tsx
import React, { ChangeEvent } from 'react';
import { FiX } from 'react-icons/fi'; // Icon đóng sidebar
import SettingsPanel from './SettingsPanel';
import { ModelConfig, TargetOS } from '../App'; // Import TargetOS
import './Sidebar.css';

// --- Props Interface ---
interface SidebarProps {
  isOpen: boolean;              // Trạng thái mở/đóng
  onClose: () => void;          // Hàm xử lý khi đóng sidebar
  modelConfig: ModelConfig;     // Dữ liệu cấu hình model
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // Handler thay đổi config
  onSaveSettings: () => void;   // Handler lưu cài đặt
  isBusy: boolean;              // Trạng thái bận của ứng dụng
  // Props cho SettingsPanel (truyền xuống)
  runAsAdmin: boolean;
  uiApiKey: string;
  useUiApiKey: boolean;
  onApplyUiApiKey: () => void;
  onUseEnvKey: () => void;
  // Add new props for target environment
  targetOs: TargetOS;
  fileType: string;
  customFileName: string;
}
// ---------------------

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  modelConfig,
  onConfigChange,
  onSaveSettings,
  isBusy,
  // Destructure các props để truyền xuống SettingsPanel
  runAsAdmin,
  uiApiKey,
  useUiApiKey,
  onApplyUiApiKey,
  onUseEnvKey,
  // Destructure new props
  targetOs,
  fileType,
  customFileName,
}) => {

  return (
    <>
      {/* Lớp phủ mờ phía sau sidebar khi mở */}
      <div
         className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
         onClick={onClose} // Click vào overlay cũng đóng sidebar
         aria-hidden={!isOpen} // Hỗ trợ accessibility
       ></div>
       {/* Container chính của sidebar */}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`} aria-label="Sidebar Settings">
        {/* Header của sidebar */}
        <div className="sidebar-header">
          <h3>ᓚᘏᗢ | Run Setting</h3>
          {/* Nút đóng sidebar */}
          <button onClick={onClose} className="icon-button subtle close-sidebar-button" title="Đóng Cài đặt" aria-label="Đóng cài đặt">
            <FiX />
          </button>
        </div>
        {/* Nội dung chính của sidebar (chứa SettingsPanel) */}
        <div className="sidebar-content">
          {/* Truyền tất cả các props cần thiết xuống SettingsPanel */}
          <SettingsPanel
            modelConfig={modelConfig}
            onConfigChange={onConfigChange}
            onSaveSettings={onSaveSettings}
            isDisabled={isBusy}
            // Truyền các props mới liên quan đến admin và API key
            runAsAdmin={runAsAdmin}
            uiApiKey={uiApiKey}
            useUiApiKey={useUiApiKey}
            onApplyUiApiKey={onApplyUiApiKey}
            onUseEnvKey={onUseEnvKey}
             // Pass new props down for target environment
            targetOs={targetOs}
            fileType={fileType}
            customFileName={customFileName}
          />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;