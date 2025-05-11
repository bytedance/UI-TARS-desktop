import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsChat } from 'react-icons/bs';

export function HomePage(): JSX.Element {
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!input.trim()) return;

    // 通过 URL 参数传递初始消息
    const params = new URLSearchParams({
      message: input,
    });
    navigate(`/chat?${params.toString()}`);
  };

  const handleQuickAction = (content: string): void => {
    // 快捷操作也使用相同的参数传递方式
    const params = new URLSearchParams({
      message: content,
    });
    navigate(`/chat?${params.toString()}`);
  };

  // 添加直接进入 Chat 的处理函数
  const handleDirectChat = (): void => {
    navigate('/chat');
  };

  return (
    <div className="app-home">
      <div className="home-page">
        <h1>我能帮你完成什么?</h1>
        <form onSubmit={handleSubmit} className="task-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题..."
            autoFocus
          />
          <div className="buttons">
            <button
              type="button"
              onClick={handleDirectChat}
              className="direct-chat-btn"
              title="直接开始聊天"
            >
              <BsChat />
            </button>
          </div>
        </form>

        <div className="quick-actions">
          <button className="action-btn" onClick={() => handleQuickAction('你好！')}>
            <span className="icon">👋</span>
            打个招呼
          </button>
          <button className="action-btn" onClick={() => handleQuickAction('UI-TARS 能做什么？')}>
            <span className="icon">🤖</span>
            关于 UI-TARS
          </button>
          <button
            className="action-btn"
            onClick={() => handleQuickAction('请帮我解释一下什么是视觉语言模型')}
          >
            <span className="icon">👁️</span>
            什么是视觉语言模型
          </button>
          <button
            className="action-btn"
            onClick={() => handleQuickAction('帮我推荐几个好用的前端工具')}
          >
            <span className="icon">🛠️</span>
            前端工具推荐
          </button>
        </div>
      </div>
    </div>
  );
}
