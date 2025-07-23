import {
  Agent,
  AgentOptions,
  getLogger,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LogLevel,
} from '@multimodal/agent';
import { SYSTEM_PROMPT } from './prompt';
import { SeedMCPAgentToolCallEngine } from './SeedMCPAgentToolCallEngine';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { McpManager } from './tools/mcp';

export interface SeedMcpAgentOption extends AgentOptions {
  searchApiKey: string;
  tavilyApiKey: string;
}

export class SeedMcpAgent extends Agent {
  private loop = 0;
  private _options: SeedMcpAgentOption;
  constructor(options: SeedMcpAgentOption) {
    super({
      name: 'Seed MCP Agent',
      instructions: SYSTEM_PROMPT,
      toolCallEngine: SeedMCPAgentToolCallEngine,
      maxIterations: 100,
      ...options,
    });
    this._options = options;
    this.logger = getLogger('SeedMCPAgent');
  }

  async initialize(): Promise<void> {
    const mcpManager = new McpManager({
      TavilyApiKey: this._options.tavilyApiKey,
      SerperApiKey: this._options.searchApiKey,
    });
    await mcpManager.init();

    this.registerTool(new SearchToolProvider(mcpManager).getTool());
    this.registerTool(new LinkReaderToolProvider(mcpManager).getTool());

    await super.initialize();
  }

  onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    this.logger.debug(`[LLM Request] ${id}`);
    this.saveSnapshot(id, 'request.json', payload);
  }

  onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    this.logger.debug(`[LLM Response] ${id}`);
    this.saveSnapshot(id, 'response.json', payload);
  }

  onAgentLoopEnd(): Promise<void> {
    this.loop++;
    return Promise.resolve();
  }

  onEachAgentLoopStart(): void | Promise<void> {
    this.loop++;
  }

  /**
   * 保存快照数据到文件系统
   * @param id 会话ID
   * @param filename 文件名
   * @param payload 要保存的数据
   */
  private saveSnapshot(
    id: string,
    filename: string,
    payload: LLMRequestHookPayload | LLMResponseHookPayload,
  ): void {
    try {
      const dir = join(__dirname, `../snapshot/${id}/loop-${this.loop}`);

      this.ensureDirectoryExists(dir);

      const filePath = join(dir, filename);
      const content = JSON.stringify(payload, null, 2);

      writeFileSync(filePath, content, { encoding: 'utf-8' });

      this.logger.debug(`Snapshot saved: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to save snapshot for ${id}/${filename}:`, error);
    }
  }

  /**
   * 确保目录存在，如果不存在则创建
   * @param dir 目录路径
   */
  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
