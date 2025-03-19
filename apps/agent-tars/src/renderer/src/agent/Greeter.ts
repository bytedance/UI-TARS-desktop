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
          Message.systemMessage(
            `You are a friendly greeter. Your role is to understand and empathize with users first. Listen carefully to their needs, acknowledge their concerns, and provide a warm, professional response. Before diving into the solution, express your understanding and confirm your commitment to help. Keep your initial response brief and encouraging, without detailing the specific steps you'll take.Don't ask user anything, just greet them.You should be very enthusiastic and positive.Give a warm and friendly greeting to the user.In the meantime, tell the user you will be ready to help them as soon as possible, let user know you are ready to help them.Don't ask user anything.`,
          ),
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
