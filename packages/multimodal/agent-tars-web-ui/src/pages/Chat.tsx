import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [activeSteps, setActiveSteps] = useState<AgentStep[]>([]);
  const initialChatCreated = useRef(false);
  const initialMessage = searchParams.get('message');
  const initialSetupDone = useRef(false);

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

  /**
   * Creates a new chat session
   */
  const createNewChat = useCallback(
    (title = `New Chat ${chats.length + 1}`, model = selectedModel): ChatType => {
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
    },
    [chats.length, selectedModel, saveChat, setCurrentChat],
  );

  /**
   * Updates chat messages and persists to storage
   */
  const updateChatMessages = async (chatToUpdate: ChatType, messages: Message[]): Promise<void> => {
    const updatedChat = { ...chatToUpdate, messages };
    setCurrentChat(updatedChat);
    await saveChat(updatedChat);
  };

  /**
   * Creates a message object of specified type
   */
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

  /**
   * Initial setup for chat sessions
   */
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
    }
  }, [chats, currentChat, initialMessage]);

  /**
   * Processes intermediate state updates from the agent
   */
  const handleIntermediateState = useCallback(
    (state: AgentIntermediateState) => {
      if (state.type === 'error') {
        setError(state.content);
      } else if (state.type === 'canvas' && state.blocks) {
        // Show Canvas
        setCanvasBlocks((prevBlocks) => {
          // Merge new blocks with existing ones, avoiding duplicates
          const existingIds = new Set(prevBlocks.map((b) => b.id));
          const newBlocks = state.blocks?.filter((b) => !existingIds.has(b.id)) || [];
          return [...prevBlocks, ...newBlocks];
        });
        setCanvasVisible(true);
      } else if (state.type === 'steps' && state.steps) {
        // Update steps state
        setActiveSteps((prevSteps) => {
          // Create a map of existing steps
          const stepsMap = new Map(prevSteps.map((step) => [step.id, step]));

          // Update map with new steps
          state.steps?.forEach((step) => {
            stepsMap.set(step.id, step);
          });

          // Convert map back to array
          return Array.from(stepsMap.values());
        });

        // Create or update steps message in chat
        if (currentChat) {
          // Get all updated steps
          const allSteps = [...activeSteps];
          if (state.steps) {
            state.steps.forEach((step) => {
              const existingIndex = allSteps.findIndex((s) => s.id === step.id);
              if (existingIndex >= 0) {
                allSteps[existingIndex] = step;
              } else {
                allSteps.push(step);
              }
            });
          }

          const stepsMessage = createMessage('assistant', state.content || 'Executing task...', {
            type: 'steps',
            steps: allSteps,
          });

          // Update messages in chat
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
                steps: allSteps,
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
    },
    [currentChat, activeSteps, saveChat, setCanvasVisible],
  );

  /**
   * Sends a message to the agent and processes the response
   */
  const handleMessage = async (
    message: string,
    chat: ChatType | null = null,
    model: Model = selectedModel,
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    // Reset canvas state for every new message
    setCanvasVisible(false);
    setCanvasBlocks([]);
    setActiveSteps([]);

    try {
      // If no chat is passed, create a new one
      const activeChat = chat || createNewChat(message.slice(0, 20) + '...', model);

      const userMessage = createMessage('user', message);
      const assistantMessage = createMessage('assistant', '');
      const newMessages = [...activeChat.messages, userMessage, assistantMessage];

      await updateChatMessages(activeChat, newMessages);

      let fullContent = '';

      // Stream chat with agent service
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

  /**
   * Sends a message in the current chat
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    if (!currentChat) return;
    await handleMessage(content, currentChat);
  };

  /**
   * Handle initial message from URL parameters
   */
  useEffect(() => {
    // Ensure this logic only executes once
    if (initialMessage && !initialChatCreated.current) {
      initialChatCreated.current = true;
      handleMessage(initialMessage, null, selectedModel);
      setSearchParams({});
    }
  }, [initialMessage, selectedModel, setSearchParams]);

  /**
   * Deletes a chat session
   */
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

        {/* Canvas component for visualizations */}
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
