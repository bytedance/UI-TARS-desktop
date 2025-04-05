import { MessageType } from '@vendor/chat-ui';
import { Message } from '@agent-infra/shared';
import { ipcClient, onMainStreamEvent } from '@renderer/api';
import { AppContext } from '@renderer/hooks/useAgentFlow';
import { globalEventEmitter } from '@renderer/state/chat';

export class Greeter {
  constructor(
    private appContext: AppContext,
    private abortSignal: AbortSignal,
  ) {}

  async run() {
    try {
      let greetMessage = '';
      const inputText = this.appContext.request.inputText;

      const streamId = await ipcClient.askLLMTextStream({
        messages: [
          Message.systemMessage(`
            You are a friendly greeter. Your role is to:
            - Understand and empathize with users first
            - Provide a warm, professional response
            - Add a small amount of emoji to enhance the atmosphere
            - Keep your greeting brief and encouraging
            - Be enthusiastic and positive
            - Let the user know you're ready to help them
            - Returns normal text instead of markdown format or html format
            
            Don't ask the user any questions, just greet them warmly.
          `),
          Message.userMessage(inputText),
        ],
        requestId: Math.random().toString(36).substring(7),
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      return new Promise((resolve, reject) => {
        if (this.abortSignal.aborted) {
          ipcClient.abortRequest({ requestId: streamId });
          resolve('');
          return;
        }

        let aborted = false;
        globalEventEmitter.addListener(this.appContext.agentFlowId, (event) => {
          if (event.type === 'terminate') {
            ipcClient.abortRequest({ requestId: streamId });
            resolve(greetMessage);
            aborted = true;
            cleanup();
          }
        });

        const cleanup = onMainStreamEvent(streamId, {
          onData: async (chunk: string) => {
            if (aborted) {
              return;
            }
            greetMessage += chunk;
            await this.appContext.chatUtils.updateMessage(
              {
                type: MessageType.PlainText,
                content: greetMessage,
              },
              {
                shouldSyncStorage: true,
              },
            );
          },
          onError: (error: Error) => {
            reject(error);
            cleanup();
          },
          onEnd: async () => {
            resolve(greetMessage);
            cleanup();
          },
        });
      });
    } catch (error: any) {
      console.log(error);
      throw error;
    }
  }
}
