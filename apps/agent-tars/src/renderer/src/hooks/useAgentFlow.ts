import { useCallback } from 'react';
import { useAppChat } from './useAppChat';
import { InputFile, MessageRole } from '@vendor/chat-ui';
import { AgentFlow } from '../agent/AgentFlow';
import { EventItem } from '@renderer/type/event';
import { useAtom } from 'jotai';
import {
  agentStatusTipAtom,
  currentAgentFlowIdRefAtom,
  currentEventIdAtom,
  eventsAtom,
  planTasksAtom,
} from '@renderer/state/chat';
import { v4 as uuid } from 'uuid';
import { PlanTask } from '@renderer/type/agent';
import { showCanvasAtom } from '@renderer/state/canvas';
import { useChatSessions } from './useChatSession';
import { DEFAULT_APP_ID } from '@renderer/components/LeftSidebar';
import { ipcClient } from '@renderer/api';
import { Message } from '@agent-infra/shared';

export interface AppContext {
  chatUtils: ReturnType<typeof useAppChat>;
  request: {
    inputText: string;
    inputFiles: InputFile[];
  };
  agentFlowId: string;
  setEventId: (eventId: string) => void;
  setEvents: React.Dispatch<React.SetStateAction<EventItem[]>>;
  setAgentStatusTip: (status: string) => void;
  setPlanTasks: (tasks: PlanTask[]) => void;
  setShowCanvas: (show: boolean) => void;
}

export function useAgentFlow() {
  const chatUtils = useAppChat();
  const [, setEvents] = useAtom(eventsAtom);
  const [, setAgentStatusTip] = useAtom(agentStatusTipAtom);
  const [currentAgentFlowIdRef] = useAtom(currentAgentFlowIdRefAtom);
  const [, setShowCanvas] = useAtom(showCanvasAtom);
  const [, setEventId] = useAtom(currentEventIdAtom);
  const [, setPlanTasks] = useAtom(planTasksAtom);
  const { updateChatSession, currentSessionId } = useChatSessions({
    appId: DEFAULT_APP_ID,
  });

  const updateSessionTitle = useCallback(
    async (input: string) => {
      if (!currentSessionId) {
        return;
      }
      const userMessages = chatUtils.messages
        .filter((m) => m.role === MessageRole.User)
        .slice(-5);
      const userMessageContent =
        userMessages.map((m) => m.content).join('\n') + input;
      const result = await ipcClient.askLLMText({
        messages: [
          Message.systemMessage(
            `You are conversation summary expert.Please give a title for the coversation topic, the topic should be no more than 20 words.You can only output the topic content, don't output any other words.Use the same with as the language of the user input.The language should be the same as the user input.`,
          ),
          Message.userMessage(
            `user input: ${userMessageContent}, please give me the topic title.`,
          ),
        ],
        requestId: uuid(),
      });
      await updateChatSession(currentSessionId, {
        name: result,
      });
    },
    [currentSessionId, updateChatSession, chatUtils.messages],
  );

  return useCallback(
    async (inputText: string, inputFiles: InputFile[]) => {
      const agentFlowId = uuid();
      currentAgentFlowIdRef.current = agentFlowId;
      const agentFlow = new AgentFlow({
        chatUtils,
        setEvents,
        setEventId,
        setAgentStatusTip,
        setPlanTasks,
        setShowCanvas,
        agentFlowId,
        request: {
          inputText,
          inputFiles,
        },
      });
      await Promise.all([agentFlow.run(), updateSessionTitle(inputText)]);
    },
    [chatUtils, setEvents, updateSessionTitle],
  );
}
