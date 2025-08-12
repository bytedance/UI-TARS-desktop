import React, { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useSession } from '@/common/hooks/useSession';
import { ConnectionStatus } from '@/common/types';
import { useLocation } from 'react-router-dom';
import { ChatCompletionContentPart } from '@tarko/agent-interface';
import { MessageInputField } from './MessageInputField';
import { MessageAttachments } from './MessageAttachments';
import { contextualSelectorAtom, clearContextualStateAction } from '@/common/state/atoms/contextualSelector';

interface MessageInputProps {
  isDisabled?: boolean;
  onReconnect?: () => void;
  connectionStatus?: ConnectionStatus;
  initialQuery?: string;
}

/**
 * MessageInput Component - Main container for message composition with jotai state management
 *
 * Handles overall state coordination and message sending logic
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  isDisabled = false,
  onReconnect,
  connectionStatus,
}) => {
  const [uploadedImages, setUploadedImages] = useState<ChatCompletionContentPart[]>([]);
  const [contextualState, setContextualState] = useAtom(contextualSelectorAtom);
  const clearContextualState = useSetAtom(clearContextualStateAction);
  
  const location = useLocation();
  const { sendMessage, isProcessing, activeSessionId, checkSessionStatus } = useSession();

  // Auto-submit query from URL parameters for direct navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const query = searchParams.get('q');

    if (query && !isProcessing && activeSessionId && !contextualState.input) {
      setContextualState(prev => ({
        ...prev,
        input: query,
        contextualItems: [],
      }));

      const submitQuery = async () => {
        try {
          await sendMessage(query);
          clearContextualState();
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      };

      submitQuery();
    }
  }, [location.search, activeSessionId, isProcessing, sendMessage, contextualState.input, setContextualState, clearContextualState]);

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

  const handleSubmit = async () => {
    if ((!contextualState.input.trim() && uploadedImages.length === 0) || isDisabled) return;

    // Prepare message content - server will handle contextual expansion
    const messageToSend = contextualState.input.trim();
    
    // Clear all state
    clearContextualState();

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

    try {
      await sendMessage(messageContent);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="relative">
      <MessageAttachments 
        images={uploadedImages}
        contextualItems={contextualState.contextualItems}
        onRemoveImage={handleRemoveImage}
      />
      
      <MessageInputField
        uploadedImages={uploadedImages}
        setUploadedImages={setUploadedImages}
        isDisabled={isDisabled}
        isProcessing={isProcessing}
        connectionStatus={connectionStatus}
        onSubmit={handleSubmit}
        onReconnect={onReconnect}
        sessionId={activeSessionId}
      />
    </div>
  );
};
