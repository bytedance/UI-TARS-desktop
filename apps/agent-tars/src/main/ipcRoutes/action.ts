/* eslint-disable @typescript-eslint/no-explicit-any */
import { MCPServerName, ToolCall } from '@agent-infra/shared';
import { executeCustomTool, listCustomTools } from '@main/customTools';
import { createMcpClient, getOmegaDir } from '@main/mcp/client';
import { mcpToolsToAzureTools } from '@main/mcp/tools';
import { MCPToolResult } from '@main/type';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import path from 'path';
import fs, { readFile } from 'fs-extra';
import { shell } from 'electron';
import fetch from 'node-fetch';
import FormData from 'form-data';
import serialize from 'serialize-javascript';
import {
  normalizeMessages,
  parseArtifacts,
} from '@main/utils/normalizeOmegaData';
import { logger } from '@main/utils/logger';
import { extractToolNames } from '@main/utils/extractToolNames';

export interface MCPTool {
  id: string;
  serverName: string;
  name?: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

const t = initIpc.create();

/**
 * Convert tool use data from OpenAI to MCP tool format
 */
function toolUseToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolUse: ToolCall,
): MCPTool | undefined {
  if (!mcpTools) return undefined;
  const tool = mcpTools.find((tool) => tool.name === toolUse.function.name);
  if (!tool) return undefined;
  tool.inputSchema = JSON.parse(toolUse.function.arguments);
  return tool;
}

export const actionRoute = t.router({
  listTools: t.procedure.handle(async () => {
    const mcpClient = await createMcpClient();
    const tools = mcpToolsToAzureTools(await mcpClient.listTools());
    logger.info('[actionRoute.listTools] tools', extractToolNames(tools));
    const customTools = listCustomTools();
    return [
      ...tools.map((tool) => tool.function),
      ...customTools.map((tool) => tool.function),
    ] as ChatCompletionTool['function'][];
  }),

  listMcpTools: t.procedure.handle(async () => {
    const mcpClient = await createMcpClient();
    const tools = await mcpClient.listTools();
    return tools;
  }),

  listCustomTools: t.procedure.handle(async () => {
    const customTools = listCustomTools();
    return customTools;
  }),

  executeTool: t.procedure
    .input<{
      toolCalls: ToolCall[];
    }>()
    .handle(async ({ input }) => {
      const mcpClient = await createMcpClient();
      const tools = await mcpClient.listTools();
      const results: MCPToolResult = [];
      for (const toolCall of input.toolCalls) {
        const mcpTool = toolUseToMcpTool(tools, toolCall);
        if (mcpTool) {
          logger.info(
            '[actionRoute.executeTool] i will execute mcp tool',
            mcpTool.name,
            mcpTool.inputSchema || {},
          );
          try {
            const result = await mcpClient.callTool({
              client: mcpTool.serverName as MCPServerName,
              name: mcpTool.name as string,
              args: mcpTool.inputSchema || {},
            });
            logger.info(
              '[actionRoute.executeTool] execute tool result',
              JSON.stringify(result),
            );
            results.push(result);
          } catch (error) {
            const rawErrorMessage =
              error instanceof Error ? error.message : JSON.stringify(error);
            const errorMessage = `Failed to execute tool "${mcpTool.name}": ${rawErrorMessage}`;
            logger.error(`[actionRoute.executeTool] ${errorMessage}`);
            results.push({
              isError: true,
              content: [errorMessage],
            });
          }
        } else {
          logger.info(
            '[actionRoute.executeTool] executeCustomTool_toolCall',
            toolCall,
          );
          const result = await executeCustomTool(toolCall);
          logger.info(
            '[actionRoute.executeTool] executeCustomTool_result',
            result,
          );
          if (result) {
            results.push(...result);
          }
        }
      }
      return results;
    }),

  saveBrowserSnapshot: t.procedure.input<void>().handle(async () => {
    logger.info('[actionRoute.saveBrowserSnapshot] start');
    const mcpClient = await createMcpClient();
    try {
      const result = await mcpClient.callTool({
        client: MCPServerName.Browser,
        name: 'browser_screenshot',
        args: {
          highlight: true,
        },
      });
      const screenshotMeta = (
        result.content as [
          { type: 'text'; text: string },
          { type: 'image'; data: string; mimeType: string },
        ]
      )[1];
      const omegaDir = await getOmegaDir();
      const screenshotPath = path.join(omegaDir, 'screenshots');
      await fs.mkdirSync(screenshotPath, { recursive: true });

      const ext = screenshotMeta.mimeType.split('/')[1] || 'png';
      const timestamp = new Date().getTime();
      const filename = `screenshot_${timestamp}.${ext}`;
      const filepath = path.join(screenshotPath, filename);

      const imageBuffer = Buffer.from(screenshotMeta.data, 'base64');
      await fs.writeFile(filepath, imageBuffer);
      return { filepath };
    } catch (e) {
      logger.error(
        '[actionRoute.saveBrowserSnapshot] Failed to save screenshot:',
        e,
      );
      throw e;
    }
  }),

  saveReportHtml: t.procedure
    .input<{ messages: any; reportApiUrl?: string }>()
    .handle(async ({ input }) => {
      const { messages: rawMessages, reportApiUrl } = input;
      const messages = await normalizeMessages(rawMessages);
      const omegaDir = await getOmegaDir();
      const reportHtmlTemplate = await readFile(
        path.join(__dirname, '../reporter/index.html'),
        'utf-8',
      );
      const artifacts = await parseArtifacts(messages);
      const reportContent = reportHtmlTemplate
        .replace(
          ' <!-- DATA -->',
          '<script>window.__OMEGA_REPORT_DATA__ = ' +
            serialize({
              messages,
              artifacts,
            }) +
            ';</script>',
        )
        .replace(
          /<title>.*?<\/title>/,
          `<title>${messages?.[0]?.content || 'Agent TARS'}</title>`,
        );

      if (reportApiUrl) {
        const tempPath = path.join(
          omegaDir,
          `temp_report_${new Date().getTime()}.html`,
        );
        await fs.writeFile(tempPath, reportContent);

        try {
          const formData = new FormData();
          const fileBuffer = await fs.readFile(tempPath);
          formData.append('file', fileBuffer, {
            filename: 'report.html',
            contentType: 'text/html',
          });

          const res = await fetch(reportApiUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders(),
          });

          await fs.remove(tempPath);

          if (!res.ok) {
            logger.error('Upload failed:', await res.text());
            throw new Error('文件上传失败');
          }

          const data = await res.json();
          if (!data.url) {
            throw new Error('文件上传失败：服务器未返回 url');
          }

          await shell.openExternal(data.url);
          return data.url;
        } catch (error) {
          logger.error('Upload failed:', error);
          throw error;
        }
      } else {
        const reportPath = path.join(
          omegaDir,
          `report_${new Date().getTime()}.html`,
        );
        await fs.writeFile(reportPath, reportContent);

        // Open the report in the default browser
        await shell.openPath(reportPath);
        return reportPath;
      }
    }),

  cleanup: t.procedure.handle(async () => {
    const mcpClient = await createMcpClient();
    await mcpClient.cleanup();
    return true;
  }),
});
