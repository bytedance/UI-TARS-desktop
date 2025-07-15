import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '@/common/hooks/useSession';
import { FiSend, FiX, FiRefreshCw, FiImage, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus } from '@/common/types';
import { useLocation } from 'react-router-dom';
import './MessageInput.css';
import { ChatCompletionContentPart } from '@multimodal/agent-interface';
import { ImagePreview } from './ImagePreview';

interface MessageInputProps {
  isDisabled?: boolean;
  onReconnect?: () => void;
  connectionStatus?: ConnectionStatus;
  initialQuery?: string;
}

/**
 * MessageInput Component - Core message input functionality
 *
 * Handles text input, image uploads, and multimodal message composition.
 * Decoupled from action bar components for better separation of concerns.
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

  const { sendMessage, isProcessing, abortQuery, activeSessionId, checkSessionStatus } =
    useSession();

  // Auto-submit query from URL parameters for direct navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');

    if (query && !isProcessing && activeSessionId) {
      setInput(query);

      const submitQuery = async () => {
        try {
          await sendMessage(query);
          setInput('');
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      };

      submitQuery();
    }
  }, [location.search, activeSessionId, isProcessing, sendMessage]);

  // Enhanced session status monitoring during active connections
  useEffect(() => {
    if (activeSessionId && connectionStatus?.connected) {
      checkSessionStatus(activeSessionId);

      const intervalId = setInterval(() => {
        checkSessionStatus(activeSessionId);
      }, 2000);

      return () => clearInterval(intervalId);
    }
  }, [activeSessionId, connectionStatus?.connected, checkSessionStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && uploadedImages.length === 0) || isDisabled) return;

    // Optimize UX by clearing input immediately, not waiting for server response
    const messageToSend = input.trim();
    setInput('');

    // Compose multimodal content when images are present
    const messageContent =
      uploadedImages.length > 0
        ? [
            ...uploadedImages,
            ...(messageToSend
              ? [{ type: 'text', text: messageToSend } as ChatCompletionContentPart]
              : []),
          ]
        : messageToSend;

    setUploadedImages([]);

    // Reset textarea height for better visual feedback
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      // Send the previously captured message content to avoid race conditions
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Ctrl+Enter shortcut for power users, Enter alone doesn't send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);

    // Dynamic height adjustment with proper calculation
    target.style.height = 'auto';
    // Constrain to max height while allowing natural expansion
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDisabled]);

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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

    // Allow re-selection of the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Early exit for disabled states
    if (isDisabled || isProcessing) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let hasProcessedImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.indexOf('image') !== -1) {
        hasProcessedImage = true;

        const blob = item.getAsFile();
        if (!blob) continue;

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
        reader.readAsDataURL(blob);
      }
    }

    // Preserve text pasting while handling images
    if (hasProcessedImage) {
      console.log('Processed pasted image(s)');
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {uploadedImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedImages.map((image, index) => (
            <ImagePreview key={index} image={image} onRemove={() => handleRemoveImage(index)} />
          ))}
        </div>
      )}

      <div
        className={`relative overflow-hidden rounded-3xl transition-all duration-300 ${
          isFocused ? 'shadow-md' : ''
        }`}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-r ${
            isFocused || input.trim() || uploadedImages.length > 0
              ? 'from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-border-flow'
              : 'from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700'
          } bg-[length:200%_200%] ${isFocused ? 'opacity-100' : 'opacity-70'}`}
        ></div>

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
            onPaste={handlePaste}
            placeholder={
              connectionStatus && !connectionStatus.connected
                ? 'Server disconnected...'
                : isProcessing
                  ? 'Agent TARS is running...'
                  : 'Ask Agent TARS something... (Ctrl+Enter to send)'
            }
            disabled={isDisabled}
            className="w-full px-5 pt-4 pb-10 focus:outline-none resize-none min-h-[90px] max-h-[200px] bg-transparent text-sm leading-relaxed rounded-[1.4rem]"
            rows={2}
          />

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
              title="Attach image (or paste directly)"
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
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 text-white dark:text-gray-900 shadow-sm'
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
            Use Ctrl+Enter to quickly send • You can also paste images directly
          </motion.span>
        )}
      </div>
    </form>
  );
};
