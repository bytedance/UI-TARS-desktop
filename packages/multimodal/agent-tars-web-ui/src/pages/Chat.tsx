import { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Chat as ChatType, Message, StepsMessage } from '../components/Chat';
import { useChatContext, ChatView } from '../components/Chat';
import { mockAgentService } from '../services/mockAgent';
import type { Model } from '../types/chat';
import type { AgentIntermediateState, AgentIntermediateBlock, AgentStep } from '../types/chat';
import { Canvas } from '../components/Canvas/Canvas';
import { CanvasProvider, useCanvas } from '../components/Canvas/CanvasContext';
import { Panel } from '../components/Panel';
import { BiCube } from 'react-icons/bi';
import { FiTrash2 } from 'react-icons/fi';
import { FiSettings } from 'react-icons/fi';

import './Chat.css';

const LogoIcon = () => <BiCube />;

// Block renderer component for Canvas
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
  const initialSetupDone = useRef(false); // Added flag to mark initialization completion

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

  const createNewChat = (
    title = `New Chat ${chats.length + 1}`,
    model = selectedModel,
  ): ChatType => {
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
  ): Message => {
    const baseMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
    };

    if (options?.type === 'steps' && options.steps) {
      return {
        ...baseMessage,
        type: 'steps' as const,
        steps: options.steps,
      } as StepsMessage;
    }

    return baseMessage;
  };

  // /packages/multimodal/agent-tars-web-ui/src/pages/Chat.tsx
  useEffect(() => {
    // Only execute when chats are loaded and initialization is not yet complete
    if (!initialSetupDone.current && chats.length >= 0) {
      initialSetupDone.current = true; // Mark initialization as complete

      // If there's an initial message, create a new chat and send it
      if (initialMessage) {
        return;
      }

      // If there's a current chat, do nothing
      if (currentChat) return;

      // No longer automatically select or create chats, let the UI show the empty state
      // Removed the logic for auto-selecting chat and auto-creating chat
    }
  }, [chats, currentChat, initialMessage]);

  // /packages/multimodal/agent-tars-web-ui/src/pages/Chat.tsx
  const handleIntermediateState = (state: AgentIntermediateState) => {
    if (state.type === 'error') {
      setError(state.content);
    } else if (state.type === 'canvas' && state.blocks) {
      // Show Canvas
      setCanvasBlocks(state.blocks);
      setCanvasVisible(true);
    } else if (state.type === 'steps' && state.steps) {
      // Create a steps type message
      if (currentChat) {
        const stepsMessage = createMessage('assistant', state.content || 'Executing task...', {
          type: 'steps',
          steps: state.steps,
        });

        // Update message list, find the last assistant message, if it's a steps message then update it
        setCurrentChat((prevChat) => {
          if (!prevChat) return prevChat;

          const updatedMessages = [...prevChat.messages];
          // Find the last assistant message, if it's a steps message then update it
          const existingStepMsgIndex = updatedMessages.findIndex(
            (msg) => msg.role === 'assistant' && msg.type === 'steps',
          );

          if (existingStepMsgIndex >= 0) {
            // Preserve message ID and timestamp, update steps content and text
            updatedMessages[existingStepMsgIndex] = {
              ...updatedMessages[existingStepMsgIndex],
              content: state.content || updatedMessages[existingStepMsgIndex].content,
              steps: state.steps,
            } as StepsMessage;
          } else {
            // Add new steps message - ensure it's the last assistant message
            const lastUserMsgIndex = updatedMessages.map((m) => m.role).lastIndexOf('user');
            if (lastUserMsgIndex !== -1 && lastUserMsgIndex === updatedMessages.length - 1) {
              // If the last message is a user message, add it directly at the end
              updatedMessages.push(stepsMessage);
            } else if (lastUserMsgIndex !== -1) {
              // If there's a user message but not the last one, add it after the user message, before other assistant messages
              updatedMessages.splice(lastUserMsgIndex + 1, 0, stepsMessage);
            } else {
              // In case of any unexpected situation, add it at the end
              updatedMessages.push(stepsMessage);
            }
          }

          const updatedChat = { ...prevChat, messages: updatedMessages };
          // Asynchronously save chat record
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

    // Reset canvas state for every new message
    setCanvasVisible(false);

    try {
      // If no chat is passed, create a new one
      const activeChat = chat || createNewChat(message.slice(0, 20) + '...', model);

      const userMessage = createMessage('user', message);
      const assistantMessage = createMessage('assistant', '');
      const newMessages = [...activeChat.messages, userMessage, assistantMessage];

      await updateChatMessages(activeChat, newMessages);

      let fullContent = '';

      // Use mockAgentService instead of real service
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

      // Update title, only for the first message
      if (activeChat.messages.length <= 2) {
        const newTitle = message.length > 20 ? message.slice(0, 20) + '...' : message;

        const updatedChat = { ...activeChat, title: newTitle };
        await saveChat(updatedChat);
        setCurrentChat(updatedChat);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string): Promise<void> => {
    if (!currentChat) return;
    await handleMessage(content, currentChat);
  };

  // Handle initial message
  useEffect(() => {
    // Ensure this logic only executes once
    if (initialMessage && !initialChatCreated.current) {
      initialChatCreated.current = true;
      handleMessage(initialMessage, null, selectedModel);
      setSearchParams({});
    }
  }, [initialMessage, selectedModel]); // Added selectedModel as a dependency

  const handleDeleteChat = async (chatId: string): Promise<void> => {
    await deleteChat(chatId);
  };

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-icon">💬</div>
      <h2>Start a new conversation</h2>
      <p>Click the "New Chat" button on the left or send a message in the input box below</p>
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
          New Chat
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
                  title="Delete chat"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-footer">
          <Link to="/settings" className="settings-link">
            <FiSettings />
            <span>Settings</span>
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

        {/* 简化的Canvas组件 */}
        <Canvas
          blocks={canvasBlocks}
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
