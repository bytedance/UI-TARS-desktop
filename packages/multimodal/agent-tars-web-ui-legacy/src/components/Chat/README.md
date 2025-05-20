# Chat Component API Documentation

## Overview

The Chat component system is a comprehensive solution for building interactive chat interfaces. It provides core components for rendering chat messages, handling user input, and managing chat state through React Context.

## Core Components

### `ChatView`

The main component for rendering the chat interface, including messages and input area.

```tsx
import { ChatView } from '@agent-tars/web-ui';

function MyChat() {
  const [chat, setChat] = useState({
    id: '1',
    title: 'My Chat',
    messages: [],
    model: 'default',
    timestamp: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message) => {
    // Handle sending message logic
    console.log('Message sent:', message);
  };

  return <ChatView chat={chat} isLoading={isLoading} onSendMessage={handleSendMessage} />;
}
```

#### Props

| Prop               | Type                                         | Required | Description                                           |
| ------------------ | -------------------------------------------- | -------- | ----------------------------------------------------- |
| `chat`             | `Chat`                                       | Yes      | The chat data object containing messages and metadata |
| `isLoading`        | `boolean`                                    | No       | Whether the chat is currently loading a response      |
| `onSendMessage`    | `(content: string) => Promise<void>`         | Yes      | Function called when user sends a message             |
| `renderMessage`    | `MessageRenderer`                            | No       | Custom message renderer function                      |
| `renderInput`      | `(props: ChatInputProps) => React.ReactNode` | No       | Custom input renderer function                        |
| `messageRenderers` | `Record<MessageType, MessageRenderer>`       | No       | Custom renderers for specific message types           |
| `className`        | `string`                                     | No       | Additional CSS class name                             |
| `style`            | `React.CSSProperties`                        | No       | Inline styles for the component                       |

### Context Providers

#### `ChatProvider`

Manages global chat state including chat history, current chat, and model selection.

```tsx
import { ChatProvider, useChatContext } from '@agent-tars/web-ui';

function App() {
  return (
    <ChatProvider>
      <MyChatApp />
    </ChatProvider>
  );
}

function MyChatApp() {
  const { currentChat, setCurrentChat, saveChat, deleteChat } = useChatContext();
  // Use chat context methods and state
}
```

#### `ChatStorageProvider`

Provides chat persistence capabilities through a storage interface.

```tsx
import { ChatStorageProvider, LocalChatStorage, ChatProvider } from '@agent-tars/web-ui';

function App() {
  const storage = new LocalChatStorage();

  return (
    <ChatStorageProvider storage={storage}>
      <ChatProvider>
        <MyChatApp />
      </ChatProvider>
    </ChatStorageProvider>
  );
}
```

## TypeScript Interfaces

### Core Types

```ts
// Chat data structure
interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

// Basic message interface
interface BaseMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: MessageType;
  meta?: Record<string, unknown>;
}

// Text message type
interface TextMessage extends BaseMessage {
  type?: 'text';
}

// Steps message type with task progress
interface StepsMessage extends BaseMessage {
  type: 'steps';
  steps: Array<{
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed';
  }>;
}

// Union type of all message types
type Message = TextMessage | StepsMessage | BaseMessage;

// Chat storage interface
interface ChatStorage {
  getChats(): Promise<Chat[]>;
  saveChat(chat: Chat): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  clear(): Promise<void>;
}
```

### Renderer Types

```ts
// Props for message renderers
interface MessageRendererProps<T extends BaseMessage = Message> {
  message: T;
  toggleExpand?: (messageId: string) => void;
  isExpanded?: boolean;
}

// Message renderer function type
type MessageRenderer<T extends BaseMessage = Message> = (
  props: MessageRendererProps<T>,
) => React.ReactNode;

// Chat input props
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
}
```

## Usage Examples

### 1. Basic Chat Interface

```tsx
import { useState } from 'react';
import { ChatView } from '@agent-tars/web-ui';
import { v4 as uuidv4 } from 'uuid';

function BasicChat() {
  const [chat, setChat] = useState({
    id: uuidv4(),
    title: 'New Chat',
    messages: [],
    model: 'default',
    timestamp: Date.now(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content) => {
    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Update chat with user message
    setChat((prevChat) => ({
      ...prevChat,
      messages: [...prevChat.messages, userMessage],
    }));

    // Simulate loading
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create assistant message
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `I received your message: "${content}"`,
        timestamp: Date.now(),
      };

      // Update chat with assistant response
      setChat((prevChat) => ({
        ...prevChat,
        messages: [...prevChat.messages, assistantMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ChatView chat={chat} isLoading={isLoading} onSendMessage={handleSendMessage} />
    </div>
  );
}
```

### 2. Chat with Custom Message Rendering

```tsx
import { useState } from 'react';
import { ChatView } from '@agent-tars/web-ui';
import { v4 as uuidv4 } from 'uuid';

function CustomRenderedChat() {
  const [chat, setChat] = useState({
    id: uuidv4(),
    title: 'Custom Rendered Chat',
    messages: [],
    model: 'default',
    timestamp: Date.now(),
  });

  // Custom message renderer
  const renderMessage = ({ message }) => {
    if (message.role === 'assistant' && message.content.includes('image:')) {
      // Extract image URL from content
      const imageUrl = message.content.replace('image:', '').trim();

      return (
        <div className={`message ${message.role}`}>
          <div className="content">
            <img src={imageUrl} alt="Assistant provided image" style={{ maxWidth: '100%' }} />
          </div>
          <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
      );
    }

    // Return null to use default renderer for other messages
    return null;
  };

  const handleSendMessage = async (content) => {
    // Add user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setChat((prevChat) => ({
      ...prevChat,
      messages: [...prevChat.messages, userMessage],
    }));

    // Simulate response
    setTimeout(() => {
      // Check if user asked for an image
      if (content.toLowerCase().includes('image') || content.toLowerCase().includes('picture')) {
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: 'image:https://via.placeholder.com/400x300?text=Example+Image',
          timestamp: Date.now(),
        };

        setChat((prevChat) => ({
          ...prevChat,
          messages: [...prevChat.messages, assistantMessage],
        }));
      } else {
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: `Here's my response to "${content}"`,
          timestamp: Date.now(),
        };

        setChat((prevChat) => ({
          ...prevChat,
          messages: [...prevChat.messages, assistantMessage],
        }));
      }
    }, 1000);
  };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ChatView chat={chat} onSendMessage={handleSendMessage} renderMessage={renderMessage} />
    </div>
  );
}
```

### 3. Chat with Custom Input

```tsx
import { useState } from 'react';
import { ChatView } from '@agent-tars/web-ui';
import { v4 as uuidv4 } from 'uuid';

function ChatWithCustomInput() {
  const [chat, setChat] = useState({
    id: uuidv4(),
    title: 'Custom Input Chat',
    messages: [],
    model: 'default',
    timestamp: Date.now(),
  });

  const [isLoading, setIsLoading] = useState(false);

  // Custom input renderer
  const renderInput = ({ value, onChange, onSubmit, isLoading, placeholder }) => {
    return (
      <div
        className="custom-input-container"
        style={{
          padding: '16px',
          background: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Type your message...'}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '24px',
            border: '1px solid #ddd',
            fontSize: '14px',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading}
          style={{
            padding: '0 16px',
            background: '#000',
            color: '#fff',
            borderRadius: '24px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    );
  };

  const handleSendMessage = async (content) => {
    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Update chat with user message
    setChat((prevChat) => ({
      ...prevChat,
      messages: [...prevChat.messages, userMessage],
    }));

    setIsLoading(true);

    // Simulate response delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create assistant message
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `Thanks for your message: "${content}"`,
      timestamp: Date.now(),
    };

    // Update chat with assistant response
    setChat((prevChat) => ({
      ...prevChat,
      messages: [...prevChat.messages, assistantMessage],
    }));

    setIsLoading(false);
  };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ChatView
        chat={chat}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        renderInput={renderInput}
      />
    </div>
  );
}
```

### 4. Chat with Steps Progress

```tsx
import { useState } from 'react';
import { ChatView } from '@agent-tars/web-ui';
import { v4 as uuidv4 } from 'uuid';

function TaskProgressChat() {
  const [chat, setChat] = useState({
    id: uuidv4(),
    title: 'Task Progress Chat',
    messages: [],
    model: 'default',
    timestamp: Date.now()
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (content) => {
    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // Update chat with user message
    setChat(prevChat => ({
      ...prevChat,
      messages: [...prevChat.messages, userMessage]
    }));

    setIsLoading(true);

    // Check if message is requesting a task
    if (content.toLowerCase().includes('task') || content.toLowerCase().includes('analyze')) {
      // Create initial steps message with pending steps
      const initialStepsMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'steps',
        content: 'I'll work on this task for you.',
        timestamp: Date.now(),
        steps: [
          {
            id: 1,
            title: 'Understanding Your Request',
            description: 'Analyzing what you need',
            status: 'pending'
          },
          {
            id: 2,
            title: 'Gathering Information',
            description: 'Collecting relevant data',
            status: 'pending'
          },
          {
            id: 3,
            title: 'Processing Results',
            description: 'Analyzing the collected information',
            status: 'pending'
          },
          {
            id: 4,
            title: 'Generating Final Response',
            description: 'Creating your comprehensive answer',
            status: 'pending'
          }
        ]
      };

      // Add initial message with pending steps
      setChat(prevChat => ({
        ...prevChat,
        messages: [...prevChat.messages, initialStepsMessage]
      }));

      // Simulate progress updates
      await simulateStepProgress(initialStepsMessage);

      setIsLoading(false);
    } else {
      // Regular response for non-task messages
      setTimeout(() => {
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: `I received your message: "${content}"`,
          timestamp: Date.now()
        };

        setChat(prevChat => ({
          ...prevChat,
          messages: [...prevChat.messages, assistantMessage]
        }));

        setIsLoading(false);
      }, 1000);
    }
  };

  // Helper function to simulate step progress
  const simulateStepProgress = async (initialMessage) => {
    const steps = [...initialMessage.steps];
    const messageId = initialMessage.id;

    // Update step 1 to in-progress
    await sleep(1000);
    steps[0].status = 'in-progress';
    updateMessageSteps(messageId, steps);

    // Complete step 1 and start step 2
    await sleep(1500);
    steps[0].status = 'completed';
    steps[1].status = 'in-progress';
    updateMessageSteps(messageId, steps);

    // Complete step 2 and start step 3
    await sleep(2000);
    steps[1].status = 'completed';
    steps[2].status = 'in-progress';
    updateMessageSteps(messageId, steps);

    // Complete step 3 and start step 4
    await sleep(1800);
    steps[2].status = 'completed';
    steps[3].status = 'in-progress';
    updateMessageSteps(messageId, steps);

    // Complete all steps and update final message
    await sleep(2000);
    steps[3].status = 'completed';
    updateMessageWithCompletion(messageId, steps);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const updateMessageSteps = (messageId, updatedSteps) => {
    setChat(prevChat => {
      const updatedMessages = prevChat.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, steps: updatedSteps }
          : msg
      );

      return {
        ...prevChat,
        messages: updatedMessages
      };
    });
  };

  const updateMessageWithCompletion = (messageId, finalSteps) => {
    setChat(prevChat => {
      const updatedMessages = prevChat.messages.map(msg =>
        msg.id === messageId
          ? {
              ...msg,
              steps: finalSteps,
              content: "I've completed the analysis. Here are my findings:\n\n" +
                       "Based on your request, I've analyzed the data thoroughly and prepared " +
                       "a comprehensive response. The analysis shows several key insights that " +
                       "address your specific needs."
            }
          : msg
      );

      return {
        ...prevChat,
        messages: updatedMessages
      };
    });
  };

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ChatView
        chat={chat}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
```

### 5. Full Chat Application with Storage

```tsx
import { useState, useEffect } from 'react';
import {
  ChatView,
  ChatProvider,
  ChatStorageProvider,
  LocalChatStorage,
  useChatContext,
} from '@agent-tars/web-ui';
import { v4 as uuidv4 } from 'uuid';

// Create storage instance outside of component
const storage = new LocalChatStorage();

function ChatApp() {
  return (
    <ChatStorageProvider storage={storage}>
      <ChatProvider>
        <ChatInterface />
      </ChatProvider>
    </ChatStorageProvider>
  );
}

function ChatInterface() {
  const { chats, currentChat, setCurrentChat, saveChat, deleteChat, selectedModel } =
    useChatContext();

  const [isLoading, setIsLoading] = useState(false);

  // Create new chat if no chat exists
  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    } else if (!currentChat) {
      setCurrentChat(chats[0]);
    }
  }, [chats, currentChat]);

  const createNewChat = () => {
    const newChat = {
      id: uuidv4(),
      title: `New Chat ${chats.length + 1}`,
      messages: [],
      model: selectedModel,
      timestamp: Date.now(),
    };

    saveChat(newChat);
    setCurrentChat(newChat);
  };

  const handleSendMessage = async (content) => {
    if (!currentChat) return;

    setIsLoading(true);

    // Create user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Update messages array
    const updatedMessages = [...currentChat.messages, userMessage];
    const updatedChat = { ...currentChat, messages: updatedMessages };

    // Save the updated chat with user message
    await saveChat(updatedChat);
    setCurrentChat(updatedChat);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Create assistant message
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `This is a response to your message: "${content}"`,
        timestamp: Date.now(),
      };

      // Update with assistant response
      const messagesWithResponse = [...updatedMessages, assistantMessage];
      const chatWithResponse = { ...currentChat, messages: messagesWithResponse };

      // Save the final chat
      await saveChat(chatWithResponse);
      setCurrentChat(chatWithResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChatList = () => {
    return (
      <div className="chat-list" style={{ width: '250px', borderRight: '1px solid #e0e0e0' }}>
        <button
          onClick={createNewChat}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          New Chat
        </button>

        {chats.map((chat) => (
          <div
            key={chat.id}
            style={{
              padding: '10px',
              marginBottom: '4px',
              background: currentChat?.id === chat.id ? '#f0f0f0' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
            }}
            onClick={() => setCurrentChat(chat)}
          >
            <span>{chat.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#888',
              }}
            >
              ✖
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {renderChatList()}

      <div style={{ flex: 1, height: '100%' }}>
        {currentChat ? (
          <ChatView chat={currentChat} isLoading={isLoading} onSendMessage={handleSendMessage} />
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            Select a chat or create a new one
          </div>
        )}
      </div>
    </div>
  );
}
```

## Extended Usage: Custom Message Renderers

### Creating a Custom Message Type and Renderer

```tsx
// Define a custom message type
interface ImageMessage extends BaseMessage {
  type: 'image';
  imageUrl: string;
  caption?: string;
}

// Create a renderer for the custom message type
const ImageMessageRenderer: MessageRenderer<ImageMessage> = ({ message }) => {
  return (
    <div className={`message ${message.role}`}>
      <div className="content">
        <div className="image-container">
          <img src={message.imageUrl} alt={message.caption || 'Image'} />
          {message.caption && <p className="caption">{message.caption}</p>}
        </div>
        <div className="image-description">{message.content}</div>
      </div>
      <div className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</div>
    </div>
  );
};

// Using the custom message renderer
function ChatWithCustomMessageTypes() {
  // Initialize chat state and handlers...

  return (
    <ChatView
      chat={chat}
      onSendMessage={handleSendMessage}
      messageRenderers={{
        text: TextMessageRenderer, // Use default text renderer
        image: ImageMessageRenderer, // Add custom image renderer
      }}
    />
  );
}

// Example of creating an image message
const createImageMessage = (imageUrl, caption, content) => {
  return {
    id: uuidv4(),
    role: 'assistant',
    type: 'image',
    imageUrl,
    caption,
    content,
    timestamp: Date.now(),
  };
};

// Then in your message handler:
// const imageMessage = createImageMessage(
//   'https://example.com/image.jpg',
//   'Chart showing data analysis',
//   'Here is the visualization of the data you requested.'
// );
```

## Styling and Customization

The Chat component includes default styling with CSS variables for customization. You can override these variables to match your application's design:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f2f2f2;
  --bg-tertiary: #eaeaea;
  --bg-hover: #e5e5e5;

  --text-primary: #000000;
  --text-secondary: #333333;
  --text-tertiary: #666666;

  --border-color: rgba(0, 0, 0, 0.1);
  --border-hover: rgba(0, 0, 0, 0.15);

  --brand-color: #000000;
  --brand-hover: #333333;
  --brand-light: rgba(0, 0, 0, 0.05);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);

  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;

  --transition: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Accessibility Considerations

The Chat component supports keyboard navigation and screen readers. When implementing custom renderers, ensure that:

1. Interactive elements are keyboard accessible
2. Messages have proper semantic structure
3. Images include alt text
4. Status changes are announced appropriately

## Best Practices

1. **State Management**: Use the provided context providers for managing chat state.
2. **Message Rendering**: Use the type system to ensure proper message rendering.
3. **Error Handling**: Implement error handling in all async operations.
4. **Persistence**: Use the storage interface to persist chat data.
5. **Performance**: Avoid unnecessary re-renders by memoizing callbacks and renderers.

## Troubleshooting

### Common Issues

- **Messages not updating**: Ensure you're properly updating the chat object with new messages.
- **Custom renderers not working**: Check that your messageRenderers prop maps message types correctly.
- **Chat context missing**: Make sure components using useChatContext are wrapped in a ChatProvider.

### Performance Optimization

For large chat histories:

- Consider pagination or virtualized lists
- Memoize expensive rendering operations
- Use React.memo for message components that don't change frequently
