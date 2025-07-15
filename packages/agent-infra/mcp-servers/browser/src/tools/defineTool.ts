import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodRawShape } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolContext } from '../typings.js';

export type InferMcpToolConfig = Parameters<McpServer['registerTool']>[1];

interface ToolConfig extends InferMcpToolConfig {}

export interface ExtendedCallToolResult<
  TOutput extends { [x: string]: unknown } = { [x: string]: unknown },
> extends CallToolResult {
  structuredContent?: TOutput;
}

export type ToolDependence = 'ensureBrowser' | 'ensurePage';

export interface ToolDefinition<
  TConfig extends ToolConfig = ToolConfig,
  TSkipContext extends boolean = false,
> {
  name: string;
  config: TConfig;
  /**
   * If true, the tool will not be called with the tool context.
   * @defaultValue false
   */
  skipToolContext?: TSkipContext;
  handle: (
    ctx: TSkipContext extends true ? null : ToolContext,
    args: TConfig['inputSchema'] extends ZodRawShape
      ? z.infer<z.ZodObject<TConfig['inputSchema']>>
      : any,
  ) => Promise<
    TConfig['outputSchema'] extends ZodRawShape
      ? ExtendedCallToolResult<z.infer<z.ZodObject<TConfig['outputSchema']>>>
      : CallToolResult
  >;
}

export function defineTool<
  TConfig extends ToolConfig,
  TSkipContext extends boolean = false,
>(
  tool: ToolDefinition<TConfig, TSkipContext>,
): ToolDefinition<TConfig, TSkipContext> {
  return tool;
}
