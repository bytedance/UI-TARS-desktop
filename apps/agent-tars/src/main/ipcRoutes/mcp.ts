import { MCPServerSetting } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { MCPClient } from '@agent-infra/mcp-client';
import { logger } from '@main/utils/logger';

const t = initIpc.create();

export const mcpRoute = t.router({
  getMcpSettings: t.procedure.input<void>().handle(async () => {
    const settings = SettingStore.getStore();
    return (
      settings.mcp || {
        servers: [],
      }
    );
  }),
  getMcpServers: t.procedure.input<void>().handle(async () => {
    const settings = SettingStore.getStore();
    return settings.mcp?.servers || [];
  }),
  addMcpServer: t.procedure
    .input<MCPServerSetting>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const currMcpServers = settings.mcp?.servers || [];
      currMcpServers.unshift(input);

      SettingStore.setStore({
        ...settings,
        mcp: {
          ...settings.mcp,
          servers: currMcpServers,
        },
      });
      return true;
    }),
  checkServerStatus: t.procedure
    .input<MCPServerSetting>()
    .handle(async ({ input }) => {
      try {
        const client = new MCPClient([input]);
        const statusMap = await client.checkServerStatus(input.name);
        logger.info('listMcpTools statusMap', statusMap);
        await client?.cleanup();
        return {
          statusMap,
          error: null,
        };
      } catch (error: unknown) {
        logger.error('listMcpTools error', error);
        const rawErrorMessage =
          error instanceof Error ? error.message : JSON.stringify(error);
        return {
          statusMap: null,
          error: rawErrorMessage,
        };
      }
    }),
  updateMcpServer: t.procedure
    .input<MCPServerSetting>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const mcpServers = settings.mcp?.servers || [];

      const currMcpServerIndex = mcpServers.findIndex(
        (server) => server.id === input.id,
      );

      if (currMcpServerIndex !== -1) {
        mcpServers[currMcpServerIndex] = input;
        SettingStore.setStore({
          ...settings,
          mcp: {
            ...settings.mcp,
            servers: mcpServers,
          },
        });
      }
    }),
  deleteMcpServer: t.procedure
    .input<Pick<MCPServerSetting, 'id'>>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const mcpServers = settings.mcp?.servers || [];
      const currMcpServerIndex = mcpServers.findIndex(
        (server) => server.id === input.id,
      );
      if (currMcpServerIndex !== -1) {
        mcpServers.splice(currMcpServerIndex, 1);
        SettingStore.setStore({
          ...settings,
          mcp: {
            ...settings.mcp,
            servers: mcpServers,
          },
        });
      }
    }),
  setMcpServerStatus: t.procedure
    .input<Pick<MCPServerSetting, 'id' | 'status'>>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const mcpServers = settings.mcp?.servers || [];
      const currMcpServerIndex = mcpServers.findIndex(
        (server) => server.id === input.id,
      );
      if (currMcpServerIndex !== -1) {
        mcpServers[currMcpServerIndex].status = input.status;
        SettingStore.setStore({
          ...settings,
          mcp: {
            ...settings.mcp,
            servers: mcpServers,
          },
        });
      }
    }),
});
