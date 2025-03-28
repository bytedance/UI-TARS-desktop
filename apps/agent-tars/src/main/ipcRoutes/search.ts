import { initIpc } from '@ui-tars/electron-ipc/main';
import { SearchSettings, ToolCall } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';
import { search } from '@main/customTools/search';

const t = initIpc.create();

export const searchRoute = t.router({
  updateSearchConfig: t.procedure
    .input<SearchSettings>()
    .handle(async ({ input }) => {
      try {
        logger.info(
          '[searchRoute.updateSearchConfig] Updating search configuration:',
          maskSensitiveData(input),
        );
        SettingStore.set('search', input);
        return true;
      } catch (error) {
        logger.error(
          '[searchRoute.updateSearchConfig] Failed to update search configuration:',
          error,
        );
        return false;
      }
    }),

  getSearchConfig: t.procedure.input<void>().handle(async () => {
    return SettingStore.get('search');
  }),

  testSearchService: t.procedure
    .input<SearchSettings>()
    .handle(async ({ input }) => {
      try {
        const result = await search(
          {
            function: {
              name: 'search',
              arguments: JSON.stringify({
                query: 'TARS',
                count: 1,
              }),
            },
          } as unknown as ToolCall,
          input,
        );

        if (!Array.isArray(result) || result.length === 0) {
          return {
            success: false,
            message: 'Search result is not an array or empty',
          };
        }

        const firstResult = result[0];
        return {
          success: !firstResult.isError,
          message: JSON.stringify(firstResult.content),
        };
      } catch (error) {
        logger.error(
          '[searchRoute.testSearchService] Failed to test search service:',
          error,
        );
        return {
          success: false,
          message: JSON.stringify(error),
        };
      }
    }),
});
