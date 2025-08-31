/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger } from '@agent-infra/logger';

export interface FormatParser {
  canParse(text: string): boolean;
  parse(text: string): { thought: string | null; actionStr: string };
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

  parse(text: string): { thought: string | null; actionStr: string } {
    this.logger.debug('[OmniFormatParser] start...');
    const thinkMatch = text.match(/<think[^>]*>([\s\S]*?)<\/think[^>]*>/i);
    const thought = thinkMatch ? thinkMatch[1].trim() : null;

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
      thought,
      actionStr,
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
class UnifiedBCFormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  canParse(text: string): boolean {
    const hasBasicStructure =
      text.includes('Thought:') &&
      (text.includes('Action:') || text.includes('Action：')) &&
      !text.includes('Reflection:') &&
      !text.includes('Action_Summary:');

    this.logger.debug('[UnifiedBCFormatParser] canParse:', hasBasicStructure);
    return hasBasicStructure;
  }

  parse(text: string): { thought: string | null; actionStr: string } {
    this.logger.debug('[UnifiedBCFormatParser] start parsing...');

    // 解析思考内容 - 这部分保持不变
    const thoughtMatch = text.match(/Thought:\s*([\s\S]+?)(?=\s*Action[：:]|$)/);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : null;

    // 解析动作内容
    let actionStr = '';
    if (text.includes('Action:') || text.includes('Action：')) {
      const actionParts = text.split(/Action[：:]/);
      actionStr = actionParts[actionParts.length - 1].trim();
    } else {
      actionStr = text;
    }

    this.logger.debug('[UnifiedBCFormatParser] parse result:', {
      thought: thought?.substring(0, 100),
      actionStr: actionStr.substring(0, 100),
    });

    return {
      thought,
      actionStr,
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

  parse(text: string): { thought: string | null; actionStr: string } {
    this.logger.debug('[BCComplexFormatParser] start...');
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
      thought: reflection && thought ? `${reflection}, ${thought}` : (thought ?? reflection),
      actionStr,
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

  parse(text: string): { thought: string | null; reflection: string | null; actionStr: string } {
    this.logger.debug('[O1FormatParser] start...');
    const thoughtMatch = text.match(/<Thought>\s*([\s\S]*?)\s*<\/Thought>/s);
    const actionSummaryMatch = text.match(/Action_Summary:\s*([\s\S]*?)\s*Action:/s);
    const actionMatch = text.match(/Action:\s*([\s\S]*?)\s*<\/Output>/s);

    const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : null;
    const actionSummaryContent = actionSummaryMatch ? actionSummaryMatch[1].trim() : null;
    const actionContent = actionMatch ? actionMatch[1].trim() : '';

    const thought = actionSummaryContent
      ? `${thoughtContent}\n<Action_Summary>\n${actionSummaryContent}`
      : thoughtContent;

    return {
      thought,
      reflection: null,
      actionStr: actionContent,
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
export class FallbackFormatParser implements FormatParser {
  constructor(private logger: ConsoleLogger) {}

  canParse(text: string): boolean {
    // 作为兜底解析器，总是返回 true
    this.logger.debug('[FallbackFormatParser] canParse: always true');
    return true;
  }

  parse(text: string): { thought: string | null; reflection: string | null; actionStr: string } {
    this.logger.debug('[FallbackFormatParser] start parsing...');

    // 解析思考内容
    const thoughtMatch = text.match(/Thought:\s*([\s\S]+?)(?=\s*Action[：:]|$)/);
    const thought = thoughtMatch ? thoughtMatch[1].trim() : null;

    // 检查特殊情况
    const hasChineseColon = text.includes('Action：');
    const hasEnglishColon = text.includes('Action:');
    const hasEmptyAction = /Action[：:]\s*$/.test(text.trim());
    const isDirectFunctionCall =
      /^\w+\([^)]*\)/.test(text.trim()) && !hasChineseColon && !hasEnglishColon;

    this.logger.debug('[FallbackFormatParser] 检测到的格式:', {
      hasChineseColon,
      hasEnglishColon,
      hasEmptyAction,
      isDirectFunctionCall,
    });

    // 解析动作内容
    let actionStr = '';

    if (hasEmptyAction) {
      // 处理空动作输入，保持 actionStr 为空字符串
      this.logger.debug('[FallbackFormatParser] 处理空动作输入');
    } else if (isDirectFunctionCall) {
      // 如果是直接的函数调用，整个文本就是动作字符串
      actionStr = text.trim();
      this.logger.debug('[FallbackFormatParser] 处理直接函数调用格式');
    } else if (hasChineseColon) {
      // 处理中文冒号
      const actionParts = text.split('Action：');
      actionStr = actionParts[actionParts.length - 1].trim();
      this.logger.debug('[FallbackFormatParser] 处理中文冒号格式');
    } else if (hasEnglishColon) {
      // 处理英文冒号
      const actionParts = text.split('Action:');
      actionStr = actionParts[actionParts.length - 1].trim();
      this.logger.debug('[FallbackFormatParser] 处理英文冒号格式');
    } else {
      // 兜底处理：使用整个文本作为动作字符串
      actionStr = text.trim();
      this.logger.debug('[FallbackFormatParser] 使用兜底处理');
    }

    this.logger.debug('[FallbackFormatParser] parse result:', {
      thought: thought?.substring(0, 100),
      actionStr: actionStr.substring(0, 100),
    });

    return {
      thought: thought || (isDirectFunctionCall ? '' : null), // 对于直接函数调用，如果没有思考内容，返回空字符串
      reflection: null,
      actionStr,
    };
  }
}

export class FormatParserChain {
  private parsers: FormatParser[];

  constructor(private logger: ConsoleLogger) {
    this.parsers = [
      new OmniFormatParser(this.logger),
      new UnifiedBCFormatParser(this.logger),
      new BCComplexFormatParser(this.logger),
      new O1FormatParser(this.logger),
      new FallbackFormatParser(this.logger), // Must be the last one
    ];
  }

  parse(text: string): { thought: string | null; actionStr: string } {
    this.logger.debug('[FormatParserChain] start...');

    for (const parser of this.parsers) {
      const parserName = parser.constructor.name;
      this.logger.debug(`[FormatParserChain] try parser: ${parserName}`);

      if (parser.canParse(text)) {
        const result = parser.parse(text);
        this.logger.debug(`[FormatParserChain] ${parserName} result:`, {
          thought: result.thought?.substring(0, 100),
          actionStr: result.actionStr,
        });
        return result;
      }
    }

    // Theoretically, this should not be reached, as the DefaultFormatParser always returns true.
    this.logger.warn('[FormatParserChain]', 'No appropriate parser found, return default value.');
    return {
      thought: null,
      actionStr: text.trim(),
    };
  }
}
