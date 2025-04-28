// frontend/src/components/SettingsPanel.tsx
import React, { ChangeEvent } from 'react';
import { FiSave, FiSettings, FiKey, FiAlertTriangle } from 'react-icons/fi'; // Import icons cần thiết
import './SettingsPanel.css';

// --- Props Interface ---
// Định nghĩa rõ các props cần thiết thay vì dùng ModelConfig đầy đủ
interface SettingsPanelProps {
  modelConfig: { modelName: string; temperature: number; topP: number; topK: number; safetySetting: string; };
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; // Hàm xử lý thay đổi input/select
  onSaveSettings: () => void; // Hàm lưu cài đặt (chỉ model name)
  isDisabled: boolean;        // Trạng thái disable các control
  // Props mới từ Sidebar
  runAsAdmin: boolean;        // Trạng thái checkbox "Run as Admin"
  uiApiKey: string;           // Giá trị API Key nhập trong UI
  useUiApiKey: boolean;       // Cờ cho biết đang dùng key UI hay không
  onApplyUiApiKey: () => void; // Hàm xử lý khi nhấn "Use This Key"
  onUseEnvKey: () => void;     // Hàm xử lý khi nhấn "Use .env Key"
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
}) => {
  return (
    <div className="settings-panel">
      <div className="settings-content">
        {/* --- Cấu hình Model --- */}
        <div className="settings-section">
          <label htmlFor="modelName">Model</label>
          <div className="model-select-group">
            {/* Input cho tên model */}
            <input
              type="text" id="modelName" name="modelName"
              value={modelConfig.modelName} onChange={onConfigChange}
              disabled={isDisabled} placeholder="Ví dụ: gemini-1.5-flash"
              className="model-input"
            />
            {/* Nút lưu tên model */}
            <button
              onClick={onSaveSettings} disabled={isDisabled}
              className="save-button icon-button"
              title="Lưu lựa chọn model (lưu cục bộ)"
              aria-label="Lưu tên model"
            >
              <FiSave />
            </button>
          </div>
        </div>

        {/* --- Khu vực API Key --- */}
        <div className="settings-section api-key-section">
            {/* Label và icon */}
            <label htmlFor="uiApiKey"><FiKey />API Key</label>
            {/* Input nhập API Key */}
            <input
                type="password" // Kiểu password để ẩn key
                id="uiApiKey"
                name="uiApiKey" // Phải khớp với handler trong App.tsx
                value={uiApiKey}
                onChange={onConfigChange} // Dùng handler chung
                disabled={isDisabled}
                placeholder="Nhập API Key để dùng thay cho .env"
                className="api-key-input"
                autoComplete="new-password" // Tránh tự động điền
            />
            {/* Các nút hành động */}
            <div className="api-key-actions">
                 {/* Nút "Sử dụng Key này" */}
                 <button
                    onClick={onApplyUiApiKey}
                    // Disable nếu đang bận hoặc chưa nhập key
                    disabled={isDisabled || !uiApiKey.trim()}
                    className="api-action-button apply-key"
                    title="Sử dụng key đã nhập ở trên cho các yêu cầu API"
                 >
                    Sử dụng Key Này
                 </button>
                 {/* Nút "Sử dụng Key .env" */}
                 <button
                    onClick={onUseEnvKey}
                    // Disable nếu đang bận hoặc đang không dùng key UI
                    disabled={isDisabled || !useUiApiKey}
                    className="api-action-button use-env-key"
                    title="Sử dụng GOOGLE_API_KEY từ file .env (nếu có ở backend)"
                 >
                    Sử dụng Key .env
                 </button>
            </div>
            {/* Hiển thị trạng thái key đang sử dụng */}
            {useUiApiKey ? (
                 <span className="api-key-status">Đang dùng API Key từ ô nhập này</span>
            ) : (
                 <span className="api-key-status faded">Đang dùng API Key từ .env (nếu có)</span>
            )}
            {/* Ghi chú */}
            <p className="api-key-note">Key chỉ được gửi tới backend cục bộ cho các lệnh gọi API liên quan. Không lưu trữ.</p>
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

        {/* --- Cài đặt nâng cao (Safety, Run as Admin) --- */}
        <div className="settings-section advanced-settings-section">
          <h4><FiSettings/> Cài đặt Nâng cao</h4>
          {/* Chọn mức độ an toàn */}
          <label htmlFor="safetySetting">Cài đặt an toàn</label>
          <select id="safetySetting" name="safetySetting" value={modelConfig.safetySetting} onChange={onConfigChange} disabled={isDisabled} >
            <option value="BLOCK_NONE">BLOCK_NONE (Rủi ro)</option>
            <option value="BLOCK_ONLY_HIGH">BLOCK_ONLY_HIGH</option>
            <option value="BLOCK_MEDIUM_AND_ABOVE">BLOCK_MEDIUM_AND_ABOVE (Mặc định)</option>
            <option value="BLOCK_LOW_AND_ABOVE">BLOCK_LOW_AND_ABOVE</option>
          </select>

          {/* Checkbox "Run as Admin" */}
          <div className="admin-checkbox-container">
             <input
               type="checkbox"
               id="runAsAdmin"
               name="runAsAdmin" // Phải khớp với handler trong App.tsx
               checked={runAsAdmin}
               onChange={onConfigChange} // Dùng handler chung
               disabled={isDisabled}
               className="admin-checkbox"
             />
             {/* Label cho checkbox */}
            <label htmlFor="runAsAdmin" className="admin-checkbox-label">
              <FiAlertTriangle className="warning-icon" /> Chạy mã với quyền Admin/Root
            </label>
          </div>
          {/* Cảnh báo về Run as Admin */}
          <p className="admin-warning-note">
              Cực kỳ nguy hiểm! Chỉ sử dụng nếu bạn hiểu hoàn toàn mã và rủi ro. Có thể yêu cầu tiến trình backend phải được khởi động với quyền admin/root. Hiệu quả phụ thuộc vào HĐH và quyền của backend.
          </p>
        </div>
      </div>
    </div>
  );
};
export default SettingsPanel;