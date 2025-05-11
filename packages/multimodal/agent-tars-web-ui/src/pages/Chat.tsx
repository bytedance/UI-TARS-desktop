import { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Chat as ChatType, Message } from '@multimodal/ui';
import { useChatContext, ChatView } from '@multimodal/ui';
import { mockAgentService } from '../services/mockAgent';
import type { Model } from '../types/chat';
import type {
  AgentIntermediateState,
  AgentIntermediateBlock,
  AgentStep,
  ExtendedMessage,
} from '../types/chat';
import { Canvas } from '../components/Canvas/Canvas';
import { CanvasProvider, useCanvas } from '../components/Canvas/CanvasContext';
import Panel from '../components/Panel';
import { BiCube } from 'react-icons/bi';
import { FiTrash2 } from 'react-icons/fi';
import { FiSettings } from 'react-icons/fi';

import './Chat.css';

const LogoIcon = () => <BiCube />;

// 为 Canvas 定义的 Block 渲染组件
const BlockRenderer = ({ block, isActive, onClick }: any) => (
  <div className={`canvas-block ${isActive ? 'active' : ''}`} onClick={() => onClick(block.id)}>
    <h3>{block.title}</h3>
    <p>{block.type}</p>
  </div>
);

function ChatPageContent(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasBlocks, setCanvasBlocks] = useState<AgentIntermediateBlock[]>([]);
  const initialChatCreated = useRef(false);
  const initialMessage = searchParams.get('message');

  const { isCanvasVisible, setCanvasVisible } = useCanvas();

  const {
    chats,
    currentChat,
    setCurrentChat,
    selectedModel,
    setSelectedModel,
    saveChat,
    deleteChat,
  } = useChatContext();

  const createNewChat = (title = `新会话 ${chats.length + 1}`, model = selectedModel): ChatType => {
    const newChat: ChatType = {
      id: uuidv4(),
      title,
      messages: [],
      model,
      timestamp: Date.now(),
    };
    saveChat(newChat);
    setCurrentChat(newChat);
    return newChat;
  };

  const updateChatMessages = async (chatToUpdate: ChatType, messages: Message[]): Promise<void> => {
    const updatedChat = { ...chatToUpdate, messages };
    setCurrentChat(updatedChat);
    await saveChat(updatedChat);
  };

  const createMessage = (
    role: 'user' | 'assistant',
    content: string,
    options?: { type?: 'text' | 'steps'; steps?: AgentStep[] },
  ): ExtendedMessage => ({
    id: uuidv4(),
    role,
    content,
    timestamp: Date.now(),
    ...options,
  });

  useEffect(() => {
    // 如果没有初始消息且没有当前选择的对话，且存在对话记录，选择第一个
    if (!initialMessage && !currentChat && chats.length > 0) {
      setCurrentChat(chats[0]);
    } else if (!initialMessage && !currentChat && chats.length === 0) {
      // 如果没有对话记录，创建一个新对话
      createNewChat();
    }
  }, [chats, currentChat, initialMessage]);

  const handleIntermediateState = (state: AgentIntermediateState) => {
    if (state.type === 'error') {
      setError(state.content);
    } else if (state.type === 'canvas' && state.blocks) {
      // 显示 Canvas
      setCanvasBlocks(state.blocks);
      setCanvasVisible(true);
    } else if (state.type === 'steps' && state.steps) {
      // 创建一个步骤类型的消息
      if (currentChat) {
        const stepsMessage = createMessage('assistant', '任务执行中...', {
          type: 'steps',
          steps: state.steps,
        });

        // 更新消息列表，查找已有的步骤消息进行更新，或添加新消息
        setCurrentChat((prevChat) => {
          if (!prevChat) return prevChat;
          
          const updatedMessages = [...prevChat.messages];
          const existingStepMsgIndex = updatedMessages.findIndex(
            (msg) => (msg as ExtendedMessage).type === 'steps',
          );

          if (existingStepMsgIndex >= 0) {
            // 保留消息 ID，仅更新步骤内容
            updatedMessages[existingStepMsgIndex] = {
              ...updatedMessages[existingStepMsgIndex],
              steps: state.steps,
            };
          } else {
            // 添加新的步骤消息
            updatedMessages.push(stepsMessage);
          }
          
          const updatedChat = { ...prevChat, messages: updatedMessages };
          // 异步保存聊天记录
          saveChat(updatedChat).catch(console.error);
          return updatedChat;
        });
      }
    }
  };

  const handleMessage = async (
    message: string,
    chat: ChatType | null = null,
    model: Model = selectedModel,
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    // 每次新消息时重置 canvas 状态
    setCanvasVisible(false);

    try {
      // 如果没有传入 chat，创建一个新的
      const activeChat = chat || createNewChat(message.slice(0, 20) + '...', model);

      const userMessage = createMessage('user', message);
      const assistantMessage = createMessage('assistant', '');
      const newMessages = [...activeChat.messages, userMessage, assistantMessage];

      await updateChatMessages(activeChat, newMessages);

      let fullContent = '';

      // 使用 mockAgentService 代替真实服务
      await mockAgentService.streamChat(
        activeChat.model,
        newMessages.slice(0, -1).map((msg) => ({ role: msg.role, content: msg.content })),
        (chunk) => {
          fullContent += chunk;
          setCurrentChat((prev) => {
            if (!prev) return prev;
            const updatedMessages = prev.messages.map((msg) =>
              msg.id === assistantMessage.id ? { ...msg, content: fullContent } : msg,
            );
            updateChatMessages(prev, updatedMessages);
            return { ...prev, messages: updatedMessages };
          });
        },
        (error) => {
          setError(error.message);
          if (activeChat) {
            updateChatMessages(activeChat, activeChat.messages.slice(0, -1));
          }
        },
        {
          model: activeChat.model,
          onStateUpdate: handleIntermediateState,
        },
      );

      // 更新标题，仅在第一条消息时
      if (activeChat.messages.length <= 2) {
        const newTitle = message.length > 20 ? message.slice(0, 20) + '...' : message;

        const updatedChat = { ...activeChat, title: newTitle };
        await saveChat(updatedChat);
        setCurrentChat(updatedChat);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '发生了未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string): Promise<void> => {
    if (!currentChat) return;
    await handleMessage(content, currentChat);
  };

  // 处理初始消息
  useEffect(() => {
    const model = (searchParams.get('model') as Model) || 'claude';

    if (initialMessage && !initialChatCreated.current) {
      initialChatCreated.current = true;
      setSelectedModel(model);
      setSearchParams({});
      handleMessage(initialMessage, null, model);
    }
  }, [searchParams]);

  const handleDeleteChat = async (chatId: string): Promise<void> => {
    await deleteChat(chatId);
  };

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">💭</div>
      <h2>开始一个新对话</h2>
      <p>选择左侧的"新建对话"或输入消息开始聊天</p>
    </div>
  );

  return (
    <div className="app-chat">
      <div className="sidebar">
        <Link to="/" className="logo">
          <LogoIcon />
          Agent TARS
        </Link>
        <button onClick={() => createNewChat()} className="new-chat">
          新建对话
        </button>
        <div className="chat-list">
          {chats
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((chat) => (
              <div
                onClick={() => setCurrentChat(chat)}
                key={chat.id}
                className={`chat-item ${currentChat?.id === chat.id ? 'active' : ''}`}
              >
                <span className="chat-title">{chat.title}</span>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  title="删除会话"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-footer">
          <Link to="/settings" className="settings-link">
            <FiSettings />
            <span>设置</span>
          </Link>
        </div>
      </div>

      <div className={`main ${isCanvasVisible ? 'with-canvas' : ''}`}>
        {error && <div className="error-message">Error: {error}</div>}
        {currentChat ? (
          <ChatView chat={currentChat} onSendMessage={handleSendMessage} isLoading={isLoading} />
        ) : (
          <EmptyState />
        )}

        {/* 始终渲染 Canvas，但通过 CSS 类控制其可见性 */}
        <Canvas
          blocks={canvasBlocks}
          blockRenderer={BlockRenderer}
          panelRenderer={(props) => (
            <Panel content={props.block.content} isGenerating={false} onClose={props.onClose} />
          )}
          className={isCanvasVisible ? 'visible' : ''}
        />
      </div>
    </div>
  );
}

export function ChatPage(): JSX.Element {
  return (
    <CanvasProvider>
      <ChatPageContent />
    </CanvasProvider>
  );
}