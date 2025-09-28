import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiSend, FiRefreshCw, FiImage, FiSquare, FiX } from 'react-icons/fi';
import { TbBulb, TbSearch, TbBook, TbSettings, TbBrain, TbBrowser } from 'react-icons/tb';
import { AnimatePresence, motion } from 'framer-motion';
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
import { NavbarModelSelector } from '@/standalone/navbar/ModelSelector';
import { AgentOptionsSelector, AgentOptionsSelectorRef } from './AgentOptionsSelector';
import { HomeAgentOptionsSelector } from '@/standalone/home/HomeAgentOptionsSelector';
import { HomeChatBottomSettings } from '@/standalone/home/HomeChatBottomSettings';
import { ChatBottomSettings } from './ChatBottomSettings';
import { useNavbarStyles } from '@tarko/ui';

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
  showHelpText?: boolean;
  variant?: 'default' | 'home';
}

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
  showHelpText = true,
  variant = 'default',
}) => {
  const [uploadedImages, setUploadedImages] = useState<ChatCompletionContentPart[]>([]);
  const [isAborting, setIsAborting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeAgentOptions, setActiveAgentOptions] = useState<
    Array<{ key: string; title: string; currentValue: any; displayValue?: string }>
  >([]);
  const [hasAgentOptions, setHasAgentOptions] = useState(false);
  const agentOptionsSelectorRef = useRef<AgentOptionsSelectorRef | null>(null);

  const { activeSessionId, sessionMetadata } = useSession();
  const { isDarkMode } = useNavbarStyles();

  const [contextualState, setContextualState] = useAtom(contextualSelectorAtom);
  const addContextualItem = useSetAtom(addContextualItemAction);
  const updateSelectorState = useSetAtom(updateSelectorStateAction);
  const clearContextualState = useSetAtom(clearContextualStateAction);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { abortQuery } = useSession();

  const contextualSelectorEnabled = isContextualSelectorEnabled() && showContextualSelector;

  // Clear active agent options when session changes
  useEffect(() => {
    setActiveAgentOptions([]);
    setHasAgentOptions(false);
  }, [sessionId]);

  const handleSchemaChange = useCallback((hasOptions: boolean) => {
    setHasAgentOptions(hasOptions);
  }, []);

  const handleActiveOptionsChange = useCallback(
    (options: Array<{ key: string; title: string; currentValue: any; displayValue?: string }>) => {
      setActiveAgentOptions(options);
    },
    [],
  );

  const handleToggleOption = useCallback((key: string, currentValue: any) => {
    // Use the ref to call the toggle method on AgentOptionsSelector
    if (agentOptionsSelectorRef.current) {
      if (currentValue === undefined) {
        // This is a remove operation - no need to toggle, just handled by AgentOptionsSelector
        return;
      }
      agentOptionsSelectorRef.current.toggleOption(key);
    }
  }, []);

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

    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;

    setContextualState((prev) => ({
      ...prev,
      input: newValue,
      cursorPosition: newCursorPosition,
      contextualItems: parseContextualReferences(newValue),
    }));

    if (!contextualSelectorEnabled) return;

    const textBeforeCursor = newValue.slice(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValidAtPosition = /\s/.test(charBeforeAt) || lastAtIndex === 0;

      if (isValidAtPosition) {
        const queryAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

        if (!queryAfterAt.includes(' ') && !queryAfterAt.includes(':')) {
          updateSelectorState({
            showSelector: true,
            selectorQuery: queryAfterAt,
          });
          return;
        }
      }
    }

    if (contextualState.showSelector) {
      updateSelectorState({
        showSelector: false,
        selectorQuery: '',
      });
    }
  };

  const handleContextualSelect = (item: ContextualItem) => {
    addContextualItem(item);

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
      const newCursorPos = lastAtIndex + tagText.length + 1;

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);

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

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const messageContent = composeMessageContent(contextualState.input, uploadedImages);

    clearContextualState();
    setUploadedImages([]);

    try {
      await onSubmit(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);

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

    e.preventDefault();

    const handled = await handleMultimodalPaste(e.nativeEvent, {
      onTextPaste: (text: string) => {
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
              className={`w-full px-5 ${
                uploadedImages.length > 0 ? 'pt-2' : 'pt-5'
              } pb-12 focus:outline-none resize-none ${
                uploadedImages.length > 0
                  ? variant === 'home'
                    ? 'min-h-[100px]'
                    : 'min-h-[80px]'
                  : variant === 'home'
                    ? 'min-h-[120px]'
                    : 'min-h-[100px]'
              } max-h-[220px] bg-transparent text-sm leading-relaxed rounded-[1.4rem]`}
              rows={2}
            />

            {/* Left side controls */}
            <div className="absolute left-3 bottom-3 flex items-center gap-2">
              {/* Home mode: Show home AgentOptionsSelector and HomeChatBottomSettings */}
              {variant === 'home' && (
                <>
                  <HomeAgentOptionsSelector
                    showAttachments={showAttachments}
                    onFileUpload={handleFileUpload}
                  />
                  <HomeChatBottomSettings isDisabled={isDisabled} isProcessing={isProcessing} />
                </>
              )}

              {/* Session mode: Show existing AgentOptionsSelector */}
              {variant !== 'home' && (
                <AgentOptionsSelector
                  ref={agentOptionsSelectorRef}
                  activeSessionId={sessionId}
                  sessionMetadata={sessionMetadata}
                  onActiveOptionsChange={handleActiveOptionsChange}
                  onSchemaChange={handleSchemaChange}
                  onToggleOption={handleToggleOption}
                  showAttachments={showAttachments}
                  onFileUpload={handleFileUpload}
                  isDisabled={isDisabled}
                  isProcessing={isProcessing}
                />
              )}

              {/* Fallback image upload button when no agent options and not home mode */}
              {variant !== 'home' && !hasAgentOptions && showAttachments && (
                <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={isDisabled || isProcessing}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400 transition-all duration-200 hover:scale-105 active:scale-90"
                  title="Add Images"
                >
                  <FiImage size={18} />
                </button>
              )}

              {/* Unified chat bottom settings - only for session mode */}
              {variant !== 'home' && (
                <ChatBottomSettings
                  activeSessionId={sessionId}
                  sessionMetadata={sessionMetadata}
                  activeOptions={activeAgentOptions}
                  onRemoveOption={(key) => {
                    if (agentOptionsSelectorRef.current) {
                      agentOptionsSelectorRef.current.removeOption(key);
                    }
                  }}
                  isDisabled={isDisabled}
                  isProcessing={isProcessing}
                />
              )}
            </div>

            {/* Hidden file input for image upload */}
            {showAttachments && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                className="hidden"
                disabled={isDisabled || isProcessing}
              />
            )}

            {/* Action buttons */}
            <AnimatePresence mode="wait">
              {connectionStatus && !connectionStatus.connected ? (
                <motion.button
                  key="reconnect-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={onReconnect}
                  className="absolute right-3 bottom-3 p-2 rounded-full text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30 dark:text-gray-400 transition-all duration-200 hover:scale-105 active:scale-90"
                  title="Try to reconnect"
                >
                  <FiRefreshCw
                    size={20}
                    className={connectionStatus.reconnecting ? 'animate-spin' : ''}
                  />
                </motion.button>
              ) : isProcessing ? (
                <motion.button
                  key="abort-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  type="button"
                  onClick={handleAbort}
                  disabled={isAborting}
                  className={`absolute right-3 bottom-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isAborting
                      ? 'bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-800/30 dark:via-purple-800/30 dark:to-pink-800/30 text-indigo-400 dark:text-indigo-500 cursor-not-allowed border-2 border-indigo-200 dark:border-indigo-700/50'
                      : 'bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 hover:from-indigo-100 hover:via-purple-100 hover:to-pink-100 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 dark:hover:from-indigo-900/30 dark:hover:via-purple-900/30 dark:hover:to-pink-900/30 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-700/50'
                  } shadow-sm bg-[length:200%_200%] animate-border-flow`}
                  title="Stop generation"
                >
                  {isAborting ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-3 h-3 bg-current rounded-sm" />
                  )}
                </motion.button>
              ) : (
                <motion.button
                  key="send-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="submit"
                  disabled={isMessageEmpty(contextualState.input, uploadedImages) || isDisabled}
                  className={`absolute right-3 bottom-3 p-3 rounded-full transition-all duration-200 hover:scale-105 active:scale-90 ${
                    isMessageEmpty(contextualState.input, uploadedImages) || isDisabled
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 text-white dark:text-gray-900 shadow-sm'
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
      {showHelpText && (
        <div className="flex justify-center mt-2 text-xs">
          {connectionStatus && !connectionStatus.connected ? (
            <span className="text-red-500 dark:text-red-400 flex items-center font-medium animate-in fade-in duration-300">
              {connectionStatus.reconnecting
                ? 'Attempting to reconnect...'
                : 'Server disconnected. Click the button to reconnect.'}
            </span>
          ) : isProcessing ? (
            <span className="text-accent-500 dark:text-accent-400 flex items-center animate-in fade-in duration-300">
              <span className="typing-indicator mr-2">
                <span></span>
                <span></span>
                <span></span>
              </span>
              Agent is processing your request...
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400 transition-opacity hover:opacity-100 animate-in fade-in duration-300">
              {contextualSelectorEnabled ? (
                <>
                  Use @ to reference files/folders • Ctrl+Enter to send • You can also paste images
                  directly
                </>
              ) : (
                <>Use Ctrl+Enter to quickly send • You can also paste images directly</>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
