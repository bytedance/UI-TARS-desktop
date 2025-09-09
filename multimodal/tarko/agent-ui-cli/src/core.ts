/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentUIBuilder, AgentUIBuilderInputOptions } from '@tarko/agent-ui-builder';
import { AguiCLIOptions, TraceData } from './types';
import {
  loadTraceFile,
  loadTransformer,
  validateTraceData,
  resolveOutputPath,
  generateTransformedOutputPath,
  writeTransformedData,
} from './utils';
import { loadAguiConfig, normalizeSessionInfo } from './config';

/**
 * Core AGUI CLI functionality
 */
export class AguiCore {
  /**
   * Process the dump command
   */
  static async dump(tracePath: string, options: AguiCLIOptions): Promise<string> {
    try {
      let traceData = await loadTraceFile(tracePath);

      if (options.transformer) {
        const transformer = await loadTransformer(options.transformer);
        traceData = transformer(traceData);
      }

      const validatedTraceData = validateTraceData(traceData);

      // Dump transformed data if requested
      if (options.dumpTransformed && options.transformer) {
        const transformedOutputPath = generateTransformedOutputPath(tracePath);
        writeTransformedData(validatedTraceData, transformedOutputPath);
        console.log(`✅ Transformed data saved: ${transformedOutputPath}`);
      }

      const config = await loadAguiConfig(options.config);

      const builderOptions: AgentUIBuilderInputOptions = {
        events: validatedTraceData.events,
        sessionInfo: normalizeSessionInfo(config.sessionInfo || {}),
        serverInfo: config.serverInfo as any,
        uiConfig: config.uiConfig as any,
        staticPath: config.staticPath,
      };

      const builder = new AgentUIBuilder(builderOptions);
      const outputPath = resolveOutputPath(options.out);
      const html = builder.dump(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(
        `Failed to generate HTML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Process the upload command
   */
  static async upload(
    tracePath: string,
    uploadUrl: string,
    options: AguiCLIOptions,
  ): Promise<string> {
    try {
      let traceData = await loadTraceFile(tracePath);

      if (options.transformer) {
        const transformer = await loadTransformer(options.transformer);
        traceData = transformer(traceData);
      }

      const validatedTraceData = validateTraceData(traceData);

      // Dump transformed data if requested
      if (options.dumpTransformed && options.transformer) {
        const transformedOutputPath = generateTransformedOutputPath(tracePath);
        writeTransformedData(validatedTraceData, transformedOutputPath);
        console.log(`✅ Transformed data saved: ${transformedOutputPath}`);
      }

      const config = await loadAguiConfig(options.config);

      const builderOptions: AgentUIBuilderInputOptions = {
        events: validatedTraceData.events,
        sessionInfo: normalizeSessionInfo(config.sessionInfo || {}),
        serverInfo: config.serverInfo as any,
        uiConfig: config.uiConfig as any,
        staticPath: config.staticPath,
      };

      const builder = new AgentUIBuilder(builderOptions);
      const html = builder.dump();
      const shareUrl = await builder.upload(html, uploadUrl);

      return shareUrl;
    } catch (error) {
      throw new Error(
        `Failed to upload HTML: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
