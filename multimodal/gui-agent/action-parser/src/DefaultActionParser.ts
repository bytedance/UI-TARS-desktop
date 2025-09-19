/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAction, ParsedGUIResponse } from '@gui-agent/shared/types';
import { BaseActionParser } from '@gui-agent/shared/base';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { FormatParserChain } from './FomatParsers';
import { ActionParserHelper } from './ActionParserHelper';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class DefaultActionParser extends BaseActionParser {
  private logger: ConsoleLogger;
  private helper: ActionParserHelper;

  constructor(logger: ConsoleLogger = defaultLogger) {
    super();
    this.logger = logger.spawn('[DefaultActionParser]');
    this.helper = new ActionParserHelper(this.logger);
  }

  parsePrediction(input: string): ParsedGUIResponse | null {
    this.logger.debug(
      '[parsePrediction] starting:',
      input.length <= 30 ? input : input.substring(0, 30) + '...',
    );
    const originInput = input;

    input = input.trim();

    let reasoningContent = null;
    let rawActionStrings: string[] | undefined = undefined;
    let actions: BaseAction[] | undefined = undefined;
    try {
      ({ reasoningContent, rawActionStrings, actions } = this.extractActionStrings(input));
    } catch (error) {
      return this.createErrorResponse((error as Error).message, originInput);
    }

    // if actions has prased, just return it
    if (actions && actions.length > 0) {
      return {
        rawContent: originInput,
        reasoningContent,
        rawActionStrings,
        actions,
      };
    }

    if (!rawActionStrings || rawActionStrings.length <= 0) {
      return this.createErrorResponse('There is no GUI action detected', originInput);
    }

    actions = [];
    try {
      for (const actionString of rawActionStrings) {
        const action = this.helper.parseActionCallString(actionString);
        if (action) actions.push(action);
      }
    } catch (error) {
      return this.createErrorResponse((error as Error).message, originInput);
    }

    this.logger.debug('[parsePrediction] reasoningContent:', reasoningContent);
    this.logger.debug('[parsePrediction] actions lenth:', actions.length);

    return {
      rawContent: originInput,
      reasoningContent,
      rawActionStrings,
      actions,
    };
  }

  /**
   * Extract action strings from input
   * @param input Input string
   * @returns Object containing reasoning content and raw action strings
   * @throws {Error} When input format is invalid or parsing fails
   */
  extractActionStrings(input: string): {
    reasoningContent?: string;
    rawActionStrings?: string[];
    actions?: BaseAction[];
  } {
    const parserChain = new FormatParserChain(this.logger);
    const { reasoningContent, rawActionStrings, actions } = parserChain.parse(input);
    this.logger.debug('[extractActionStrings] result of chains:', {
      reasoningContent,
      rawActionStrings,
    });

    return {
      reasoningContent: reasoningContent || undefined,
      rawActionStrings: rawActionStrings || undefined,
      actions: actions || undefined,
    };
  }

  private createErrorResponse(errorMessage: string, rawContent: string): ParsedGUIResponse {
    return {
      errorMessage,
      rawContent,
      actions: [],
    };
  }
}
