import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../components/Chat';
import { FiArrowLeft } from 'react-icons/fi';
import type { Model } from '../types/chat';
import './Settings.css';

export function SettingsPage() {
  const navigate = useNavigate();
  const { selectedModel, setSelectedModel } = useChatContext();
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <h1>设置</h1>
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <h2>基础设置</h2>

          <div className="setting-item">
            <label>对话模型</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as Model)}
            >
              <option value="claude">Claude</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-mini">GPT-4 Mini</option>
            </select>
          </div>

          <div className="setting-item">
            <label>暗色模式(未实现)</label>
            <div className="toggle">
              <input
                type="checkbox"
                id="dark-mode-toggle"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <label htmlFor="dark-mode-toggle" className="toggle-label" />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>关于</h2>
          <div className="about-content">
            <h3>UI-TARS Demo</h3>
            <p>Version 1.0.0</p>
            <p>© 2024 Project S Team</p>
          </div>
        </div>
      </div>
    </div>
  );
}
