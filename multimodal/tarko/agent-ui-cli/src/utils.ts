/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentEventStream } from '@tarko/interface';
import { TraceData, TraceTransformer } from './types';

/**
 * Load and parse trace file
 */
export async function loadTraceFile(filePath: string): Promise<unknown> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Trace file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.jsonl') {
    const lines = content.trim().split('\n');
    const events: AgentEventStream.Event[] = [];

    for (const line of lines) {
      if (line.trim()) {
        try {
          events.push(JSON.parse(line));
        } catch (error) {
          throw new Error(`Invalid JSON in JSONL line: ${line}`);
        }
      }
    }

    return { events };
  } else {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in trace file: ${filePath}`);
    }
  }
}

/**
 * Load transformer function from file
 */
export async function loadTransformer(transformerPath: string): Promise<TraceTransformer> {
  const absolutePath = path.resolve(transformerPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Transformer file not found: ${transformerPath}`);
  }

  try {
    let module: any;
    const ext = path.extname(absolutePath).toLowerCase();

    if (ext === '.ts') {
      // Use jiti to load TypeScript files
      const { createJiti } = await import('jiti');
      const jiti = createJiti(__filename, {
        moduleCache: false,
        interopDefault: true,
      });
      module = await jiti.import(absolutePath, { default: true });
    } else {
      // Use native import for JavaScript files
      const fileUrl = `file://${absolutePath}?t=${Date.now()}`;
      module = await import(fileUrl);
    }

    const transformer = module.default || module.transformer || module;

    if (typeof transformer !== 'function') {
      throw new Error('Transformer must export a function');
    }

    return transformer as TraceTransformer;
  } catch (error) {
    throw new Error(
      `Failed to load transformer: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Validate trace data format
 */
export function validateTraceData(data: unknown): TraceData {
  if (!data || typeof data !== 'object') {
    throw new Error('Trace data must be an object');
  }

  const traceData = data as Record<string, unknown>;

  if (!traceData.events || !Array.isArray(traceData.events)) {
    throw new Error('Trace data must contain an "events" array');
  }

  return traceData as unknown as TraceData;
}

/**
 * Generate default output filename
 */
export function generateDefaultOutputFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `tarko-agui-${timestamp}.html`;
}

/**
 * Resolve output file path
 */
export function resolveOutputPath(outputOption?: string): string {
  if (outputOption) {
    return path.resolve(outputOption);
  }

  return path.resolve(generateDefaultOutputFilename());
}

/**
 * Generate transformed JSON output path
 */
export function generateTransformedOutputPath(tracePath: string): string {
  const ext = path.extname(tracePath);
  const baseName = path.basename(tracePath, ext);
  const dirName = path.dirname(tracePath);
  return path.join(dirName, `${baseName}-transformed.json`);
}

/**
 * Write transformed data to file
 */
export function writeTransformedData(data: TraceData, outputPath: string): void {
  try {
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to write transformed data: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
