import {
  InputFile,
  InputFileType,
  MessageRole,
  MessageType,
} from '@vendor/chat-ui';
import { useAppChat } from './useAppChat';
import { useCallback } from 'react';

export function useAddUserMessage() {
  const { addMessage } = useAppChat();

  const addUserMessage = useCallback(
    async (inputText: string, inputFiles: InputFile[]) => {
      await addMessage(
        {
          type: MessageType.PlainText,
          content: inputText,
          role: MessageRole.User,
          timestamp: Date.now(),
        },
        {
          shouldSyncStorage: true,
        },
      );

      if (inputFiles.length > 0) {
        for (const file of inputFiles) {
          const normalizedFile =
            file.type === InputFileType.Image
              ? file
              : {
                  ...file,
                  content: '',
                };

          await addMessage(
            {
              role: MessageRole.User,
              type: MessageType.File,
              content: normalizedFile,
              isFinal: true,
              timestamp: Date.now(),
            },
            {
              shouldSyncStorage: true,
            },
          );
        }
      }
    },
    [addMessage],
  );

  return addUserMessage;
}
