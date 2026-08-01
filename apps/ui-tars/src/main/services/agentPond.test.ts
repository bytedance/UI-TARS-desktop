/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { GUIAgent } from '@ui-tars/sdk';
import { Operator, StatusEnum } from '@ui-tars/sdk/core';

import { flushAgentPondTracing, initializeAgentPondTracing } from './agentPond';

vi.mock('electron-log', () => ({
  default: {
    initialize: vi.fn(),
    scope: () => ({
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
    transports: {
      console: { level: 'info' },
      file: {
        getFile: () => ({ path: '/tmp/ui-tars-agentpond-main.log' }),
        level: 'info',
      },
    },
  },
}));

vi.mock('electron', () => ({
  app: { on: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] },
  dialog: {},
  shell: { openPath: vi.fn() },
}));

const PROMPT_SENTINEL = 'agentpond-private-prompt';
const RESPONSE_SENTINEL = 'agentpond-private-response';
const CREDENTIAL_SENTINEL = 'agentpond-private-credential';
const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

class MockOperator extends Operator {
  async screenshot() {
    return {
      base64: ONE_PIXEL_PNG,
      width: 1,
      height: 1,
      scaleFactor: 1,
    };
  }

  async execute() {
    return { status: StatusEnum.END };
  }
}

const configuredRoot = process.env.AGENTPOND_E2E_ROOT;
const traceRoot =
  configuredRoot ?? (await mkdtemp(join(tmpdir(), 'ui-tars-agentpond-')));
let modelServer: Server | undefined;

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!modelServer?.listening) {
      resolve();
      return;
    }
    modelServer.close((error) => (error ? reject(error) : resolve()));
  });
  if (!configuredRoot) {
    await rm(traceRoot, { force: true, recursive: true });
  }
});

describe('AgentPond tracing', () => {
  it('reads back a privacy-safe trace from the real GUIAgent model path', async () => {
    process.env.AGENTPOND_ENABLED = '1';
    process.env.AGENTPOND_PROJECT_ID = 'default-project';
    process.env.FILES_SDK_PROVIDER = 'fs';
    process.env.FILES_SDK_ROOT = traceRoot;

    modelServer = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `Thought: ${RESPONSE_SENTINEL}\nAction: finished()`,
              },
            },
          ],
          usage: { total_tokens: 11 },
        }),
      );
    });
    await new Promise<void>((resolve) =>
      modelServer!.listen(0, '127.0.0.1', resolve),
    );
    const { port } = modelServer.address() as AddressInfo;

    await initializeAgentPondTracing();
    const agent = new GUIAgent({
      model: {
        apiKey: CREDENTIAL_SENTINEL, // secretlint-disable-line -- synthetic privacy-test marker
        baseURL: `http://127.0.0.1:${port}/v1`,
        model: 'ui-tars-agentpond-test-model',
      },
      operator: new MockOperator(),
      logger: {
        error: vi.fn(),
        info: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
      },
      maxLoopCount: 1,
    });

    await agent.run(PROMPT_SENTINEL);
    await flushAgentPondTracing();

    const traceKeys = (await readdir(traceRoot, { recursive: true })).filter(
      (key) => key.endsWith('.json') && !key.endsWith('.meta.json'),
    );
    expect(traceKeys.length).toBeGreaterThan(0);

    const rawTraces = await Promise.all(
      traceKeys.map((key) => readFile(join(traceRoot, key), 'utf8')),
    );
    const resourceSpans = rawTraces.flatMap((rawTrace) =>
      JSON.parse(rawTrace),
    ) as Array<{
      scopeSpans: Array<{
        spans: Array<{
          attributes: Array<{ key: string; value: { intValue?: number } }>;
          name: string;
          traceId: string;
        }>;
      }>;
    }>;
    const spans = resourceSpans.flatMap((resourceSpan) =>
      resourceSpan.scopeSpans.flatMap((scopeSpan) => scopeSpan.spans),
    );
    const span = spans.find(
      (candidate) =>
        candidate.name === 'ui-tars.model.invoke' &&
        candidate.attributes.some(
          ({ key, value }) =>
            key === 'llm.token_count.total' && value.intValue === 11,
        ),
    );

    expect(span).toMatchObject({
      name: 'ui-tars.model.invoke',
      traceId: expect.stringMatching(/^[a-f0-9]{32}$/),
    });
    expect(span?.attributes).toContainEqual({
      key: 'llm.token_count.total',
      value: { intValue: 11 },
    });
    const rawTracePayload = rawTraces.join('\n');
    expect(rawTracePayload).not.toContain(PROMPT_SENTINEL);
    expect(rawTracePayload).not.toContain(RESPONSE_SENTINEL);
    expect(rawTracePayload).not.toContain(CREDENTIAL_SENTINEL);
  }, 15_000);
});
