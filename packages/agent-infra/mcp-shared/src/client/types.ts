import { type Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js';

// `type` field only save but not used
export type MCP_SERVER_TYPE = 'stdio' | 'sse' | 'builtin' | 'streamable-http';

interface BaseMCPServer<ServerNames extends string = string> {
  name: ServerNames;
  status?: 'activate' | 'error' | 'disabled';
  description?: string;
}

export type MCPServer<ServerNames extends string = string> =
  | ({ type?: 'builtin' } & BuiltInMCPServer<ServerNames>)
  | ({ type?: 'stdio' } & StdioMCPServer<ServerNames>)
  | ({ type?: 'sse' } & SSEMCPServer<ServerNames>)
  | ({ type?: 'streamable-http' } & StreamableHTTPMCPServer<ServerNames>);

export type BuiltInMCPServer<ServerNames extends string = string> =
  BaseMCPServer<ServerNames> & {
    /** local mode, same as function call */
    localClient: Pick<Client, 'callTool' | 'listTools' | 'close' | 'ping'>;
  };

export type StdioMCPServer<ServerNames extends string = string> =
  BaseMCPServer<ServerNames> &
    Pick<StdioServerParameters, 'command' | 'args' | 'env' | 'cwd'>;

export type SSEMCPServer<ServerNames extends string = string> =
  BaseMCPServer<ServerNames> & {
    /** SSE server */
    url: string;
    /** headers for SSE server */
    headers?: HeadersInit;
  };

export type StreamableHTTPMCPServer<ServerNames extends string = string> =
  BaseMCPServer<ServerNames> & {
    /** streamable http server */
    url: string;
    /** headers for streamable http server */
    headers?: HeadersInit;
  };
