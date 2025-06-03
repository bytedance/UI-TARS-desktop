import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import { usePlan } from '../../hooks/usePlan';
import { FiSend, FiX, FiRefreshCw, FiPaperclip, FiImage, FiLoader, FiCpu } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus } from '../../types';
import { useLocation } from 'react-router-dom';
import './MessageInput.css';
import { usePro } from '@/v2/hooks/usePro';
import { ChatCompletionContentPart } from '@multimodal/agent-interface';
import { ImagePreview } from './ImagePreview';

interface MessageInputProps {
  isDisabled?: boolean;
  onReconnect?: () => void;
  connectionStatus?: ConnectionStatus;
  initialQuery?: string;
}

/**
 * MessageInput Component - Input for sending messages
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  isDisabled = false,
  onReconnect,
  connectionStatus,
}) => {
  const [input, setInput] = useState('');
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<ChatCompletionContentPart[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  const {
    sendMessage,
    isProcessing,
    abortQuery,
    activeSessionId,
    checkSessionStatus,
    setActivePanelContent,
  } = useSession();

  const isProMode = usePro();

  const { currentPlan } = usePlan(activeSessionId);

  // Process query from URL parameters on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');

    if (query && !isProcessing && activeSessionId) {
      setInput(query);

      // Submit the query automatically
      const submitQuery = async () => {
        try {
          await sendMessage(query);
          // Clear input after sending
          setInput('');
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      };

      submitQuery();
    }
  }, [location.search, activeSessionId, isProcessing, sendMessage]);

  // Ensure processing state is handled correctly
  useEffect(() => {
    if (activeSessionId && connectionStatus?.connected) {
      // Initial check of session status
      checkSessionStatus(activeSessionId);

      // If session status changes, increase polling
      const intervalId = setInterval(() => {
        checkSessionStatus(activeSessionId);
      }, 2000); // Check status every 2 seconds

      return () => clearInterval(intervalId);
    }
  }, [activeSessionId, connectionStatus?.connected, checkSessionStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && uploadedImages.length === 0) || isDisabled) return;

    // Immediately clear input field, don't wait for message to be sent
    const messageToSend = input.trim();
    setInput('');

    // Build multimodal content if there are images
    const messageContent =
      uploadedImages.length > 0
        ? [
            ...uploadedImages,
            ...(messageToSend
              ? [{ type: 'text', text: messageToSend } as ChatCompletionContentPart]
              : []),
          ]
        : messageToSend;

    // Clear uploaded images
    setUploadedImages([]);

    // Reset textarea height immediately
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      // Use previously saved message content to send
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Modified to not trigger send on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter as optional shortcut to send
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleAbort = async () => {
    if (!isProcessing) return;

    setIsAborting(true);
    try {
      await abortQuery();
    } catch (error) {
      console.error('Failed to abort:', error);
    } finally {
      setIsAborting(false);
    }
  };

  // Adjust textarea height based on content
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);

    // Reset height to recalculate proper scrollHeight
    target.style.height = 'auto';
    // Set to scrollHeight but max 200px
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  // Auto-focus input when available
  useEffect(() => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDisabled]);

  // Dummy handler for file upload button
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newImage: ChatCompletionContentPart = {
            type: 'image_url',
            image_url: {
              url: event.target.result as string,
              detail: 'auto',
            },
          };
          setUploadedImages((prev) => [...prev, newImage]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove an image from the uploaded images list
  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 添加一个查看计划按钮
  const renderPlanButton = () => {
    // 只在实际有计划且计划已经生成时显示按钮
    if (!currentPlan || !currentPlan.hasGeneratedPlan || currentPlan.steps.length === 0)
      return null;

    const completedSteps = currentPlan.steps.filter((step) => step.done).length;
    const totalSteps = currentPlan.steps.length;
    const isComplete = currentPlan.isComplete;

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05, y: -2 }}
        onClick={() =>
          setActivePanelContent({
            type: 'plan',
            source: null,
            title: 'Task Plan',
            timestamp: Date.now(),
          })
        }
        className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-white/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/30 hover:bg-white hover:border-gray-300/50 dark:hover:bg-gray-700/50 dark:hover:border-gray-600/50 transition-all duration-200 shadow-sm"
      >
        {isComplete ? (
          <FiCpu size={12} className="mr-0.5 text-green-500 dark:text-green-400" />
        ) : (
          <FiCpu size={12} className="mr-0.5 text-accent-500 dark:text-accent-400 animate-pulse" />
        )}
        View Plan
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-full ${
            isComplete
              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          } text-[10px]`}
        >
          {completedSteps}/{totalSteps}
        </span>
      </motion.button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Plan button - 仅在计划实际存在且已生成时显示 */}
      {isProMode && currentPlan && currentPlan.hasGeneratedPlan && currentPlan.steps.length > 0 && (
        <div className="flex justify-center mb-3">{renderPlanButton()}</div>
      )}

      {/* Image preview area */}
      {uploadedImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedImages.map((image, index) => (
            <ImagePreview key={index} image={image} onRemove={() => handleRemoveImage(index)} />
          ))}
        </div>
      )}

      {/* 修复的圆角容器结构 */}
      <div
        className={`relative overflow-hidden rounded-3xl transition-all duration-300 ${
          isFocused ? 'shadow-md' : ''
        }`}
      >
        {/* 渐变边框背景 - 现在填充整个容器而不是使用padding */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${
            isFocused || input.trim() || uploadedImages.length > 0
              ? 'from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-border-flow'
              : 'from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700'
          } bg-[length:200%_200%] ${isFocused ? 'opacity-100' : 'opacity-70'}`}
        ></div>

        {/* 内容容器 - 稍微缩小以显示边框 */}
        <div
          className={`relative m-[2px] rounded-[1.4rem] bg-white dark:bg-gray-800 backdrop-blur-sm ${
            isDisabled ? 'opacity-90' : ''
          }`}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              connectionStatus && !connectionStatus.connected
                ? 'Server disconnected...'
                : isProcessing
                  ? 'Agent TARS is thinking...'
                  : 'Ask Agent TARS something... (Ctrl+Enter to send)'
            }
            disabled={isDisabled}
            className="w-full px-5 pt-4 pb-10 focus:outline-none resize-none min-h-[90px] max-h-[200px] bg-transparent text-sm leading-relaxed rounded-[1.4rem]"
            rows={2}
          />

          {/* File upload buttons */}
          <div className="absolute left-3 bottom-2 flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleFileUpload}
              disabled={isDisabled || isProcessing}
              className={`p-2 rounded-full transition-colors ${
                isDisabled || isProcessing
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-accent-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400'
              }`}
              title="Attach image"
            >
              <FiImage size={18} />
            </motion.button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
              disabled={isDisabled || isProcessing}
            />
          </div>

          <AnimatePresence mode="wait">
            {connectionStatus && !connectionStatus.connected ? (
              <motion.button
                key="reconnect"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                type="button"
                onClick={onReconnect}
                className="absolute right-3 bottom-2 p-2 rounded-full text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400 transition-all duration-200"
                title="Try to reconnect"
              >
                <FiRefreshCw
                  size={20}
                  className={connectionStatus.reconnecting ? 'animate-spin' : ''}
                />
              </motion.button>
            ) : isProcessing ? (
              <motion.button
                key="abort"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                type="button"
                onClick={handleAbort}
                disabled={isAborting}
                className={`absolute right-3 bottom-2 p-2 rounded-full ${
                  isAborting
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400'
                } transition-all duration-200`}
                title="Abort current operation"
              >
                {isAborting ? <FiLoader className="animate-spin" size={20} /> : <FiX size={20} />}
              </motion.button>
            ) : (
              <motion.button
                key="send"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                type="submit"
                disabled={(!input.trim() && uploadedImages.length === 0) || isDisabled}
                className={`absolute right-3 bottom-2 p-3 rounded-full ${
                  (!input.trim() && uploadedImages.length === 0) || isDisabled
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 text-white shadow-sm'
                } transition-all duration-200`}
              >
                <FiSend size={18} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-center mt-2 text-xs">
        {connectionStatus && !connectionStatus.connected ? (
          <motion.span
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            className="text-red-500 dark:text-red-400 flex items-center font-medium"
          >
            {connectionStatus.reconnecting
              ? 'Attempting to reconnect...'
              : 'Server disconnected. Click the button to reconnect.'}
          </motion.span>
        ) : isProcessing ? (
          <motion.span
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            className="text-accent-500 dark:text-accent-400 flex items-center"
          >
            <span className="typing-indicator mr-2">
              <span></span>
              <span></span>
              <span></span>
            </span>
            Agent is processing your request...
          </motion.span>
        ) : (
          <motion.span
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
            className="text-gray-500 dark:text-gray-400 transition-opacity"
          >
            Use Ctrl+Enter to quickly send
          </motion.span>
        )}
      </div>
    </form>
  );
};
