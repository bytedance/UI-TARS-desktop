/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/utils/oauth-provider.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 *
 * OAuth provider for MCP Hub that manages authorization flow and token storage
 * Implements the OAuth client interface required by the MCP SDK
 */
import logger from './logger.js';
import fs from 'fs/promises';
import path from 'path';
import { getDataDirectory } from './xdg-paths.js';

interface OAuthClientInfo {
  [key: string]: any;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  [key: string]: any;
}

interface ServerStorage {
  clientInfo: OAuthClientInfo | null;
  tokens: OAuthTokens | null;
  codeVerifier: string | null;
}

type ServersStorage = Record<string, ServerStorage>;

interface OAuthProviderOptions {
  serverName: string;
  serverUrl: string;
  hubServerUrl: string;
}

interface ClientMetadata {
  redirect_uris: string[];
  token_endpoint_auth_method: string;
  grant_types: string[];
  response_types: string[];
  client_name: string;
  client_uri: string;
}

// File level storage
let serversStorage: ServersStorage = {};

class StorageManager {
  private path: string;

  constructor() {
    this.path = path.join(getDataDirectory(), 'oauth-storage.json');
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.path), { recursive: true });
      try {
        const data = await fs.readFile(this.path, 'utf8');
        serversStorage = JSON.parse(data);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          logger.warn(`Error reading storage: ${err.message}`);
        }
      }
    } catch (err) {
      logger.warn(`Storage initialization error: ${err.message}`);
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(
        this.path,
        JSON.stringify(serversStorage, null, 2),
        'utf8',
      );
    } catch (err) {
      logger.warn(`Error saving storage: ${err.message}`);
    }
  }

  get(serverUrl: string): ServerStorage {
    if (!serversStorage[serverUrl]) {
      serversStorage[serverUrl] = {
        clientInfo: null,
        tokens: null,
        codeVerifier: null,
      };
    }
    return serversStorage[serverUrl];
  }

  async update(serverUrl: string, data: Partial<ServerStorage>): Promise<void> {
    const serverData = this.get(serverUrl);
    serversStorage[serverUrl] = { ...serverData, ...data };
    return this.save();
  }
}

// Singleton instance
const storage = new StorageManager();

// Initialize storage once
storage.init();

export default class MCPHubOAuthProvider {
  private serverName: string;
  private serverUrl: string;
  private hubServerUrl: string;
  private generatedAuthUrl: string | null;

  constructor({ serverName, serverUrl, hubServerUrl }: OAuthProviderOptions) {
    this.serverName = serverName;
    this.serverUrl = serverUrl;
    this.hubServerUrl = hubServerUrl;
    this.generatedAuthUrl = null;
  }

  get redirectUrl(): string {
    const callbackURL = new URL('/api/oauth/callback', this.hubServerUrl);
    callbackURL.searchParams.append('server_name', this.serverName);
    return callbackURL.toString();
  }

  get clientMetadata(): ClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'MCP Hub',
      client_uri: 'https://github.com/ravitemer/mcp-hub',
    };
  }

  async clientInformation(): Promise<OAuthClientInfo | null> {
    const data = storage.get(this.serverUrl);
    logger.file(`[${this.serverName}] Getting client information`);
    return data.clientInfo;
  }

  async saveClientInformation(info: OAuthClientInfo): Promise<void> {
    logger.file(`[${this.serverName}] Saving client information`);
    return storage.update(this.serverUrl, { clientInfo: info });
  }

  async tokens(): Promise<OAuthTokens | null> {
    return storage.get(this.serverUrl).tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    logger.file(`[${this.serverName}] Saving tokens`);
    return storage.update(this.serverUrl, { tokens });
  }

  async redirectToAuthorization(authUrl: string): Promise<boolean> {
    logger.file(`[${this.serverName}] Redirecting to authorization`);
    this.generatedAuthUrl = authUrl;
    return true;
  }

  async saveCodeVerifier(verifier: string): Promise<void> {
    logger.file(`[${this.serverName}] Saving code verifier`);
    return storage.update(this.serverUrl, { codeVerifier: verifier });
  }

  async codeVerifier(): Promise<string | null> {
    logger.file(`[${this.serverName}] Getting Code verifier`);
    return storage.get(this.serverUrl).codeVerifier;
  }
}
