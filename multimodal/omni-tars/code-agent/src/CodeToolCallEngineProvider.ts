/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngineProvider, ToolCallEngineContext } from '@omni-tars/core';
import { CodeToolCallEngine } from './CodeToolCallEngine';

export class CodeToolCallEngineProvider extends ToolCallEngineProvider<CodeToolCallEngine> {
  readonly name = 'code-tool-call-engine';
  readonly priority = 80; // High priority for code tasks
  readonly description =
    'Tool call engine optimized for code execution, file editing, and development tasks';

  protected createEngine(): CodeToolCallEngine {
    return new CodeToolCallEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    // Check if any tools are code-related
    if (context.toolCalls) {
      const codeToolNames = ['str_replace_editor', 'execute_bash'];

      const hasCodeTools = context?.toolCalls?.some((tool) =>
        codeToolNames.some((codeName) =>
          tool.function.name.toLowerCase().includes(codeName.toLowerCase()),
        ),
      );

      return !!hasCodeTools;
    }

    // Fallback： Check if the latest model output contains <code_env></code_env> tags
    if (context.latestAssistantMessage) {
      const hasCodeEnvTags = context.latestAssistantMessage.includes('<code_env>');

      if (hasCodeEnvTags) {
        return true;
      }
    }

    return false;
  }
}
