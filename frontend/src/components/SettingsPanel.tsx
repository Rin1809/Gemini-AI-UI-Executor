// frontend/src/components/SettingsPanel.tsx
import React, { ChangeEvent } from 'react';
// Import FiGlobe or similar for Target Environment section
import { FiSave, FiSettings, FiKey, FiAlertTriangle, FiGlobe, FiFileText } from 'react-icons/fi';
import { TargetOS } from '../App'; // Import TargetOS type
import './SettingsPanel.css';

// --- Props Interface ---
interface SettingsPanelProps {
  modelConfig: { modelName: string; temperature: number; topP: number; topK: number; safetySetting: string; };
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // Hàm xử lý thay đổi input/select
  onSaveSettings: () => void; // Hàm lưu cài đặt
  isDisabled: boolean;        // Trạng thái disable các control
  // Props mới từ Sidebar
  runAsAdmin: boolean;        // Trạng thái checkbox "Run as Admin"
  uiApiKey: string;           // Giá trị API Key nhập trong UI
  useUiApiKey: boolean;       // Cờ cho biết đang dùng key UI hay không
  onApplyUiApiKey: () => void; // Hàm xử lý khi nhấn "Use This Key"
  onUseEnvKey: () => void;     // Hàm xử lý khi nhấn "Use .env Key"
  // Add new props for target environment
  targetOs: TargetOS;
  fileType: string;
  customFileName: string;
}
// ----------------------

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  modelConfig,
  onConfigChange,
  onSaveSettings,
  isDisabled,
  // Destructure props mới
  runAsAdmin,
  uiApiKey,
  useUiApiKey,
  onApplyUiApiKey,
  onUseEnvKey,
   // Destructure new props for target environment
  targetOs,
  fileType,
  customFileName,
}) => {

    // --- OS ---
    const getSuggestedFileTypes = (os: TargetOS): { value: string; label: string }[] => {
      switch (os) {
        case 'windows':
          return [
            { value: 'bat', label: '.bat (Batch Script)' },
            { value: 'ps1', label: '.ps1 (PowerShell)' },
            { value: 'py', label: '.py (Python Script)' },
            { value: 'other', label: 'Tên khác...' },
          ];
        case 'linux':
        case 'macos':
          return [
            { value: 'sh', label: '.sh (Shell Script)' },
            { value: 'py', label: '.py (Python Script)' },
            { value: 'other', label: 'Tên khác...' },
          ];
        case 'auto': 
        default:
          return [
             { value: 'py', label: '.py (Python Script)' },
             { value: 'sh', label: '.sh (Shell Script)' },
             { value: 'bat', label: '.bat (Batch Script)' },
             { value: 'ps1', label: '.ps1 (PowerShell)' },
             { value: 'other', label: 'Tên khác...' },
          ];
      }
    };

    const suggestedTypes = getSuggestedFileTypes(targetOs);


  return (
    <div className="settings-panel">
      <div className="settings-content">
        {/* --- Cấu hình Model --- */}
        <div className="settings-section">
          <label htmlFor="modelName">Model</label>
          <div className="model-select-group">
            <input
              type="text" id="modelName" name="modelName"
              value={modelConfig.modelName} onChange={onConfigChange}
              disabled={isDisabled} placeholder="Ví dụ: gemini-1.5-flash"
              className="model-input"
            />
            <button
              onClick={onSaveSettings} disabled={isDisabled}
              className="save-button icon-button"
              title="Lưu các lựa chọn (Model, OS, File Type)" // Update tooltip
              aria-label="Lưu cài đặt"
            >
              <FiSave />
            </button>
          </div>
        </div>

        {/* --- Khu vực API Key --- */}
        <div className="settings-section api-key-section">
            <label htmlFor="uiApiKey"><FiKey /> API Key (Tùy chọn)</label>
            <input
                type="password" id="uiApiKey" name="uiApiKey"
                value={uiApiKey} onChange={onConfigChange}
                disabled={isDisabled}
                placeholder="Nhập API Key để dùng thay cho .env"
                className="api-key-input" autoComplete="new-password"
            />
            <div className="api-key-actions">
                 <button onClick={onApplyUiApiKey} disabled={isDisabled || !uiApiKey.trim()}
                    className="api-action-button apply-key"
                    title="Sử dụng key đã nhập ở trên cho các yêu cầu API" >
                    Sử dụng Key Này
                 </button>
                 <button onClick={onUseEnvKey} disabled={isDisabled || !useUiApiKey}
                    className="api-action-button use-env-key"
                    title="Sử dụng GOOGLE_API_KEY từ file .env (nếu có ở backend)" >
                    Sử dụng Key .env
                 </button>
            </div>
            {useUiApiKey ? (
                 <span className="api-key-status">Đang dùng API Key từ ô nhập này</span>
            ) : (
                 <span className="api-key-status faded">Đang dùng API Key từ .env (nếu set)</span>
            )}
            <p className="api-key-note">Key chỉ được gửi tới backend cục bộ. Không lưu trữ.</p>
        </div>


        {/* --- Các tham số sinh code (Temperature, Top P, Top K) --- */}
        <div className="settings-section parameter-section">
          <label htmlFor="temperature">Temperature</label>
          <div className="slider-container">
            <input type="range" id="temperature" name="temperature" min="0" max="1" step="0.01" value={modelConfig.temperature} onChange={onConfigChange} disabled={isDisabled} />
            <span className="slider-value">{modelConfig.temperature.toFixed(2)}</span>
          </div>
        </div>
        <div className="settings-section parameter-section">
          <label htmlFor="topP">Top P</label>
          <div className="slider-container">
            <input type="range" id="topP" name="topP" min="0" max="1" step="0.01" value={modelConfig.topP} onChange={onConfigChange} disabled={isDisabled} />
            <span className="slider-value">{modelConfig.topP.toFixed(2)}</span>
          </div>
        </div>
        <div className="settings-section parameter-section">
          <label htmlFor="topK">Top K</label>
          <input type="number" id="topK" name="topK" min="1" step="1" value={modelConfig.topK} onChange={onConfigChange} disabled={isDisabled} className="topk-input" />
        </div>

         {/* --- Chọn HĐH --- */}
         <div className="settings-section target-environment-section">
           <h4><FiGlobe /> Môi trường Mục tiêu</h4>
           
           <label htmlFor="targetOs">Hệ điều hành Mục tiêu</label>
           <select id="targetOs" name="targetOs" value={targetOs} onChange={onConfigChange} disabled={isDisabled}>
             <option value="auto">Tự động check</option>
             <option value="windows">Windows</option>
             <option value="linux">Linux</option>
             <option value="macos">macOS</option>
           </select>

           {/* File Type Selection */}
           <label htmlFor="fileType"><FiFileText /> Loại File Thực thi</label>
           <select id="fileType" name="fileType" value={fileType} onChange={onConfigChange} disabled={isDisabled}>
             {suggestedTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
             ))}
           </select>

            {/* Khu nhập file extention */}
            {fileType === 'other' && (
                <div className="custom-file-input-container">
                    <label htmlFor="customFileName">Tên File Tùy chỉnh</label>
                    <input
                        type="text" id="customFileName" name="customFileName"
                        value={customFileName} onChange={onConfigChange}
                        disabled={isDisabled}
                        placeholder="Ví dụ: ps1 / cpp / py"
                        className="custom-file-input"
                     />
                     <p className="custom-file-note">Nhập tên file đầy đủ. Backend sẽ cố gắng thực thi nó (ví dụ: dùng `bash` cho file không đuôi trên Linux/macOS).</p>
                 </div>
             )}

            <p className="target-env-note">
                Lựa chọn này sẽ hướng dẫn AI tạo code phù hợp và cách backend thực thi code.
            </p>
         </div>


        {/* --- Cài đặt nâng cao --- */}
        <div className="settings-section advanced-settings-section">
          <h4><FiSettings/> Cài đặt Khác</h4>
          <label htmlFor="safetySetting">Lọc Nội dung An toàn</label>
          <select id="safetySetting" name="safetySetting" value={modelConfig.safetySetting} onChange={onConfigChange} disabled={isDisabled} >
            <option value="BLOCK_NONE">BLOCK_NONE (Rủi ro)</option>
            <option value="BLOCK_ONLY_HIGH">BLOCK_ONLY_HIGH</option>
            <option value="BLOCK_MEDIUM_AND_ABOVE">BLOCK_MEDIUM_AND_ABOVE (Mặc định)</option>
            <option value="BLOCK_LOW_AND_ABOVE">BLOCK_LOW_AND_ABOVE</option>
          </select>

          {/* Run as Admin Checkbox */}
          <div className="admin-checkbox-container">
             <input type="checkbox" id="runAsAdmin" name="runAsAdmin"
               checked={runAsAdmin} onChange={onConfigChange}
               disabled={isDisabled} className="admin-checkbox"
             />
            <label htmlFor="runAsAdmin" className="admin-checkbox-label">
              <FiAlertTriangle className="warning-icon" /> Chạy với quyền Admin/Root
            </label>
          </div>
          <p className="admin-warning-note">
              Rủi ro! Chỉ bật nếu hiểu mã. Backend cần chạy với quyền tương ứng.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SettingsPanel;