import { useChat } from '@vendor/chat-ui';
import { STORAGE_DB_NAME } from '@renderer/constants';
import { MessageContentType } from '@renderer/type/chatMessage';
import { useChatSessions } from './useChatSession';
import { DEFAULT_APP_ID } from '@renderer/components/LeftSidebar';

export function useAppChat() {
  const { currentSessionId } = useChatSessions({
    appId: DEFAULT_APP_ID,
  });
  return useChat<MessageContentType>({
    storageDbName: STORAGE_DB_NAME,
    conversationId: currentSessionId || 'default',
  });
}
