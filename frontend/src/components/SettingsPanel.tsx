// frontend/src/components/SettingsPanel.tsx
import React, { ChangeEvent, CSSProperties } from 'react';
import { FiSave, FiSettings, FiKey, FiAlertTriangle, FiGlobe, FiFileText, FiSliders, FiShield } from 'react-icons/fi';
import { TargetOS } from '../App';
import './SettingsPanel.css';

// --- Props Interface ---
interface SettingsPanelProps {
  modelConfig: { modelName: string; temperature: number; topP: number; topK: number; safetySetting: string; };
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveSettings: () => void;
  isDisabled: boolean;
  runAsAdmin: boolean;
  uiApiKey: string;
  useUiApiKey: boolean;
  onApplyUiApiKey: () => void;
  onUseEnvKey: () => void;
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
  runAsAdmin,
  uiApiKey,
  useUiApiKey,
  onApplyUiApiKey,
  onUseEnvKey,
  targetOs,
  fileType,
  customFileName,
}) => {

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
  const isCustomFile = fileType === 'other';

  // Helper function to create style object for staggering
  const getSectionStyle = (index: number): CSSProperties => ({
      '--section-index': index,
  } as CSSProperties);


  return (
    <div className="settings-panel">
      <div className="settings-content">

        {/* --- Cấu hình Model (Index 0) --- */}
        <div className="settings-section" style={getSectionStyle(0)}>
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
              title="Lưu các lựa chọn (Model, OS, File Type)"
              aria-label="Lưu cài đặt"
            >
              <FiSave />
            </button>
          </div>
        </div>

        {/* --- Khu vực API Key (Index 1) --- */}
        <div className="settings-section api-key-section" style={getSectionStyle(1)}>
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

        {/* --- Các tham số sinh code (Index 2) --- */}
        <div className="settings-section parameter-section" style={getSectionStyle(2)}>
          <label htmlFor="temperature"><FiSliders /> Tham số Sinh mã</label> {/* Label chung */}
          {/* Subsection cho Temperature */}
          <div className="settings-subsection">
              <label htmlFor="temperature">Temperature</label>
              <div className="slider-container">
                <input type="range" id="temperature" name="temperature" min="0" max="1" step="0.01" value={modelConfig.temperature} onChange={onConfigChange} disabled={isDisabled} />
                <span className="slider-value">{modelConfig.temperature.toFixed(2)}</span>
              </div>
          </div>
           {/* Subsection cho Top P */}
          <div className="settings-subsection">
              <label htmlFor="topP">Top P</label>
              <div className="slider-container">
                <input type="range" id="topP" name="topP" min="0" max="1" step="0.01" value={modelConfig.topP} onChange={onConfigChange} disabled={isDisabled} />
                <span className="slider-value">{modelConfig.topP.toFixed(2)}</span>
              </div>
          </div>
          {/* Subsection cho Top K */}
          <div className="settings-subsection">
              <label htmlFor="topK">Top K</label>
              <input type="number" id="topK" name="topK" min="1" step="1" value={modelConfig.topK} onChange={onConfigChange} disabled={isDisabled} className="topk-input" />
          </div>
        </div>

         {/* --- Chọn HĐH & Loại File (Index 3) --- */}
         <div className="settings-section target-environment-section" style={getSectionStyle(3)}>
           <h4><FiGlobe /> Môi trường Mục tiêu</h4>
           {/* Dropdown Hệ điều hành */}
           <label htmlFor="targetOs">Hệ điều hành Mục tiêu</label>
           <select id="targetOs" name="targetOs" value={targetOs} onChange={onConfigChange} disabled={isDisabled}>
              <option value="auto">Tự động</option>
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
              <option value="macos">macOS</option>
           </select>
            {/* Dropdown Loại File */}
           <label htmlFor="fileType"><FiFileText /> Loại File Thực thi</label>
           <select id="fileType" name="fileType" value={fileType} onChange={onConfigChange} disabled={isDisabled}>
             {suggestedTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
             ))}
           </select>

            {/* Custom File Name Input Area (Animation riêng, không cần style index) */}
            <div className={`custom-file-input-container ${isCustomFile ? 'expanded' : ''}`}>
                <label htmlFor="customFileName">Tên File Tùy chỉnh</label>
                <input
                    type="text" id="customFileName" name="customFileName"
                    value={customFileName} onChange={onConfigChange}
                    disabled={isDisabled || !isCustomFile}
                    placeholder="Ví dụ: my_script.js hoặc data.json"
                    className="custom-file-input"
                    aria-hidden={!isCustomFile}
                    tabIndex={isCustomFile ? 0 : -1}
                 />
                 <p className="custom-file-note">Nhập tên file đầy đủ hoặc chỉ phần mở rộng (ví dụ: `.txt`). Backend sẽ cố gắng thực thi nó.</p>
             </div>

            <p className="target-env-note">
                Lựa chọn này sẽ hướng dẫn AI tạo code phù hợp và cách backend thực thi code.
            </p>
         </div>

        {/* --- Cài đặt nâng cao (Index 4) --- */}
        <div className="settings-section advanced-settings-section" style={getSectionStyle(4)}>
           <h4><FiSettings/> Cài đặt Khác</h4>
            {/* Dropdown Lọc an toàn */}
           <label htmlFor="safetySetting"><FiShield /> Lọc Nội dung An toàn</label>
           <select id="safetySetting" name="safetySetting" value={modelConfig.safetySetting} onChange={onConfigChange} disabled={isDisabled} >
             <option value="BLOCK_NONE">Không chặn (Rủi ro cao)</option>
             <option value="BLOCK_ONLY_HIGH">Chặn mức Cao</option>
             <option value="BLOCK_MEDIUM_AND_ABOVE">Chặn mức Trung bình+ (Mặc định)</option>
             <option value="BLOCK_LOW_AND_ABOVE">Chặn mức Thấp+</option>
           </select>
            {/* Checkbox Run as Admin */}
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
               Cẩn trọng! Chỉ bật nếu bạn hiểu rõ mã nguồn sẽ được thực thi. Backend cũng cần được chạy với quyền tương ứng.
           </p>
        </div>
      </div>
    </div>
  );
};
export default SettingsPanel;