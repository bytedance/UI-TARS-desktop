import {
  MCPServerName,
  Message,
  MessageData,
  ModelSettings,
} from '@agent-infra/shared';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { BrowserWindow } from 'electron';
import { createLLM, LLMConfig } from '@main/llmProvider';
import { ProviderFactory } from '@main/llmProvider/ProviderFactory';
import { SettingStore } from '@main/store/setting';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';
import { extractToolNames } from '@main/utils/extractToolNames';

const t = initIpc.create();

/**
 * Get the current provider configuration based on settings
 */
function getLLMProviderConfig(settings: ModelSettings): LLMConfig {
  const { provider, model, apiKey, apiVersion, endpoint } = settings;
  return {
    configName: provider,
    model,
    apiKey,
    apiVersion,
    // TODO: baseURL || endpoint
    baseURL: endpoint,
  };
}

export const currentLLMConfigRef: {
  current: LLMConfig;
} = {
  current: getLLMProviderConfig(SettingStore.get('model') || {}),
};

export const llmRoute = t.router({
  askLLMText: t.procedure
    .input<{
      messages: MessageData[];
      systemMsgs?: MessageData[];
      requestId: string;
    }>()
    .handle(async ({ input }) => {
      logger.info('[llmRoute.askLLMText] input', input);
      const messages = input.messages.map((msg) => new Message(msg));
      const llm = createLLM(currentLLMConfigRef.current);
      const response = await llm.askLLMText({
        messages,
        requestId: input.requestId,
      });
      logger.info('[llmRoute.askLLMText] response', response);
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
      logger.info('[llmRoute.askLLMTool] input', input);
      const messages = input.messages.map((msg) => new Message(msg));
      logger.info(
        '[llmRoute.askLLMTool] Current LLM Config',
        maskSensitiveData(currentLLMConfigRef.current),
      );
      logger.info(
        '[llmRoute.askLLMTool] Current Search Config',
        maskSensitiveData(SettingStore.get('search')),
      );
      const llm = createLLM(currentLLMConfigRef.current);
      logger.info('[llmRoute.askLLMTool] tools', extractToolNames(input.tools));
      const response = await llm.askTool({
        messages,
        tools: input.tools,
        mcpServerKeys: input.mcpServerKeys,
        requestId: input.requestId,
      });
      logger.info('[llmRoute.askLLMTool] response', response);
      return response;
    }),

  askLLMTextStream: t.procedure
    .input<{
      messages: MessageData[];
      systemMsgs?: MessageData[];
      requestId: string;
    }>()
    .handle(async ({ input }) => {
      logger.info('[llmRoute.askLLMTextStream] input', input);
      const messages = input.messages.map((msg) => new Message(msg));
      const { requestId } = input;
      logger.info(
        '[llmRoute.askLLMTextStream] Current LLM Config',
        maskSensitiveData(currentLLMConfigRef.current),
      );
      const llm = createLLM(currentLLMConfigRef.current);

      (async () => {
        const windows = BrowserWindow.getAllWindows();
        try {
          const stream = llm.askLLMTextStream({ messages, requestId });
          logger.info('[llmRoute.askLLMTextStream] stream', !!stream);

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

  getLLMConfig: t.procedure.input<void>().handle(async () => {
    return SettingStore.get('model');
  }),

  updateLLMConfig: t.procedure
    .input<ModelSettings>()
    .handle(async ({ input }) => {
      logger.info('[llmRoute.updateLLMConfig] input', maskSensitiveData(input));
      try {
        SettingStore.set('model', input);
        currentLLMConfigRef.current = getLLMProviderConfig(input);
        return true;
      } catch (error) {
        logger.error(
          '[llmRoute.updateLLMConfig] Failed to update LLM configuration:',
          error,
        );
        return false;
      }
    }),

  getAvailableProviders: t.procedure.input<void>().handle(async () => {
    try {
      return ProviderFactory.getAvailableProviders();
    } catch (error) {
      logger.error(
        '[llmRoute.getAvailableProviders] Failed to get available providers:',
        error,
      );
      return [];
    }
  }),
  abortRequest: t.procedure
    .input<{ requestId: string }>()
    .handle(async ({ input }) => {
      logger.info('[llmRoute.abortRequest] input', input);
      try {
        const llm = createLLM(currentLLMConfigRef.current);
        llm.abortRequest(input.requestId);
        return true;
      } catch (error) {
        logger.error('[llmRoute.abortRequest] Failed to abort request:', error);
        return false;
      }
    }),
});
