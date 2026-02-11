/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app, safeStorage, shell } from 'electron';

import { logger } from '@main/logger';

const CLIENT_ID =
  process.env.UI_TARS_CODEX_OAUTH_CLIENT_ID ||
  ['app', 'EMoamEEZ73f0CkXaXp7hrann'].join('_');
const AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize';
const OAUTH_EXCHANGE_URL = 'https://auth.openai.com/oauth/token';
const REDIRECT_URI = 'http://localhost:1455/auth/callback';
const OAUTH_SCOPE = 'openid profile email offline_access';
const SESSION_FILE_NAME = 'codex-oauth.session.json';
const LOGIN_TIMEOUT_MS = 3 * 60 * 1000;
const REFRESH_LEEWAY_MS = 60 * 1000;

type CodexOAuthStoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type TokenExchangeResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type JWTPayload = {
  email?: string;
  'https://api.openai.com/auth'?: {
    chatgpt_account_id?: string;
  };
};

export type CodexOAuthState = {
  status: 'unauthenticated' | 'authenticated' | 'error';
  accountId?: string;
  email?: string;
  expiresAt?: number;
  error?: string;
};

export class CodexAuthService {
  private static instance: CodexAuthService;
  private pendingLogin: Promise<CodexOAuthState> | null = null;

  public static getInstance(): CodexAuthService {
    if (!CodexAuthService.instance) {
      CodexAuthService.instance = new CodexAuthService();
    }
    return CodexAuthService.instance;
  }

  public async login(): Promise<CodexOAuthState> {
    if (this.pendingLogin) {
      return this.pendingLogin;
    }

    this.pendingLogin = this.loginInternal().finally(() => {
      this.pendingLogin = null;
    });

    return this.pendingLogin;
  }

  public async logout(): Promise<CodexOAuthState> {
    await this.clearSession();
    return {
      status: 'unauthenticated',
    };
  }

  public async getStatus(): Promise<CodexOAuthState> {
    try {
      const session = await this.getValidSession();
      if (!session) {
        return {
          status: 'unauthenticated',
        };
      }

      const payload = this.decodeJwtPayload(session.accessToken);
      return {
        status: 'authenticated',
        accountId: payload?.['https://api.openai.com/auth']?.chatgpt_account_id,
        email: payload?.email,
        expiresAt: session.expiresAt,
      };
    } catch (error) {
      logger.warn('[CodexAuthService] getStatus failed', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async getAccessContext(): Promise<{
    accessToken: string;
    accountId?: string;
  } | null> {
    const session = await this.getValidSession();
    if (!session) {
      return null;
    }

    const payload = this.decodeJwtPayload(session.accessToken);
    return {
      accessToken: session.accessToken,
      accountId: payload?.['https://api.openai.com/auth']?.chatgpt_account_id,
    };
  }

  private async loginInternal(): Promise<CodexOAuthState> {
    const state = randomBytes(16).toString('hex');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');

    const authUrl = new URL(AUTHORIZE_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', OAUTH_SCOPE);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('id_token_add_organizations', 'true');
    authUrl.searchParams.set('codex_cli_simplified_flow', 'true');
    authUrl.searchParams.set('originator', 'codex_cli_rs');

    const codePromise = this.waitForAuthorizationCode(state);
    await shell.openExternal(authUrl.toString());
    const code = await codePromise;

    const session = await this.exchangeAuthorizationCode(code, verifier);
    await this.saveSession(session);

    return this.getStatus();
  }

  private async waitForAuthorizationCode(
    expectedState: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        callback();
      };

      const server = createServer((req, res) => {
        const requestUrl = new URL(req.url || '/', REDIRECT_URI);
        if (requestUrl.pathname !== '/auth/callback') {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }

        const code = requestUrl.searchParams.get('code');
        const state = requestUrl.searchParams.get('state');

        if (!code || state !== expectedState) {
          res.statusCode = 400;
          res.end('OAuth login failed. You can close this window.');
          settle(() => {
            clearTimeout(timeout);
            server.close();
            reject(new Error('Invalid OAuth callback response'));
          });
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(
          '<h1>OpenAI Codex OAuth connected. You can close this tab.</h1>',
        );

        settle(() => {
          clearTimeout(timeout);
          server.close();
          resolve(code);
        });
      });

      server.on('error', (error) => {
        settle(() => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      const timeout = setTimeout(() => {
        settle(() => {
          server.close();
          reject(new Error('OpenAI Codex OAuth timeout'));
        });
      }, LOGIN_TIMEOUT_MS);

      const redirectUri = new URL(REDIRECT_URI);
      const callbackPort = Number(redirectUri.port || '80');
      server.listen(callbackPort);
    });
  }

  private async exchangeAuthorizationCode(
    code: string,
    verifier: string,
  ): Promise<CodexOAuthStoredSession> {
    const response = await fetch(OAUTH_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        code_verifier: verifier,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed with status ${response.status}`);
    }

    const payload = (await response.json()) as TokenExchangeResponse;
    return this.toStoredSession(payload);
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<CodexOAuthStoredSession> {
    const response = await fetch(OAUTH_EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed with status ${response.status}`);
    }

    const payload = (await response.json()) as TokenExchangeResponse;
    return this.toStoredSession(payload);
  }

  private toStoredSession(
    payload: TokenExchangeResponse,
  ): CodexOAuthStoredSession {
    if (
      !payload.access_token ||
      !payload.refresh_token ||
      typeof payload.expires_in !== 'number'
    ) {
      throw new Error('OAuth token response is incomplete');
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + payload.expires_in * 1000,
    };
  }

  private decodeJwtPayload(jwtValue: string): JWTPayload | null {
    try {
      const payloadSegment = jwtValue.split('.')[1];
      if (!payloadSegment) {
        return null;
      }

      const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const jsonText = Buffer.from(normalized, 'base64').toString('utf-8');
      return JSON.parse(jsonText) as JWTPayload;
    } catch {
      return null;
    }
  }

  private async getValidSession(): Promise<CodexOAuthStoredSession | null> {
    const session = await this.readSession();
    if (!session) {
      return null;
    }

    if (session.expiresAt > Date.now() + REFRESH_LEEWAY_MS) {
      return session;
    }

    try {
      const refreshed = await this.refreshAccessToken(session.refreshToken);
      await this.saveSession(refreshed);
      return refreshed;
    } catch (error) {
      logger.warn(
        '[CodexAuthService] token refresh failed, clearing session',
        error,
      );
      await this.clearSession();
      return null;
    }
  }

  private getSessionFilePath(): string {
    return path.join(app.getPath('userData'), SESSION_FILE_NAME);
  }

  private encodeSession(session: CodexOAuthStoredSession): string {
    const serialized = JSON.stringify(session);

    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn(
        '[CodexAuthService] secure storage unavailable, session will be stored without encryption',
      );
      return JSON.stringify({
        encrypted: false,
        value: serialized,
      });
    }

    const encrypted = safeStorage.encryptString(serialized);
    return JSON.stringify({
      encrypted: true,
      value: encrypted.toString('base64'),
    });
  }

  private decodeSession(raw: string): CodexOAuthStoredSession | null {
    const payload = JSON.parse(raw) as unknown;

    if (
      payload &&
      typeof payload === 'object' &&
      'accessToken' in payload &&
      'refreshToken' in payload &&
      'expiresAt' in payload
    ) {
      return payload as CodexOAuthStoredSession;
    }

    if (
      !payload ||
      typeof payload !== 'object' ||
      !('value' in payload) ||
      typeof payload.value !== 'string'
    ) {
      throw new Error('Codex OAuth session payload is invalid');
    }

    const wrappedPayload = payload as { encrypted?: boolean; value: string };

    if (!wrappedPayload.encrypted) {
      return JSON.parse(wrappedPayload.value) as CodexOAuthStoredSession;
    }

    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn(
        '[CodexAuthService] secure storage unavailable, encrypted session cannot be decrypted',
      );
      return null;
    }

    const decrypted = safeStorage.decryptString(
      Buffer.from(wrappedPayload.value, 'base64'),
    );
    return JSON.parse(decrypted) as CodexOAuthStoredSession;
  }

  private async saveSession(session: CodexOAuthStoredSession): Promise<void> {
    const target = this.getSessionFilePath();
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, this.encodeSession(session), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  private async readSession(): Promise<CodexOAuthStoredSession | null> {
    try {
      const target = this.getSessionFilePath();
      const content = await fs.readFile(target, 'utf-8');
      return this.decodeSession(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async clearSession(): Promise<void> {
    try {
      await fs.unlink(this.getSessionFilePath());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
