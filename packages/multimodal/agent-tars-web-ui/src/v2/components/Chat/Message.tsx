import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser,
  FiMessageSquare,
  FiCode,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiTool,
  FiImage,
  FiArrowRight,
  FiMonitor,
  FiCopy,
  FiCheck,
} from 'react-icons/fi';
import { Message as MessageType } from '../../types';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import { Markdown } from '../Common/Markdown';
import { formatTimestamp } from '../../utils/formatters';
import { isMultimodalContent } from '../../utils/typeGuards';
import './Message.css';

// Avatar component for message sender
const MessageAvatar = ({ role }: { role: string }) => {
  if (role === 'user') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-gray-700/30">
        <FiUser size={14} />
      </div>
    );
  } else if (role === 'assistant') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-accent-50 dark:bg-gray-800 text-accent-500 dark:text-accent-400 border border-accent-200/50 dark:border-gray-700/30">
        <FiMessageSquare size={14} />
      </div>
    );
  } else if (role === 'environment') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50/70 dark:bg-blue-800/50 text-blue-500 dark:text-blue-400 border border-blue-200/40 dark:border-blue-700/20">
        <FiMonitor size={14} />
      </div>
    );
  } else {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100/70 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border border-gray-200/40 dark:border-gray-700/20">
        <FiInfo size={14} />
      </div>
    );
  }
};

// Component for displaying system messages
const SystemMessage = ({ content }: { content: string }) => (
  <div className="flex items-center gap-2 text-sm">
    <FiInfo className="shrink-0" />
    <span>{content}</span>
  </div>
);

// Component for displaying environment messages
const EnvironmentMessage = ({
  content,
  description,
  renderContent,
}: {
  content: any;
  description?: string;
  renderContent: () => React.ReactNode;
}) => (
  <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
    {description && (
      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">{description}</div>
    )}
    {renderContent()}
  </div>
);

// Component for multimodal content (text and images)
const MultimodalContent = ({
  content,
  timestamp,
  setActivePanelContent,
}: {
  content: any[];
  timestamp: number;
  setActivePanelContent: any;
}) => {
  return content.map((part, index) => {
    if (part.type === 'text') {
      return <Markdown key={index}>{part.text}</Markdown>;
    }

    if (part.type === 'image_url') {
      return (
        <motion.div
          key={index}
          whileHover={{ scale: 1.01 }}
          onClick={() =>
            setActivePanelContent({
              type: 'image',
              source: part.image_url.url,
              title: part.image_url.alt || 'Image',
              timestamp,
            })
          }
          className="group p-2 border border-gray-200/40 dark:border-gray-700/20 rounded-2xl mt-2 mb-2 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-all duration-200"
        >
          <div className="flex items-center gap-2 text-accent-500 dark:text-accent-400">
            <FiImage className="text-sm" />
            <span className="text-sm font-medium">View image</span>
            <FiArrowRight
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              size={14}
            />
          </div>
        </motion.div>
      );
    }

    return null;
  });
};

// Component for assistant messages with expandable content
const AssistantExpandableContent = ({
  content,
  showSteps,
  setShowSteps,
}: {
  content: string;
  showSteps: boolean;
  setShowSteps: (show: boolean) => void;
}) => {
  // Extract just the first paragraph as summary
  const summary = content.split('\n')[0];
  const hasMoreContent = content.length > summary.length;

  return (
    <>
      <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
        <Markdown>{summary}</Markdown>
      </div>

      <AnimatePresence>
        {showSteps && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-2"
          >
            <div className="prose dark:prose-invert prose-sm max-w-none text-sm border-t border-gray-100/30 dark:border-gray-700/20 pt-2 mt-2">
              <Markdown>{content.substring(summary.length)}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasMoreContent && (
        <ToggleButton
          isExpanded={showSteps}
          onToggle={() => setShowSteps(!showSteps)}
          expandedText="Hide detailed steps"
          collapsedText="Show detailed steps"
        />
      )}
    </>
  );
};

// Component for tool calls
const ToolCalls = ({
  toolCalls,
  onToolCallClick,
  getToolIcon,
}: {
  toolCalls: any[];
  onToolCallClick: (toolCall: any) => void;
  getToolIcon: (name: string) => React.ReactNode;
}) => (
  <div className="mt-3 space-y-2">
    {toolCalls.map((toolCall) => (
      <button
        key={toolCall.id}
        onClick={() => onToolCallClick(toolCall)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-gray-100/60 dark:border-gray-700/20 bg-white dark:bg-gray-800 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60 text-left group"
      >
        {getToolIcon(toolCall.function.name)}
        <div className="truncate flex-1">{toolCall.function.name}</div>
        <FiArrowRight
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          size={14}
        />
      </button>
    ))}
  </div>
);

// Thinking toggle component
const ThinkingToggle = ({
  thinking,
  showThinking,
  setShowThinking,
}: {
  thinking: string;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
}) => (
  <div className="mt-3">
    <ToggleButton
      isExpanded={showThinking}
      onToggle={() => setShowThinking(!showThinking)}
      expandedText="Hide reasoning"
      collapsedText="Show reasoning"
      icon={<FiCode className="mr-1.5" />}
    />

    <AnimatePresence>
      {showThinking && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="mt-2 p-3 bg-gray-50/80 dark:bg-gray-700/40 rounded-xl text-xs font-mono overflow-x-auto border border-gray-100/40 dark:border-gray-600/20">
            {thinking}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Reusable toggle button component
const ToggleButton = ({
  isExpanded,
  onToggle,
  expandedText,
  collapsedText,
  icon,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  expandedText: string;
  collapsedText: string;
  icon?: React.ReactNode;
}) => (
  <motion.button
    whileHover={{ x: 3 }}
    onClick={onToggle}
    className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1 px-2 mt-1 rounded-lg hover:bg-gray-50/70 dark:hover:bg-gray-700/20 transition-all duration-200"
  >
    {isExpanded ? <FiChevronUp className="mr-1.5" /> : <FiChevronDown className="mr-1.5" />}
    {icon}
    {isExpanded ? expandedText : collapsedText}
  </motion.button>
);

// Message timestamp component
const MessageTimestamp = ({
  timestamp,
  content,
}: {
  timestamp: number;
  content: string | any[];
}) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = () => {
    const textToCopy =
      typeof content === 'string'
        ? content
        : content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');

    copyToClipboard(textToCopy);
  };

  return (
    <div className="absolute bottom-0 left-14 flex items-center text-xs text-gray-400 dark:text-gray-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <span className="mr-2">{formatTimestamp(timestamp)}</span>
      <button
        onClick={handleCopy}
        className="flex items-center text-gray-400 hover:text-accent-500 dark:hover:text-accent-400"
        title="Copy to clipboard"
      >
        {isCopied ? <FiCheck size={12} /> : <FiCopy size={12} />}
      </button>
    </div>
  );
};

// 添加复制到剪贴板功能
const useCopyToClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return { isCopied, copyToClipboard };
};

/**
 * Message Component - Displays a single message in the chat
 *
 * Design principles:
 * - Clean, minimalist styling with refined borders and elegant spacing
 * - Avatar-based sender identification replacing text labels
 * - Subtle color accents to differentiate message types
 * - Timestamps positioned outside message bubbles, revealed on hover
 * - Progressive disclosure for detailed content to maintain clean UI
 */
export const Message: React.FC<{ message: MessageType }> = ({ message }) => {
  const [showThinking, setShowThinking] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const { setActivePanelContent } = useSession();
  const { getToolIcon } = useTool();

  const isMultimodal = isMultimodalContent(message.content);

  // Handle tool call click - show result in panel
  const handleToolCallClick = (toolCall: any) => {
    if (message.toolResults && message.toolResults.length > 0) {
      const result = message.toolResults.find((r) => r.toolCallId === toolCall.id);
      if (result) {
        setActivePanelContent({
          type: result.type,
          source: result.content,
          title: result.name,
          timestamp: result.timestamp,
          toolCallId: result.toolCallId,
          error: result.error,
        });
      }
    }
  };

  // Render the message content based on type
  const renderContent = () => {
    if (isMultimodal) {
      return (
        <MultimodalContent
          content={message.content as any[]}
          timestamp={message.timestamp}
          setActivePanelContent={setActivePanelContent}
        />
      );
    }

    // For assistant messages with tool calls, show a summary first
    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      return (
        <AssistantExpandableContent
          content={message.content as string}
          showSteps={showSteps}
          setShowSteps={setShowSteps}
        />
      );
    }

    return <Markdown>{message.content as string}</Markdown>;
  };

  // Message animation variants
  const messageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  };

  // Determine message container layout based on role
  const getMessageContainerClasses = () => {
    if (message.role === 'user') {
      return 'justify-end';
    } else if (message.role === 'system') {
      return 'justify-center';
    } else {
      return 'justify-start';
    }
  };

  // Determine message bubble styling based on role
  const getMessageBubbleClasses = () => {
    if (message.role === 'user') {
      return 'max-w-[85%] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-[#E5E6EC] dark:border-gray-700/30';
    } else if (message.role === 'system') {
      return 'max-w-full bg-gray-50/70 dark:bg-gray-800/30 text-gray-700 dark:text-gray-300 border border-[#E5E6EC] dark:border-gray-700/30';
    } else if (message.role === 'environment') {
      return 'max-w-[85%] bg-blue-50/40 dark:bg-blue-900/10 text-gray-800 dark:text-gray-200 border border-blue-100/40 dark:border-blue-800/20';
    } else {
      return 'max-w-[85%] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-[#E5E6EC] dark:border-gray-700/30';
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={messageVariants}
      className={`relative flex gap-4 mb-4 group ${getMessageContainerClasses()}`}
    >
      {/* For non-user messages, show avatar to the left of message */}
      {message.role !== 'system' && message.role !== 'user' && (
        <div className="mt-1">
          <MessageAvatar role={message.role} />
        </div>
      )}

      <div className={`${getMessageBubbleClasses()} rounded-3xl px-4 py-3 relative mb-6`}>
        {/* Content based on message role */}
        {message.role === 'system' ? (
          <SystemMessage content={message.content as string} />
        ) : message.role === 'environment' ? (
          <EnvironmentMessage
            content={message.content}
            description={message.description}
            renderContent={renderContent}
          />
        ) : (
          <>
            <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
              {renderContent()}
            </div>

            {/* Tool calls section */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCalls
                toolCalls={message.toolCalls}
                onToolCallClick={handleToolCallClick}
                getToolIcon={getToolIcon}
              />
            )}

            {/* Thinking section */}
            {message.thinking && (
              <ThinkingToggle
                thinking={message.thinking}
                showThinking={showThinking}
                setShowThinking={setShowThinking}
              />
            )}
          </>
        )}
      </div>

      {/* For user messages, show avatar to the right of message */}
      {message.role === 'user' && (
        <div className="mt-1">
          <MessageAvatar role="user" />
        </div>
      )}

      {/* Timestamp and Copy button - outside the bubble, visible on hover */}
      {message.role !== 'system' && (
        <MessageTimestamp timestamp={message.timestamp} content={message.content} />
      )}
    </motion.div>
  );
};