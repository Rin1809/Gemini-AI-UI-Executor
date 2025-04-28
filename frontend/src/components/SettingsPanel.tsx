// frontend/src/components/SettingsPanel.tsx
import React, { ChangeEvent } from 'react';
import { ModelConfig } from '../App';
import { FiSave, FiSettings } from 'react-icons/fi';
import './SettingsPanel.css';

interface SettingsPanelProps {
  modelConfig: ModelConfig;
  onConfigChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSaveSettings: () => void;
  isDisabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  modelConfig, onConfigChange, onSaveSettings, isDisabled,
}) => {
  return (
    <div className="settings-panel">
      <div className="settings-content">
        <div className="settings-section">
            <label htmlFor="modelName">Model</label>
            <div className="model-select-group">
                <input type="text" id="modelName" name="modelName" value={modelConfig.modelName} onChange={onConfigChange} disabled={isDisabled} placeholder="e.g., gemini-1.5-pro" className="model-input"/>
                <button onClick={onSaveSettings} disabled={isDisabled} className="save-button icon-button" title="Save model name"><FiSave /></button>
            </div>
        </div>
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
         <div className="settings-section advanced-settings-section">
            <h4><FiSettings/> Advanced Settings</h4>
            <label htmlFor="safetySetting">Safety settings</label>
            <select id="safetySetting" name="safetySetting" value={modelConfig.safetySetting} onChange={onConfigChange} disabled={isDisabled} >
                <option value="BLOCK_NONE">BLOCK_NONE (Risky)</option>
                <option value="BLOCK_ONLY_HIGH">BLOCK_ONLY_HIGH</option>
                <option value="BLOCK_MEDIUM_AND_ABOVE">BLOCK_MEDIUM_AND_ABOVE</option>
                <option value="BLOCK_LOW_AND_ABOVE">BLOCK_LOW_AND_ABOVE</option>
            </select>
             <label>Add stop sequence</label>
             <input type="text" placeholder="Add stop..." disabled={isDisabled}/>
         </div>
      </div>
    </div>
  );
};
export default SettingsPanel;