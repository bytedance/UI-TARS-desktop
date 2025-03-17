import dotenv from 'dotenv';
import { MCPServerName, Message, MessageData } from '@agent-infra/shared';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { BrowserWindow } from 'electron';
import { LLM, llm, LLMConfig } from '@main/llmProvider';

const t = initIpc.create();

// Load environment variables
dotenv.config();

export type ToolChoice = 'none' | 'auto' | 'required';

const activeStreams = new Map();
const activeRequests = new Map();

export const llmRoute = t.router({
  askLLMText: t.procedure
    .input<{
      messages: MessageData[];
      systemMsgs?: MessageData[];
      requestId: string;
    }>()
    .handle(async ({ input }) => {
      const messages = input.messages.map((msg) => new Message(msg));
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

      (async () => {
        const windows = BrowserWindow.getAllWindows();
        try {
          const stream = llm.askLLMTextStream({ messages, requestId });
          activeStreams.set(requestId, stream);

          for await (const chunk of stream) {
            if (!activeStreams.has(requestId)) {
              windows.forEach((win) => {
                win.webContents.send(`llm:stream:${requestId}:end`);
              });
              return;
            }

            windows.forEach((win) => {
              win.webContents.send(`llm:stream:${requestId}:data`, chunk);
            });
          }

          activeStreams.delete(requestId);
          windows.forEach((win) => {
            win.webContents.send(`llm:stream:${requestId}:end`);
          });
        } catch (error) {
          activeStreams.delete(requestId);
          windows.forEach((win) => {
            win.webContents.send(`llm:stream:${requestId}:error`, error);
          });
        }
      })();

      return requestId;
    }),

  abortRequest: t.procedure
    .input<{ requestId: string }>()
    .handle(async ({ input }) => {
      const { requestId } = input;
      // Abort stream request
      if (activeStreams.has(requestId)) {
        const stream = activeStreams.get(requestId);
        if (stream.cancel) {
          await stream.cancel();
        }
        activeStreams.delete(requestId);
      }
      // Abort non stream request
      if (activeRequests.has(requestId)) {
        const controller = activeRequests.get(requestId);
        controller.abort();
        activeRequests.delete(requestId);
      }
      return true;
    }),

  updateLLMConfig: t.procedure.input<LLMConfig>().handle(async ({ input }) => {
    try {
      llm.setProvider(input, input.configName);
      return true;
    } catch (error) {
      console.error('Failed to update LLM configuration:', error);
      return false;
    }
  }),

  getAvailableProviders: t.procedure.input<void>().handle(async () => {
    try {
      return LLM.getAvailableProviders();
    } catch (error) {
      console.error('Failed to get available providers:', error);
      return [];
    }
  }),
});
