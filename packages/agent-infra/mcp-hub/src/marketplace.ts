/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/marketplace.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 */
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
import logger from './utils/logger.js';
import { MCPHubError } from './utils/errors.js';
import { getCacheDirectory } from './utils/xdg-paths.js';

const exec = promisify(execCb);

export interface McpRegistryParameter {
  name: string;
  key: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
}

export interface McpRegistryInstallation {
  name: string;
  description?: string;
  config: string;
  prerequisites?: string[];
  parameters?: McpRegistryParameter[];
  transports?: ('stdio' | 'sse' | 'streamable-http')[];
}

export interface McpRegistryServer {
  id: string;
  name: string;
  description: string;
  author: string;
  url: string;
  license?: string;
  category: string;
  tags: string[];
  installations: McpRegistryInstallation[];
  featured?: boolean;
  verified?: boolean;
  stars?: number;
  lastCommit?: number;
  updatedAt?: number;
}

export interface McpRegistryData {
  version: string;
  generatedAt: number;
  totalServers: number;
  servers: McpRegistryServer[];
}

export interface MarketplaceCacheData {
  registry: McpRegistryData | null;
  lastFetchedAt: number | null;
  serverDocumentation?: Record<
    string,
    { content: string; lastFetchedAt: number }
  >;
}

export interface MarketplaceQueryOptions {
  search?: string;
  category?: string;
  tags?: string[];
  sort?: 'newest' | 'stars' | 'name';
}

interface FetchResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  json(): Promise<any>;
  text?(): Promise<string>;
}

interface CurlOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
}

async function executeCurl(
  url: string,
  options: CurlOptions = {},
): Promise<FetchResponse> {
  try {
    await exec('curl --version');

    let curlCmd = ['curl', '-s'];

    if (options.method === 'POST') {
      curlCmd.push('-X', 'POST');
    }

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        curlCmd.push('-H', `"${key}: ${value}"`);
      });
    }

    if (options.body) {
      const processedBody =
        typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
      curlCmd.push('-d', `'${processedBody}'`);
    }

    curlCmd.push(url);

    const { stdout } = await exec(curlCmd.join(' '));

    if (stdout) {
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(stdout),
      };
    }

    throw new Error('No response from curl');
  } catch (error: any) {
    throw new MarketplaceError('Failed to execute curl command', {
      error: error.message,
    });
  }
}

async function fetchWithFallback(
  url: string,
  options: CurlOptions = {},
): Promise<FetchResponse> {
  try {
    return await fetch(url, options as RequestInit);
  } catch (error: any) {
    logger.warn('Fetch failed, falling back to curl', { error: error.message });
    return await executeCurl(url, options);
  }
}

const CACHE_DIR = getCacheDirectory();
const CACHE_FILE = 'registry.json';
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const REGISTRY_URL = 'https://ravitemer.github.io/mcp-registry/registry.json';

class MarketplaceError extends MCPHubError {
  constructor(message: string, data: Record<string, any> = {}) {
    super('MARKETPLACE_ERROR', message, data);
    this.name = 'MarketplaceError';
  }
}

export class Marketplace {
  public readonly ttl: number;
  private readonly cacheFile: string;
  public cache: MarketplaceCacheData;

  constructor(ttl: number = DEFAULT_TTL) {
    this.ttl = ttl;
    this.cacheFile = path.join(CACHE_DIR, CACHE_FILE);
    this.cache = {
      registry: null,
      lastFetchedAt: null,
      serverDocumentation: {},
    };
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });

      try {
        const content = await fs.readFile(this.cacheFile, 'utf-8');
        const loaded = JSON.parse(content);
        this.cache = loaded;
        logger.debug(`Loaded marketplace cache`, {
          lastFetchedAt: this.cache.lastFetchedAt,
          isFresh: this.isCatalogValid(),
          serverCount: this.cache.registry?.servers?.length || 0,
        });
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          logger.warn('Failed to load marketplace cache', {
            error: error.message,
          });
        }
        this.cache = {
          registry: null,
          lastFetchedAt: null,
          serverDocumentation: {},
        };
      }

      if (!this.isCatalogValid()) {
        try {
          await this.fetchRegistry();
          const serverCount = this.cache.registry?.servers?.length || 0;
          logger.info(
            `Successfully updated marketplace registry with ${serverCount} servers`,
          );
        } catch (error: any) {
          if (this.cache.registry) {
            logger.warn(
              `Using stale marketplace registry due to error: ${error.message}`,
            );
          } else {
            logger.error(
              'MARKETPLACE_INIT_ERROR',
              `Failed to initialize marketplace registry: ${error.message}`,
              {
                error: error.message,
                fallback: 'Continuing with empty catalog',
              },
              false,
            );
            this.cache.registry = {
              version: 'N/A',
              generatedAt: 0,
              totalServers: 0,
              servers: [],
            };
          }
        }
      }
    } catch (error: any) {
      logger.error(
        'MARKETPLACE_INIT_ERROR',
        `Failed to initialize marketplace : ${error.message}`,
        {
          error: error.message,
          fallback: 'Continuing with empty catalog',
        },
        false,
      );
      this.cache = {
        registry: null,
        lastFetchedAt: null,
        serverDocumentation: {},
      };
    }
  }

  async saveCache(): Promise<void> {
    try {
      await fs.writeFile(
        this.cacheFile,
        JSON.stringify(this.cache, null, 2),
        'utf-8',
      );
    } catch (error: any) {
      throw new MarketplaceError('Failed to save marketplace cache', {
        error: error.message,
      });
    }
  }

  isCatalogValid(): boolean {
    if (
      !this.cache.registry ||
      !this.cache.lastFetchedAt ||
      !this.cache.registry?.servers?.length
    )
      return false;
    const age = Date.now() - this.cache.lastFetchedAt;
    return age < this.ttl;
  }

  isDocumentationValid(mcpId: string): boolean {
    const doc = this.cache.serverDocumentation?.[mcpId] ?? {};
    if (!doc?.lastFetchedAt) return false;
    const age = Date.now() - doc.lastFetchedAt;
    return age < this.ttl;
  }

  async updateDocumentationCache(
    mcpId: string,
    content: string,
  ): Promise<void> {
    if (!this.cache.serverDocumentation) {
      this.cache.serverDocumentation = {};
    }
    this.cache.serverDocumentation[mcpId] = {
      content: typeof content === 'string' ? content : '',
      lastFetchedAt: Date.now(),
    };
    await this.saveCache();
  }

  async fetchRegistry(): Promise<McpRegistryData> {
    try {
      logger.debug(`Fetching marketplace registry from ${REGISTRY_URL}`);
      const response = await fetchWithFallback(REGISTRY_URL);

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.servers)) {
        throw new Error(
          "Invalid registry response format (missing 'servers' array)",
        );
      }

      this.cache.registry = data;
      this.cache.lastFetchedAt = Date.now();
      await this.saveCache();
      return data;
    } catch (error: any) {
      throw new MarketplaceError('Failed to fetch marketplace registry', {
        url: REGISTRY_URL,
        error: error.message,
      });
    }
  }

  async #fetchReadmeContent(repoUrl: string): Promise<string | null> {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      logger.debug(`URL is not a GitHub repository: ${repoUrl}`);
      return null;
    }
    const [, owner, repo] = match;
    const readmePaths = ['main', 'master'].map(
      (branch) =>
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`,
    );

    for (const readmeUrl of readmePaths) {
      try {
        logger.debug(`Attempting to fetch README from: ${readmeUrl}`);
        const response = await fetchWithFallback(readmeUrl);
        if (response.ok) {
          return await response.text!();
        } else if (response.status === 404) {
          logger.debug(`README not found at ${readmeUrl}`);
          continue;
        } else {
          logger.warn(
            `Failed to fetch README from ${readmeUrl}: HTTP ${response.status}`,
          );
          return null;
        }
      } catch (error: any) {
        logger.warn(
          `Error fetching README from ${readmeUrl}: ${error.message}`,
        );
      }
    }
    return null;
  }

  async getCatalog(
    options: MarketplaceQueryOptions = {},
  ): Promise<McpRegistryServer[]> {
    if (!this.isCatalogValid()) {
      await this.fetchRegistry();
    }
    return this.queryCatalog(options);
  }

  async getServerDetails(
    mcpId: string,
  ): Promise<
    { server: McpRegistryServer; readmeContent: string | null } | undefined
  > {
    if (!this.isCatalogValid()) {
      await this.fetchRegistry();
    }
    const server = this.cache.registry?.servers.find((s) => s.id === mcpId);
    if (!server) {
      return undefined;
    }

    let readmeContent: string | null = null;
    if (this.isDocumentationValid(mcpId)) {
      const doc = this.cache.serverDocumentation?.[mcpId];
      readmeContent = typeof doc?.content === 'string' ? doc.content : null;
      logger.debug(`Using cached documentation for server '${mcpId}'`);
    } else {
      logger.debug(
        `Fetching documentation for server '${mcpId}' from URL: ${server.url}`,
      );
      readmeContent = await this.#fetchReadmeContent(server.url);
      if (readmeContent) {
        await this.updateDocumentationCache(mcpId, readmeContent);
        logger.info(
          `Successfully fetched and cached documentation for '${mcpId}'`,
        );
      } else {
        logger.warn(`Could not fetch documentation for server '${mcpId}'`);
      }
    }

    return {
      server: server,
      readmeContent: readmeContent,
    };
  }

  queryCatalog({
    search,
    category,
    tags,
    sort,
  }: MarketplaceQueryOptions = {}): McpRegistryServer[] {
    let items = this.cache.registry?.servers || [];

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower) ||
          item.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
      );
    }

    if (category) {
      items = items.filter((item) => item.category === category);
    }

    if (tags && tags.length > 0) {
      items = items.filter((item) =>
        tags.every((tag) => item.tags.includes(tag)),
      );
    }

    switch (sort) {
      case 'stars':
        items.sort((a, b) => (b.stars || 0) - (a.stars || 0));
        break;
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        items.sort((a, b) => (b.lastCommit || 0) - (a.lastCommit || 0));
    }

    return items;
  }
}

let instance: Marketplace | null = null;

export function getMarketplace(ttl: number = DEFAULT_TTL): Marketplace {
  if (!instance || (ttl && ttl !== instance.ttl)) {
    instance = new Marketplace(ttl);
  }
  return instance;
}
