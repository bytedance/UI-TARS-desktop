/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNetworkAuthMiddleware,
  resolveServerAuth,
  type ResolveServerAuthOptions,
  type ResolvedServerAuth,
} from '../../agent-server/src/api/middleware/network-auth';
import {
  csrfProtectionMiddleware,
  generateCsrfToken,
} from '../../agent-server/src/api/middleware/csrf-protection';
import { processServerRun } from '../src/core/commands/run';

const serverMocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  created: vi.fn(),
  logs: [] as string[],
}));

vi.mock('@tarko/interface', () => ({ LogLevel: { DEBUG: 'debug' } }));
vi.mock(
  '@tarko/shared-utils',
  () => import('../../shared-utils/src/server-host'),
);
vi.mock('express-rate-limit', () => ({ default: vi.fn() }));
vi.mock('../src/utils', () => ({
  ConsoleInterceptor: {
    run: async (run: () => Promise<unknown>) => ({
      result: await run(),
      logs: serverMocks.logs,
    }),
  },
}));
vi.mock('@tarko/agent-server', async () => {
  const { resolveServerAuth } = await import(
    '../../agent-server/src/api/middleware/network-auth'
  );
  return {
    AgentServer: class {
      readonly auth: ResolvedServerAuth;

      constructor({
        appConfig,
      }: {
        appConfig: {
          server: ResolveServerAuthOptions & {
            auth?: Omit<ResolveServerAuthOptions, 'host'>;
          };
        };
      }) {
        this.auth = resolveServerAuth({
          host: appConfig.server.host,
          ...appConfig.server.auth,
        });
        serverMocks.created(this.auth, appConfig.server);
      }

      start = serverMocks.start;
      stop = serverMocks.stop;
    },
    resolveAgentImplementation: vi.fn(),
  };
});

type RunOptions = Parameters<typeof processServerRun>[0];
type ServerAuth = NonNullable<ResolveServerAuthOptions>;

const CONFIGURED_TOKEN = 'local-test-token-0123456789';
const ENV_TOKEN = 'local-env-token-0123456789';

function authorizeRequest(
  auth: ResolvedServerAuth,
  headers: Headers,
  method = 'POST',
  path = '/api/v1/oneshot/query',
): number {
  type AuthRequest = Parameters<typeof csrfProtectionMiddleware>[0];
  type AuthResponse = Parameters<typeof csrfProtectionMiddleware>[1];
  let status = 200;
  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    json() {
      return response;
    },
  };
  const request = {
    method,
    originalUrl: path,
    query: {},
    headers: Object.fromEntries(headers.entries()),
  } as AuthRequest;
  const checkCsrf = () =>
    csrfProtectionMiddleware(request, response as AuthResponse, () => {});
  if (auth.required) {
    createNetworkAuthMiddleware(auth.token!)(
      request,
      response as AuthResponse,
      checkCsrf,
    );
  } else {
    checkCsrf();
  }
  return status;
}

describe('processServerRun request authentication', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let output: string;
  let responseBody: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('TARKO_AUTH_TOKEN', '');
    serverMocks.start.mockResolvedValue(undefined);
    serverMocks.stop.mockResolvedValue(undefined);
    serverMocks.logs = [];
    output = '';
    responseBody = { result: { content: 'offline response' } };
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      output += String(chunk);
      return true;
    });
    fetchMock.mockImplementation(async (url, init) => {
      const auth = serverMocks.created.mock.calls.at(
        -1,
      )![0] as ResolvedServerAuth;
      const path = new URL(String(url)).pathname;
      const status = authorizeRequest(
        auth,
        new Headers(init?.headers),
        init?.method ?? 'GET',
        path,
      );
      const body =
        path === '/api/v1/csrf-token'
          ? { token: generateCsrfToken() }
          : responseBody;
      return new Response(
        JSON.stringify(status === 200 ? body : { error: 'Request rejected' }),
        {
          status,
          statusText:
            status === 200
              ? 'OK'
              : status === 401
                ? 'Unauthorized'
                : 'Forbidden',
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function options(auth?: Omit<ServerAuth, 'host'>): RunOptions {
    return {
      input: 'hello',
      agentServerInitOptions: {
        appConfig: { server: { auth } },
      },
    } as RunOptions;
  }

  it.each([
    { name: 'default loopback', auth: undefined, env: '', required: false },
    {
      name: 'configured token (trimmed)',
      auth: { token: `  ${CONFIGURED_TOKEN}  ` },
      env: '',
      required: true,
    },
    {
      name: 'environment token',
      auth: undefined,
      env: ENV_TOKEN,
      required: true,
    },
    {
      name: 'generated token in always mode',
      auth: { mode: 'always' as const },
      env: '',
      required: true,
    },
    {
      name: 'never mode with a configured token',
      auth: { mode: 'never' as const, token: CONFIGURED_TOKEN },
      env: ENV_TOKEN,
      required: false,
    },
    {
      name: 'config takes precedence over the environment',
      auth: { token: CONFIGURED_TOKEN },
      env: ENV_TOKEN,
      required: true,
    },
  ])('can query with $name', async ({ auth, env, required }) => {
    vi.stubEnv('TARKO_AUTH_TOKEN', env);
    await processServerRun(options(auth));

    const resolved = serverMocks.created.mock.calls[0][0] as ResolvedServerAuth;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    const [url, init] = fetchMock.mock.calls[1];
    const headers = new Headers(init?.headers);
    expect(resolved.required).toBe(required);
    expect(headers.get('authorization')).toBe(
      required ? `Bearer ${resolved.token}` : null,
    );
    expect(authorizeRequest(resolved, headers)).toBe(200);
    expect(tokenUrl).toBe('http://localhost:8899/api/v1/csrf-token');
    expect(new Headers(tokenInit?.headers).get('authorization')).toBe(
      required ? `Bearer ${resolved.token}` : null,
    );
    expect(output).toBe('offline response');
    expect(serverMocks.start).toHaveBeenCalledOnce();
    expect(serverMocks.stop).toHaveBeenCalledOnce();
    expect(url).toBe('http://localhost:8899/api/v1/oneshot/query');
    expect(serverMocks.created.mock.calls[0][1]).toMatchObject({
      host: '127.0.0.1',
      port: 8899,
    });
    expect(JSON.parse(init!.body as string)).toEqual({
      query: 'hello',
      sessionName: 'hello',
      sessionTags: ['run'],
    });
  });

  it('keeps the actual middleware rejecting missing and incorrect credentials', () => {
    const auth = resolveServerAuth({
      host: '127.0.0.1',
      token: CONFIGURED_TOKEN,
    });
    const csrf = generateCsrfToken();
    expect(authorizeRequest(auth, new Headers({ 'X-CSRF-Token': csrf }))).toBe(
      401,
    );
    expect(
      authorizeRequest(
        auth,
        new Headers({
          Authorization: 'Bearer wrong-token',
          'X-CSRF-Token': csrf,
        }),
      ),
    ).toBe(401);
    expect(
      authorizeRequest(
        auth,
        new Headers({ Authorization: `Bearer ${CONFIGURED_TOKEN}` }),
      ),
    ).toBe(403);
    expect(
      authorizeRequest(
        auth,
        new Headers({
          Authorization: `Bearer ${CONFIGURED_TOKEN}`,
          'X-CSRF-Token': csrf,
        }),
      ),
    ).toBe(200);
    expect(authorizeRequest({ required: false }, new Headers())).toBe(403);
  });

  it('preserves JSON output and captured logs without exposing the token', async () => {
    serverMocks.logs = ['captured log'];
    await processServerRun({
      ...options({ token: CONFIGURED_TOKEN }),
      format: 'json',
      includeLogs: true,
    });
    expect(JSON.parse(output)).toEqual({
      ...(responseBody as object),
      logs: ['captured log'],
    });
    expect(output).not.toContain(CONFIGURED_TOKEN);
  });

  it('preserves the fallback text output when there is no result content', async () => {
    responseBody = { result: { done: true } };
    await processServerRun(options({ mode: 'always' }));
    expect(output).toBe(JSON.stringify(responseBody, null, 2));
  });

  it('stops the server when the request fails', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ token: generateCsrfToken() }))
      .mockRejectedValueOnce(new Error('offline connection failed'));
    await expect(processServerRun(options({ mode: 'always' }))).rejects.toThrow(
      'offline connection failed',
    );
    expect(serverMocks.stop).toHaveBeenCalledOnce();
    expect(output).toBe('');
  });

  it('stops the server and reports HTTP errors', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ token: generateCsrfToken() }))
      .mockResolvedValueOnce(
        new Response('', { status: 503, statusText: 'Service Unavailable' }),
      );
    await expect(
      processServerRun(options({ token: CONFIGURED_TOKEN })),
    ).rejects.toThrow('Server request failed: Service Unavailable');
    expect(serverMocks.stop).toHaveBeenCalledOnce();
  });

  it('does not submit a query if CSRF token retrieval fails', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('', { status: 401, statusText: 'Unauthorized' }),
    );
    await expect(
      processServerRun(options({ token: CONFIGURED_TOKEN })),
    ).rejects.toThrow('Failed to obtain CSRF token: Unauthorized');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(serverMocks.stop).toHaveBeenCalledOnce();
  });

  it('cleans up when the CSRF response is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not JSON'));
    await expect(
      processServerRun(options({ mode: 'always' })),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(serverMocks.stop).toHaveBeenCalledOnce();
  });

  it.each([null, {}, { token: '' }, { token: 42 }])(
    'does not submit a query for invalid CSRF response %j',
    async (body) => {
      fetchMock.mockResolvedValueOnce(Response.json(body));
      await expect(
        processServerRun(options({ mode: 'always' })),
      ).rejects.toThrow('Server returned an invalid CSRF token');
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(serverMocks.stop).toHaveBeenCalledOnce();
    },
  );

  it('still cleans up when startup fails', async () => {
    serverMocks.start.mockRejectedValueOnce(new Error('startup failed'));
    await expect(processServerRun(options({ mode: 'always' }))).rejects.toThrow(
      'startup failed',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(serverMocks.stop).toHaveBeenCalledOnce();
  });

  it('does not replace a request failure with a cleanup failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('request failed'));
    serverMocks.stop.mockRejectedValueOnce(new Error('cleanup failed'));
    await expect(
      processServerRun(options({ token: CONFIGURED_TOKEN })),
    ).rejects.toThrow('request failed');
  });
});
