/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createFilesSpanExporterFromRuntimeEnv } from '@agentpond/files-sdk/otel';
import {
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';

import { logger } from '@main/logger';

let provider: NodeTracerProvider | undefined;
let initialization: Promise<void> | undefined;

function isEnabled(): boolean {
  return ['1', 'true'].includes(
    process.env.AGENTPOND_ENABLED?.toLowerCase() ?? '',
  );
}

async function initialize(): Promise<void> {
  provider = new NodeTracerProvider({
    spanProcessors: [
      new SimpleSpanProcessor(createFilesSpanExporterFromRuntimeEnv()),
    ],
  });
  provider.register();
}

export async function initializeAgentPondTracing(): Promise<void> {
  if (!isEnabled() || provider) {
    return;
  }

  initialization ??= initialize().catch((error: unknown) => {
    logger.warn(
      '[AgentPond] Tracing is unavailable:',
      error instanceof Error ? error.message : String(error),
    );
  });
  await initialization;
}

export async function flushAgentPondTracing(): Promise<void> {
  try {
    await provider?.forceFlush();
  } catch (error: unknown) {
    logger.warn(
      '[AgentPond] Failed to flush traces:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
