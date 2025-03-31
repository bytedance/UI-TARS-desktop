import { MCPServerSetting } from '@agent-infra/shared';
import { SettingStore } from '@main/store/setting';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { MCPClient } from '@agent-infra/mcp-client';
import { logger } from '@main/utils/logger';
import { getActiveMcpSettings } from '@main/mcp/tools';
import { mapClientRef } from '@main/mcp/client';

const t = initIpc.create();

export const mcpRoute = t.router({
  getActiveMcpSettings: t.procedure.input<void>().handle(async () => {
    return getActiveMcpSettings();
  }),
  getMcpSettings: t.procedure.input<void>().handle(async () => {
    const settings = SettingStore.getStore();
    return (
      settings.mcp || {
        mcpServers: [],
      }
    );
  }),
  getMcpServers: t.procedure.input<void>().handle(async () => {
    const settings = SettingStore.getStore();
    return settings.mcp?.mcpServers || [];
  }),
  addMcpServer: t.procedure
    .input<MCPServerSetting>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const currMcpServers = settings.mcp?.mcpServers || [];
      currMcpServers.unshift(input);

      SettingStore.setStore({
        ...settings,
        mcp: {
          ...settings.mcp,
          mcpServers: currMcpServers,
        },
      });
      mapClientRef.current = undefined;
      return true;
    }),
  checkServerStatus: t.procedure
    .input<MCPServerSetting>()
    .handle(async ({ input }) => {
      try {
        const client = new MCPClient([]);
        await client.checkServerStatus(input);
        return {
          error: '',
        };
      } catch (error: unknown) {
        const rawErrorMessage =
          error instanceof Error ? error.message : JSON.stringify(error);
        logger.error(rawErrorMessage);

        return {
          error: rawErrorMessage,
        };
      }
    }),
  updateMcpServer: t.procedure
    .input<MCPServerSetting>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const mcpServers = settings.mcp?.mcpServers || [];

      const currMcpServerIndex = mcpServers.findIndex(
        (server) => server.id === input.id,
      );

      if (currMcpServerIndex !== -1) {
        mcpServers[currMcpServerIndex] = input;
        SettingStore.setStore({
          ...settings,
          mcp: {
            ...settings.mcp,
            mcpServers,
          },
        });
        mapClientRef.current = undefined;
      } else {
        logger.error('MCP server not found', input);
      }
    }),
  deleteMcpServer: t.procedure
    .input<Pick<MCPServerSetting, 'id'>>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const mcpServers = settings.mcp?.mcpServers || [];
      const currMcpServerIndex = mcpServers.findIndex(
        (server) => server.id === input.id,
      );
      if (currMcpServerIndex !== -1) {
        mcpServers.splice(currMcpServerIndex, 1);
        SettingStore.setStore({
          ...settings,
          mcp: {
            ...settings.mcp,
            mcpServers,
          },
        });
        mapClientRef.current = undefined;
      } else {
        logger.error('MCP server not found', input);
      }
    }),
  setMcpServerStatus: t.procedure
    .input<Pick<MCPServerSetting, 'id' | 'status'>>()
    .handle(async ({ input }) => {
      const settings = SettingStore.getStore();
      const mcpServers = settings.mcp?.mcpServers || [];
      const currMcpServerIndex = mcpServers.findIndex(
        (server) => server.id === input.id,
      );
      if (currMcpServerIndex !== -1) {
        mcpServers[currMcpServerIndex].status = input.status;
        SettingStore.setStore({
          ...settings,
          mcp: {
            ...settings.mcp,
            mcpServers,
          },
        });
        mapClientRef.current = undefined;
      } else {
        logger.error('MCP server not found', input);
      }
    }),
});
