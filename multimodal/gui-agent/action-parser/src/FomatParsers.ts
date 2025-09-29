/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { BaseAction } from '@gui-agent/shared/types';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
// Remove circular dependency
import { ActionParserHelper } from './ActionParserHelper';
import { serializeAction } from '@gui-agent/shared/utils';

export interface FormatParser {
  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null;
}

export class XMLFormatParser implements FormatParser {
  private helper: ActionParserHelper;
  constructor(private logger: ConsoleLogger) {
    this.helper = new ActionParserHelper(this.logger);
  }

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null {
    if (text.includes('computer_env')) {
      // The text is omni format, not a solid XML format, refuse parse
      this.logger.debug('[XMLFormatParser] canParse:', false);
      return null;
    }

    const builder = new XMLBuilder();
    const parser = new XMLParser({
      ignoreAttributes: false,
    });
    const object = parser.parse(text);

    if (!object || typeof object !== 'object') {
      this.logger.debug('[XMLFormatParser] canParse:', false);
      return null;
    }

    let canParse = false;
    let reasoningContent = null;
    const actions: BaseAction[] = [];

    for (const [key, value] of Object.entries(object as Record<string, unknown>)) {
      this.logger.debug('[XMLFormatParser] key:', key);
      this.logger.debug('[XMLFormatParser] value:', value);
      if (/^think.*$/.test(key)) {
        if (typeof value === 'string') {
          reasoningContent = value;
        } else {
          reasoningContent = builder.build(value);
        }
        continue;
      }
      if (key === 'answer') {
        canParse = true;
        actions.push({
          type: 'finished',
          inputs: {
            content: value as string,
          },
        });
        continue;
      }
      if (key === 'seed:tool_call') {
        canParse = true;
        actions.push(...this.helper.standardizeGUIActionsFromXMLObject(value));
        continue;
      }
    }

    this.logger.debug('[XMLFormatParser] canParse:', canParse);
    if (!canParse) return null;

    if (actions.length <= 0) {
      throw Error('No valid GUI action string was detected');
    }

    const rawActionStrings: string[] = [];
    for (const action of actions) {
      rawActionStrings.push(serializeAction(action));
    }

    return {
      reasoningContent,
      rawActionStrings,
      actions,
    };
  }
}

/**
 * OmniFormatParser's example:
 *
 * <think>Hmm...</think>
 * <computer_env>
 * Action: click(point='<point>400 435</point>')
 * </computer_env>
 *
 * <think>The user ...</think>
 * <answer>
 * The answer to 1+1 is 2.
 * </answer>
 */
export class OmniFormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  canParse(text: string): boolean {
    const canParse =
      text.includes('<computer_env>') || (text.includes('<answer>') && text.includes('</answer>'));
    this.logger.debug('[OmniFormatParser] canParse:', canParse);
    return canParse;
  }

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null {
    if (!this.canParse(text)) {
      return null;
    }

    // this.logger.debug('[OmniFormatParser] start...');
    const thinkMatch = text.match(/<think[^>]*>([\s\S]*?)<\/think[^>]*>/i);
    const reasoningContent = thinkMatch ? thinkMatch[1].trim() : null;

    let actionStr = '';
    const computerEnvMatch = text.match(/<computer_env>([\s\S]*?)<\/computer_env>/i);
    if (computerEnvMatch) {
      actionStr = computerEnvMatch[1].trim();
      actionStr = actionStr.replace(/^Action:\s*/i, '');
    } else {
      const answerMatch = text.match(/<answer>([\s\S]*?)<\/answer>/i);
      const finishContent = answerMatch?.[1]?.trim();
      actionStr = `finished(content='${finishContent}')`;
    }

    const result = {
      reasoningContent,
      rawActionStrings: actionStr.split('\n\n').filter((action) => action.trim() !== ''),
      actions: undefined,
    };
    return result;
  }
}

/**
 * UnifiedBCFormatParser's example:
 *
 * Thought: I need to click this button
 * Action: click(start_box='(100,200)')
 *
 * Thought: I need to click on this element
 * Action: click(start_box='[130,226]')
 *
 * Thought: I need to click this button
 * Action: click(start_box='<bbox>637 964 637 964</bbox>')
 *
 * Thought: I need to click on this element
 * Action: click(point='<point>510 150</point>')
 */
export class UnifiedBCFormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  canParse(text: string): boolean {
    const hasBasicStructure =
      text.includes('Thought:') &&
      // (text.includes('Action:') || text.includes('Action：')) &&
      // The Chinese character '：' is not supported as it's often a result of LLM hallucination
      text.includes('Action:') &&
      !text.includes('Reflection:') &&
      !text.includes('Action_Summary:');

    this.logger.debug('[UnifiedBCFormatParser] canParse:', hasBasicStructure);
    return hasBasicStructure;
  }

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null {
    if (!this.canParse(text)) {
      return null;
    }

    // this.logger.debug('[UnifiedBCFormatParser] start parsing...');

    // Parse thought content - this part remains unchanged
    // const thoughtMatch = text.match(/Thought:\s*([\s\S]+?)(?=\s*Action[：:]|$)/);
    const thoughtMatch = text.match(/Thought:\s*([\s\S]+?)(?=\s*Action:|$)/);
    const reasoningContent = thoughtMatch ? thoughtMatch[1].trim() : null;

    // Parse action content
    let actionStr = '';
    // if (text.includes('Action:') || text.includes('Action：')) {
    if (text.includes('Action:')) {
      // const actionParts = text.split(/Action[：:]/);
      const actionParts = text.split(/Action:/);
      actionStr = actionParts[actionParts.length - 1].trim();
    } else {
      actionStr = text;
    }

    // this.logger.debug('[UnifiedBCFormatParser] parse result:', {
    //   thought: thought?.substring(0, 100),
    //   actionStr: actionStr.substring(0, 100),
    // });

    return {
      reasoningContent,
      rawActionStrings: actionStr.split('\n\n').filter((action) => action.trim() !== ''),
      actions: undefined,
    };
  }
}

/**
 * BCComplexFormatParser's example:
 *
 * Reflection: This is a reflection
 * Action_Summary: This is a summary
 * Action: type(text='Hello', start_box='(300,400)')
 */
class BCComplexFormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  canParse(text: string): boolean {
    const canParse =
      (text.includes('Reflection:') && text.includes('Action_Summary:')) ||
      text.startsWith('Action_Summary:');
    this.logger.debug('[BCComplexFormatParser] canParse:', canParse);
    return canParse;
  }

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null {
    if (!this.canParse(text)) {
      return null;
    }

    let thought: string | null = null;
    let reflection: string | null = null;
    let actionStr = '';

    if (text.startsWith('Reflection:')) {
      const reflectionMatch = text.match(
        /Reflection:\s*([\s\S]+?)Action_Summary:\s*([\s\S]+?)(?=\s*Action[：:]|$)/,
      );
      if (reflectionMatch) {
        reflection = reflectionMatch[1].trim();
        thought = reflectionMatch[2].trim();
        this.logger.debug('[BCComplexFormatParser] Reflection and Action_Summary');
      }
    } else if (text.startsWith('Action_Summary:')) {
      const summaryMatch = text.match(/Action_Summary:\s*([\s\S]+?)(?=\s*Action[：:]|$)/);
      if (summaryMatch) {
        thought = summaryMatch[1].trim();
        this.logger.debug('[BCComplexFormatParser] Only Action_Summary');
      }
    }

    if (text.includes('Action:') || text.includes('Action：')) {
      const actionParts = text.split(/Action[：:]/);
      actionStr = actionParts[actionParts.length - 1].trim();
    }

    return {
      reasoningContent:
        reflection && thought ? `${reflection}, ${thought}` : (thought ?? reflection),
      rawActionStrings: actionStr.split('\n\n').filter((action) => action.trim() !== ''),
      actions: undefined,
    };
  }
}

/**
 * O1FormatParser's example:
 *
 * <Thought>Complex operation</Thought>
 * Action_Summary: Multiple sequential actions
 * Action: click(start_box='(100,200)')
 * </Output>
 */
class O1FormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  canParse(text: string): boolean {
    const canParse = text.includes('<Thought>') && text.includes('</Thought>');
    this.logger.debug('[O1FormatParser] canParse:', canParse);
    return canParse;
  }

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null {
    // this.logger.debug('[O1FormatParser] start...');
    if (!this.canParse(text)) {
      return null;
    }

    const thoughtMatch = text.match(/<Thought>\s*([\s\S]*?)\s*<\/Thought>/s);
    const actionSummaryMatch = text.match(/Action_Summary:\s*([\s\S]*?)\s*Action:/s);
    const actionMatch = text.match(/Action:\s*([\s\S]*?)\s*<\/Output>/s);

    const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : null;
    const actionSummaryContent = actionSummaryMatch ? actionSummaryMatch[1].trim() : null;
    const actionContent = actionMatch ? actionMatch[1].trim() : '';

    // const thought = actionSummaryContent
    //   ? `${thoughtContent}\n<Action_Summary>\n${actionSummaryContent}`
    //   : thoughtContent;

    const thought = actionSummaryContent
      ? `${thoughtContent}, ${actionSummaryContent}`
      : thoughtContent;

    return {
      reasoningContent: thought,
      rawActionStrings: actionContent.split('\n\n').filter((action) => action.trim() !== ''),
      actions: undefined,
    };
  }
}

/**
 * FallbackFormatParser handles all edge cases and serves as the final fallback:
 * 1. Chinese colon in Action：
 * 2. Empty action input
 * 3. Direct function call without Action keyword
 * 4. Any other unhandled formats (fallback)
 */
class FallbackFormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } | null {
    this.logger.debug('[FallbackFormatParser] canParse: always true');

    // Try to parse the action string with function call format
    // const actionMatch = text.match(/Action[：:]?\s*([\s\S]*?)(?=\s*<\/Output>|$)/s);
    const regex = /\w+\((?:[^()"']|"[^"]*"|'[^']*'|\([^()]*\))*\)/;
    const actionMatch = text.match(regex);

    if (!actionMatch) {
      this.logger.error('[FallbackFormatParser] there is no function call format in the text');
      throw Error('No valid GUI action string was detected');
    }

    const actionStr = actionMatch[0].trim();

    // Parse thought content
    const thoughtMatch = text.match(/Thought:\s*([\s\S]+?)(?=\s*Action[：:]|$)/);
    const thoughtStr = thoughtMatch ? thoughtMatch[1].trim() : null;

    // Check special cases
    // const hasChineseColon = text.includes('Action：');
    // const hasEnglishColon = text.includes('Action:');
    // const hasEmptyAction = /Action[：:]\s*$/.test(text.trim());
    // const isDirectFunctionCall =
    //   /^\w+\([^)]*\)/.test(text.trim()) && !hasChineseColon && !hasEnglishColon;

    // this.logger.debug('[FallbackFormatParser] parse result:', {
    //   thought: thought?.substring(0, 100),
    //   actionStr: actionStr.substring(0, 100),
    // });

    return {
      reasoningContent: thoughtStr,
      rawActionStrings: actionStr.split('\n\n').filter((action) => action.trim() !== ''),
      actions: undefined,
    };
  }
}

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class FormatParserChain {
  private logger: ConsoleLogger;
  private parsers: FormatParser[];

  constructor(logger: ConsoleLogger = defaultLogger) {
    this.logger = logger.spawn('[FormatParserChain]');
    this.parsers = [
      new XMLFormatParser(this.logger),
      new OmniFormatParser(this.logger),
      new UnifiedBCFormatParser(this.logger),
      new BCComplexFormatParser(this.logger),
      new O1FormatParser(this.logger),
      new FallbackFormatParser(this.logger), // Must be the last one
    ];
  }

  parse(text: string): {
    reasoningContent: string | null;
    rawActionStrings: string[] | undefined;
    actions: BaseAction[] | undefined;
  } {
    this.logger.debug('[FormatParserChain] start...');

    for (const parser of this.parsers) {
      const result = parser.parse(text);
      if (result) return result;
    }

    // Theoretically, this should not be reached, as the DefaultFormatParser always returns true.
    this.logger.warn('[FormatParserChain]', 'No appropriate parser found');
    throw Error('No valid GUI action string was detected');
  }
}
