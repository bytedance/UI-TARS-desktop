/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Browser, ConnectOptions } from 'puppeteer-core';
import { RemoteBrowser } from './remote-browser';

const connect = vi.hoisted(() =>
  vi.fn<(options: ConnectOptions) => Promise<Pick<Browser, 'on'>>>(),
);

vi.mock('puppeteer-core', () => ({ connect }));

describe('RemoteBrowser.launch', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const browser = { on: vi.fn<Browser['on']>() };
  const wsEndpoint = 'ws://remote.example:9222/devtools/browser/test';
  const cdpEndpoint = 'http://remote.example:9222/json/version';

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    connect.mockReset().mockResolvedValue(browser);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('connects directly to a supplied WebSocket without fetching CDP metadata', async () => {
    const remote = new RemoteBrowser({ wsEndpoint, cdpEndpoint });

    await remote.launch();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(connect).toHaveBeenCalledExactlyOnceWith({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: { width: 1280, height: 800 },
    });
    expect(remote.getBrowser()).toBe(browser);
  });

  it('preserves errors returned by the WebSocket connection', async () => {
    const connectionError = new Error('WebSocket connection refused');
    connect.mockRejectedValueOnce(connectionError);

    await expect(new RemoteBrowser({ wsEndpoint }).launch()).rejects.toBe(
      connectionError,
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      endpoint: undefined,
      viewport: undefined,
      expectedEndpoint: 'http://127.0.0.1:9222/json/version',
      expectedViewport: { width: 1280, height: 800 },
    },
    {
      endpoint: cdpEndpoint,
      viewport: { width: 960, height: 720 },
      expectedEndpoint: cdpEndpoint,
      expectedViewport: { width: 960, height: 720 },
    },
  ])('discovers the WebSocket from $expectedEndpoint', async (testCase) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ webSocketDebuggerUrl: wsEndpoint })),
    );
    const remote = new RemoteBrowser({ cdpEndpoint: testCase.endpoint });

    await remote.launch({ defaultViewport: testCase.viewport });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(testCase.expectedEndpoint);
    expect(connect).toHaveBeenCalledExactlyOnceWith({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: testCase.expectedViewport,
    });
    expect(browser.on).toHaveBeenCalledWith(
      'targetcreated',
      expect.any(Function),
    );
  });

  it('rejects HTTP errors before parsing the body or connecting', async () => {
    const response = new Response('not JSON', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    const parseJson = vi.spyOn(response, 'json');
    fetchMock.mockResolvedValue(response);

    await expect(new RemoteBrowser({ cdpEndpoint }).launch()).rejects.toThrow(
      `Failed to fetch CDP endpoint ${cdpEndpoint}: 503 Service Unavailable`,
    );

    expect(parseJson).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it.each([{}, { webSocketDebuggerUrl: '' }])(
    'rejects missing or empty debugger addresses before connecting: %j',
    async (metadata) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(metadata)));

      await expect(new RemoteBrowser({ cdpEndpoint }).launch()).rejects.toThrow(
        `CDP endpoint ${cdpEndpoint} did not return a webSocketDebuggerUrl`,
      );

      expect(connect).not.toHaveBeenCalled();
    },
  );

  it('passes the ten-second timeout signal to fetch and propagates its abort', async () => {
    const controller = new AbortController();
    const timeoutError = new DOMException(
      'CDP discovery timed out',
      'TimeoutError',
    );
    const timeout = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(controller.signal);
    fetchMock.mockImplementation((_input, init) => {
      const signal = init?.signal;
      if (!signal) return Promise.reject(new Error('Missing abort signal'));
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      });
    });

    const launch = new RemoteBrowser({ cdpEndpoint }).launch();
    const rejection = expect(launch).rejects.toBe(timeoutError);
    controller.abort(timeoutError);
    await rejection;

    expect(timeout).toHaveBeenCalledExactlyOnceWith(10_000);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(cdpEndpoint, {
      signal: controller.signal,
    });
    expect(connect).not.toHaveBeenCalled();
  });
});
