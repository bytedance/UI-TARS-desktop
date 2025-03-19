import { MCPServerName, Message, MessageData } from '@agent-infra/shared';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { BrowserWindow } from 'electron';
import { createLLM, LLMConfig } from '@main/llmProvider';
import { ProviderFactory } from '@main/llmProvider/ProviderFactory';

const t = initIpc.create();

const currentLLMConfigRef: {
  current: LLMConfig;
} = {
  current: {},
};

export const llmRoute = t.router({
  askLLMText: t.procedure
    .input<{
      messages: MessageData[];
      systemMsgs?: MessageData[];
      requestId: string;
    }>()
    .handle(async ({ input }) => {
      const messages = input.messages.map((msg) => new Message(msg));
      const llm = createLLM(currentLLMConfigRef.current);
      const response = await llm.askLLMText({
        messages,
        requestId: input.requestId,
      });
      return response;
    }),

  askLLMTool: t.procedure
    .input<{
      messages: MessageData[];
      tools: ChatCompletionTool[];
      mcpServerKeys?: MCPServerName[];
      requestId: string;
    }>()
    .handle(async ({ input }) => {
      const messages = input.messages.map((msg) => new Message(msg));
      const llm = createLLM(currentLLMConfigRef.current);
      console.log('current llm config', currentLLMConfigRef.current);
      const response = await llm.askTool({
        messages,
        tools: input.tools,
        mcpServerKeys: input.mcpServerKeys,
        requestId: input.requestId,
      });
      return response;
    }),

  askLLMTextStream: t.procedure
    .input<{
      messages: MessageData[];
      systemMsgs?: MessageData[];
      requestId: string;
    }>()
    .handle(async ({ input }) => {
      const messages = input.messages.map((msg) => new Message(msg));
      const { requestId } = input;
      console.log('current llm config', currentLLMConfigRef.current);
      const llm = createLLM(currentLLMConfigRef.current);

      (async () => {
        const windows = BrowserWindow.getAllWindows();
        try {
          const stream = llm.askLLMTextStream({ messages, requestId });

          for await (const chunk of stream) {
            if (!windows.length) {
              return;
            }

            windows.forEach((win) => {
              win.webContents.send(`llm:stream:${requestId}:data`, chunk);
            });
          }

          windows.forEach((win) => {
            win.webContents.send(`llm:stream:${requestId}:end`);
          });
        } catch (error) {
          windows.forEach((win) => {
            win.webContents.send(`llm:stream:${requestId}:error`, error);
          });
        }
      })();

      return requestId;
    }),

  updateLLMConfig: t.procedure.input<LLMConfig>().handle(async ({ input }) => {
    try {
      console.log('input entered', input);
      currentLLMConfigRef.current = input;
      return true;
    } catch (error) {
      console.error('Failed to update LLM configuration:', error);
      return false;
    }
  }),

  getAvailableProviders: t.procedure.input<void>().handle(async () => {
    try {
      return ProviderFactory.getAvailableProviders();
    } catch (error) {
      console.error('Failed to get available providers:', error);
      return [];
    }
  }),
  abortRequest: t.procedure
    .input<{ requestId: string }>()
    .handle(async ({ input }) => {
      try {
        const llm = createLLM(currentLLMConfigRef.current);
        llm.abortRequest(input.requestId);
        return true;
      } catch (error) {
        console.error('Failed to abort request:', error);
        return false;
      }
    }),
});
