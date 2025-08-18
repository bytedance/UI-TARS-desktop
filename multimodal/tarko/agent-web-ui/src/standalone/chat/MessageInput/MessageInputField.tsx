import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiRefreshCw, FiImage, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus } from '@/common/types';
import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { useSession } from '@/common/hooks/useSession';
import { useAtom, useSetAtom } from 'jotai';
import {
  contextualSelectorAtom,
  addContextualItemAction,
  updateSelectorStateAction,
} from '@/common/state/atoms/contextualSelector';
import { ContextualSelector, ContextualItem } from '../ContextualSelector';

interface MessageInputFieldProps {
  uploadedImages: ChatCompletionContentPart[];
  setUploadedImages: (
    images:
      | ChatCompletionContentPart[]
      | ((prev: ChatCompletionContentPart[]) => ChatCompletionContentPart[]),
  ) => void;
  isDisabled: boolean;
  isProcessing: boolean;
  connectionStatus?: ConnectionStatus;
  onSubmit: () => Promise<void>;
  onReconnect?: () => void;
  sessionId?: string;
}

/**
 * MessageInputField - Handles text input and contextual selector with jotai state management
 *
 * Manages text input, @ symbol detection, contextual selector, and file uploads
 */
export const MessageInputField: React.FC<MessageInputFieldProps> = ({
  uploadedImages,
  setUploadedImages,
  isDisabled,
  isProcessing,
  connectionStatus,
  onSubmit,
  onReconnect,
  sessionId,
}) => {
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const [contextualState, setContextualState] = useAtom(contextualSelectorAtom);
  const addContextualItem = useSetAtom(addContextualItemAction);
  const updateSelectorState = useSetAtom(updateSelectorStateAction);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { abortQuery } = useSession();

  // Check if contextual selector is enabled
  const isContextualSelectorEnabled = window.AGENT_WEB_UI_CONFIG?.enableContextualSelector ?? false;

  useEffect(() => {
    if (!isDisabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDisabled]);

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

    if (!isContextualSelectorEnabled) return;

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
  const parseContextualReferences = (text: string): ContextualItem[] => {
    const contextualReferencePattern = /@(file|dir):([^\s]+)/g;
    const workspacePattern = /@workspace/g;

    const contextualRefs = Array.from(text.matchAll(contextualReferencePattern)).map(
      (match, index) => {
        const [fullMatch, type, relativePath] = match;
        const name = relativePath.split(/[/\\]/).pop() || relativePath;

        return {
          id: `${type}-${relativePath}-${index}`,
          type: type as 'file' | 'directory',
          name,
          path: relativePath,
          relativePath,
        };
      },
    );

    const workspaceRefs = Array.from(text.matchAll(workspacePattern)).map((match, index) => ({
      id: `workspace-${index}`,
      type: 'workspace' as const,
      name: 'workspace',
      path: '/',
      relativePath: '.',
    }));

    return [...contextualRefs, ...workspaceRefs];
  };

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
    handleSelectorClose();

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    await onSubmit();
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

  const handlePaste = (e: React.ClipboardEvent) => {
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

    if (hasProcessedImage) {
      console.log('Processed pasted image(s)');
    }
  };

  return (
    <>
      {/* Contextual selector - positioned above input */}
      {isContextualSelectorEnabled && contextualState.showSelector && (
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
          className={`relative overflow-hidden rounded-3xl transition-all duration-300 ${
            isFocused ? 'shadow-md' : ''
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r ${
              isFocused ||
              contextualState.input.trim() ||
              uploadedImages.length > 0 ||
              contextualState.contextualItems.length > 0
                ? 'from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-border-flow'
                : 'from-indigo-400 via-purple-400 to-pink-400 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300'
            } bg-[length:200%_200%] ${isFocused ? 'opacity-100' : 'opacity-80'}`}
          ></div>

          <div
            className={`relative m-[2px] rounded-[1.4rem] bg-white dark:bg-gray-800 backdrop-blur-sm ${
              isDisabled ? 'opacity-90' : ''
            }`}
          >
            <textarea
              ref={inputRef}
              value={contextualState.input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onPaste={handlePaste}
              placeholder={
                connectionStatus && !connectionStatus.connected
                  ? 'Server disconnected...'
                  : isProcessing
                    ? `${window.AGENT_WEB_UI_CONFIG?.title || 'Agent'} is running...`
                    : isContextualSelectorEnabled
                      ? `Ask ${window.AGENT_WEB_UI_CONFIG?.title || 'Agent'} something... (Use @ to reference files/folders, Ctrl+Enter to send)`
                      : `Ask ${window.AGENT_WEB_UI_CONFIG?.title || 'Agent'} something... (Ctrl+Enter to send)`
              }
              disabled={isDisabled}
              className="w-full px-5 pt-5 pb-12 focus:outline-none resize-none min-h-[100px] max-h-[220px] bg-transparent text-sm leading-relaxed rounded-[1.4rem]"
              rows={2}
            />

            <div className="absolute left-3 bottom-3 flex items-center gap-2">
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
                  {...{ ['ke' + 'y']: 'reconnect-btn' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  type="button"
                  onClick={onReconnect}
                  className="absolute right-3 bottom-3 p-2 rounded-full text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400 transition-all duration-200"
                  title="Try to reconnect"
                >
                  <FiRefreshCw
                    size={20}
                    className={connectionStatus.reconnecting ? 'animate-spin' : ''}
                  />
                </motion.button>
              ) : isProcessing ? (
                <motion.button
                  {...{ ['ke' + 'y']: 'abort-btn' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  type="button"
                  onClick={handleAbort}
                  disabled={isAborting}
                  className={`absolute right-3 bottom-3 p-2 rounded-full ${
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
                  {...{ ['ke' + 'y']: 'send-btn' }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  type="submit"
                  disabled={
                    (!contextualState.input.trim() && uploadedImages.length === 0) || isDisabled
                  }
                  className={`absolute right-3 bottom-3 p-3 rounded-full ${
                    (!contextualState.input.trim() && uploadedImages.length === 0) || isDisabled
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
      </form>

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
            {isContextualSelectorEnabled ? (
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
    </>
  );
};
