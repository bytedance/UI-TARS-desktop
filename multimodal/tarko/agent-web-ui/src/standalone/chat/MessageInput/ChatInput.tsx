import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiRefreshCw, FiImage, FiSquare, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus } from '@/common/types';
import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { useSession } from '@/common/hooks/useSession';
import { useAtom, useSetAtom } from 'jotai';
import {
  contextualSelectorAtom,
  addContextualItemAction,
  updateSelectorStateAction,
  clearContextualStateAction,
  ContextualItem,
} from '@/common/state/atoms/contextualSelector';
import { ContextualSelector } from '../ContextualSelector';
import { MessageAttachments } from './MessageAttachments';
import { ImagePreviewInline } from './ImagePreviewInline';
import { getAgentTitle, isContextualSelectorEnabled } from '@/config/web-ui-config';
import { composeMessageContent, isMessageEmpty, parseContextualReferences } from './utils';
import { handleMultimodalPaste } from '@/common/utils/clipboard';

interface ChatInputProps {
  onSubmit: (content: string | ChatCompletionContentPart[]) => Promise<void>;
  isDisabled?: boolean;
  isProcessing?: boolean;
  connectionStatus?: ConnectionStatus;
  onReconnect?: () => void;
  sessionId?: string;
  placeholder?: string;
  className?: string;
  showAttachments?: boolean;
  showContextualSelector?: boolean;
  initialValue?: string;
  autoFocus?: boolean;
}

/**
 * ChatInput - Reusable chat input component with multimodal and contextual capabilities
 *
 * Features:
 * - Text input with auto-resize
 * - Image upload and paste support
 * - Contextual file/folder selector (@-mentions)
 * - Connection status handling
 * - Keyboard shortcuts (Ctrl+Enter to send)
 * - Customizable appearance and behavior
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSubmit,
  isDisabled = false,
  isProcessing = false,
  connectionStatus,
  onReconnect,
  sessionId,
  placeholder,
  className = '',
  showAttachments = true,
  showContextualSelector = true,
  initialValue = '',
  autoFocus = true,
}) => {
  const [uploadedImages, setUploadedImages] = useState<ChatCompletionContentPart[]>([]);
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [contextualState, setContextualState] = useAtom(contextualSelectorAtom);
  const addContextualItem = useSetAtom(addContextualItemAction);
  const updateSelectorState = useSetAtom(updateSelectorStateAction);
  const clearContextualState = useSetAtom(clearContextualStateAction);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { abortQuery } = useSession();

  // Check if contextual selector is enabled
  const contextualSelectorEnabled = isContextualSelectorEnabled() && showContextualSelector;

  // Initialize with initial value
  useEffect(() => {
    if (initialValue && !contextualState.input) {
      setContextualState((prev) => ({
        ...prev,
        input: initialValue,
        contextualItems: parseContextualReferences(initialValue),
      }));
    }
  }, [initialValue, contextualState.input, setContextualState]);

  useEffect(() => {
    if (!isDisabled && autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDisabled, autoFocus]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    const newValue = target.value;
    const newCursorPosition = target.selectionStart;

    // Dynamic height adjustment
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;

    // Update contextual state with new input and cursor position
    setContextualState((prev) => ({
      ...prev,
      input: newValue,
      cursorPosition: newCursorPosition,
      contextualItems: parseContextualReferences(newValue),
    }));

    if (!contextualSelectorEnabled) return;

    // Check for @ symbol at cursor position
    const textBeforeCursor = newValue.slice(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start of line or preceded by whitespace
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValidAtPosition = /\s/.test(charBeforeAt) || lastAtIndex === 0;

      if (isValidAtPosition) {
        const queryAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

        // Only show selector if there's no space after @ and not already a complete reference
        if (!queryAfterAt.includes(' ') && !queryAfterAt.includes(':')) {
          updateSelectorState({
            showSelector: true,
            selectorQuery: queryAfterAt,
          });
          return;
        }
      }
    }

    // Hide selector if conditions are not met
    if (contextualState.showSelector) {
      updateSelectorState({
        showSelector: false,
        selectorQuery: '',
      });
    }
  };

  // Parse contextual references from input text

  const handleContextualSelect = (item: ContextualItem) => {
    addContextualItem(item);

    // Calculate the correct cursor position after insertion
    const textBeforeCursor = contextualState.input.slice(0, contextualState.cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textBefore = contextualState.input.slice(0, lastAtIndex);
      const textAfter = contextualState.input.slice(contextualState.cursorPosition);

      let tagText: string;
      if (item.type === 'workspace') {
        tagText = '@workspace';
      } else {
        tagText = `${item.type === 'directory' ? '@dir:' : '@file:'}${item.relativePath}`;
      }

      const newInput = textBefore + tagText + ' ' + textAfter;
      const newCursorPos = lastAtIndex + tagText.length + 1; // +1 for the space after

      // Focus back to input and set correct cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);

          // Update contextual state with the new cursor position
          setContextualState((prev) => ({
            ...prev,
            cursorPosition: newCursorPos,
          }));
        }
      }, 0);
    }
  };

  const handleSelectorClose = () => {
    updateSelectorState({
      showSelector: false,
      selectorQuery: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMessageEmpty(contextualState.input, uploadedImages) || isDisabled) return;

    handleSelectorClose();

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Compose message content using utility function
    const messageContent = composeMessageContent(contextualState.input, uploadedImages);

    // Clear both text input and images immediately after sending
    clearContextualState();
    setUploadedImages([]);

    try {
      await onSubmit(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Note: We don't restore content on failure to keep UX simple
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const pressedKey = e.key;
    if (pressedKey === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (pressedKey === 'Escape' && contextualState.showSelector) {
      e.preventDefault();
      handleSelectorClose();
    }
  };

  const handleAbort = async () => {
    if (!isProcessing || isAborting) return;

    setIsAborting(true);
    try {
      const success = await abortQuery();
      if (!success) {
        console.warn('Abort request may have failed');
      }
    } catch (error) {
      console.error('Failed to abort:', error);
    } finally {
      // Add a small delay to prevent UI flickering
      setTimeout(() => setIsAborting(false), 100);
    }
  };

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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (isDisabled || isProcessing) return;

    // Prevent default paste behavior to handle it ourselves
    e.preventDefault();

    const handled = await handleMultimodalPaste(e.nativeEvent, {
      onTextPaste: (text: string) => {
        // For regular text, let the default textarea paste behavior handle it
        // by inserting at cursor position
        const textarea = inputRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentValue = contextualState.input;
        const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
        const newCursorPos = start + text.length;

        setContextualState((prev) => ({
          ...prev,
          input: newValue,
          cursorPosition: newCursorPos,
          contextualItems: parseContextualReferences(newValue),
        }));

        // Set cursor position after state update
        setTimeout(() => {
          if (textarea) {
            textarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      },
      onImagePaste: showAttachments
        ? (images: ChatCompletionContentPart[]) => {
            setUploadedImages((prev) => [...prev, ...images]);
            console.log('Processed pasted image(s)');
          }
        : undefined,
      onMultimodalPaste: showAttachments
        ? (text: string, images: ChatCompletionContentPart[]) => {
            // Handle Tarko multimodal protocol paste
            const textarea = inputRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentValue = contextualState.input;
            const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
            const newCursorPos = start + text.length;

            setContextualState((prev) => ({
              ...prev,
              input: newValue,
              cursorPosition: newCursorPos,
              contextualItems: parseContextualReferences(newValue),
            }));

            setUploadedImages((prev) => [...prev, ...images]);

            // Set cursor position after state update
            setTimeout(() => {
              if (textarea) {
                textarea.setSelectionRange(newCursorPos, newCursorPos);
              }
            }, 0);

            console.log('Processed Tarko multimodal clipboard data:', {
              text,
              imageCount: images.length,
            });
          }
        : undefined,
    });

    if (!handled) {
      // If our handler didn't process anything, fall back to default behavior
      // This shouldn't happen often since we handle most cases
      console.log('Paste not handled by multimodal clipboard');
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const defaultPlaceholder =
    connectionStatus && !connectionStatus.connected
      ? 'Server disconnected...'
      : isProcessing
        ? `${getAgentTitle()} is running...`
        : contextualSelectorEnabled
          ? `Ask ${getAgentTitle()} something... (Use @ to reference files/folders, Ctrl+Enter to send)`
          : `Ask ${getAgentTitle()} something... (Ctrl+Enter to send)`;

  return (
    <div className={`relative ${className}`}>
      {/* Only show contextual items outside, images are now inside input */}
      {showAttachments && contextualState.contextualItems.length > 0 && (
        <MessageAttachments
          images={[]}
          contextualItems={contextualState.contextualItems}
          onRemoveImage={handleRemoveImage}
        />
      )}

      {/* Contextual selector - positioned above input */}
      {contextualSelectorEnabled && contextualState.showSelector && (
        <div className="absolute left-0 right-0 bottom-full mb-2 z-50">
          <ContextualSelector
            isOpen={contextualState.showSelector}
            query={contextualState.selectorQuery}
            onSelect={handleContextualSelect}
            onClose={handleSelectorClose}
          />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          className={`relative overflow-hidden rounded-2xl transition-all duration-200 ${
            isFocused ? 'shadow-lg shadow-black/10 dark:shadow-white/5' : 'shadow-md shadow-black/5'
          }`}
        >
          <div
            className={`relative bg-white dark:bg-gray-900 border-2 transition-all duration-200 ${
              isFocused
                ? 'border-black dark:border-white'
                : 'border-gray-300 dark:border-gray-600'
            } rounded-2xl ${
              isDisabled ? 'opacity-60' : ''
            }`}
          >
            {/* Image previews inside input */}
            {showAttachments && (
              <ImagePreviewInline images={uploadedImages} onRemoveImage={handleRemoveImage} />
            )}

            <textarea
              ref={inputRef}
              value={contextualState.input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onPaste={handlePaste}
              placeholder={placeholder || defaultPlaceholder}
              disabled={isDisabled}
              className={`w-full px-5 ${uploadedImages.length > 0 ? 'pt-2' : 'pt-5'} pb-12 focus:outline-none resize-none ${uploadedImages.length > 0 ? 'min-h-[80px]' : 'min-h-[100px]'} max-h-[220px] bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm leading-relaxed rounded-2xl`}
              rows={2}
            />

            {/* File upload button */}
            {showAttachments && (
              <div className="absolute left-3 bottom-3 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleFileUpload}
                  disabled={isDisabled || isProcessing}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    isDisabled || isProcessing
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
            )}

            {/* Action buttons */}
            <AnimatePresence mode="wait">
              {connectionStatus && !connectionStatus.connected ? (
                <motion.button
                  {...{ ['ke' + 'y']: 'reconnect-btn' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  type="button"
                  onClick={onReconnect}
                  className="absolute right-3 bottom-3 p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white transition-all duration-200 shadow-sm"
                  title="Try to reconnect"
                >
                  <FiRefreshCw
                    size={18}
                    className={connectionStatus.reconnecting ? 'animate-spin' : ''}
                  />
                </motion.button>
              ) : isProcessing ? (
                <motion.button
                  {...{ ['ke' + 'y']: 'abort-btn' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  type="button"
                  onClick={handleAbort}
                  disabled={isAborting}
                  className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
                    isAborting
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 hover:bg-black dark:hover:bg-white'
                  }`}
                  title="Stop generation"
                >
                  {isAborting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiSquare size={14} />
                  )}
                </motion.button>
              ) : (
                <motion.button
                  {...{ ['ke' + 'y']: 'send-btn' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  type="submit"
                  disabled={isMessageEmpty(contextualState.input, uploadedImages) || isDisabled}
                  className={`absolute right-3 bottom-3 p-3 rounded-full transition-all duration-200 shadow-sm ${
                    isMessageEmpty(contextualState.input, uploadedImages) || isDisabled
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100'
                  }`}
                >
                  <FiSend size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </form>

      {/* Status text */}
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
            className="text-gray-700 dark:text-gray-300 flex items-center"
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
            {contextualSelectorEnabled ? (
              <>
                Use @ to reference files/folders • Ctrl+Enter to send • You can also paste images
                directly
              </>
            ) : (
              <>Use Ctrl+Enter to quickly send • You can also paste images directly</>
            )}
          </motion.span>
        )}
      </div>
    </div>
  );
};
