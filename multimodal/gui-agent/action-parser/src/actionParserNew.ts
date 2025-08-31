/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ActionInputs,
  PredictionParsed,
  UITarsModelVersion,
  MAX_RATIO,
  IMAGE_FACTOR,
  MIN_PIXELS,
  MAX_PIXELS_V1_5,
} from '@ui-tars/shared/types';
import isNumber from 'lodash.isnumber';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

import { FormatParser, FormatParserChain } from './formatParserChain';

const logger = new ConsoleLogger('[action-parser]', LogLevel.DEBUG);

function roundByFactor(num: number, factor: number): number {
  return Math.round(num / factor) * factor;
}

function floorByFactor(num: number, factor: number): number {
  return Math.floor(num / factor) * factor;
}

function ceilByFactor(num: number, factor: number): number {
  return Math.ceil(num / factor) * factor;
}

function smartResizeForV15(
  height: number,
  width: number,
  maxRatio: number = MAX_RATIO,
  factor: number = IMAGE_FACTOR,
  minPixels: number = MIN_PIXELS,
  maxPixels: number = MAX_PIXELS_V1_5,
): [number, number] | null {
  logger.debug('[smartResizeForV15] 输入参数:', {
    height,
    width,
    maxRatio,
    factor,
    minPixels,
    maxPixels,
  });

  if (Math.max(height, width) / Math.min(height, width) > maxRatio) {
    console.error(
      `absolute aspect ratio must be smaller than ${maxRatio}, got ${
        Math.max(height, width) / Math.min(height, width)
      }`,
    );
    return null;
  }

  let wBar = Math.max(factor, roundByFactor(width, factor));
  let hBar = Math.max(factor, roundByFactor(height, factor));
  logger.debug('[smartResizeForV15] 初始计算结果:', { wBar, hBar, pixels: hBar * wBar });

  if (hBar * wBar > maxPixels) {
    const beta = Math.sqrt((height * width) / maxPixels);
    hBar = floorByFactor(height / beta, factor);
    wBar = floorByFactor(width / beta, factor);
    logger.debug('[smartResizeForV15] 超过最大像素，重新计算:', { beta, hBar, wBar });
  } else if (hBar * wBar < minPixels) {
    const beta = Math.sqrt(minPixels / (height * width));
    hBar = ceilByFactor(height * beta, factor);
    wBar = ceilByFactor(width * beta, factor);
    logger.debug('[smartResizeForV15] 低于最小像素，重新计算:', { beta, hBar, wBar });
  }

  const result: [number, number] = [wBar, hBar];
  logger.debug('[smartResizeForV15] 最终结果:', result);
  return result;
}

export function actionParserNew(prediction: string): {
  parsed: PredictionParsed[];
} {
  logger.debug('[actionParserNew] 开始解析预测文本:', prediction.substring(0, 200) + '...');
  const parsed = parseActionInternal(prediction);
  logger.debug('[actionParserNew] 解析完成，结果数量:', parsed.length);
  logger.debug('[actionParserNew] 解析结果:', JSON.stringify(parsed, null, 2));

  return { parsed };
}

export function actionStringParserNew(prediction: string): string[] {
  logger.debug('[actionStringParserNew] 开始解析动作字符串:', prediction.substring(0, 200) + '...');
  const text = prediction.trim();

  let reflection: string | null = null;
  let thought: string | null = null;
  let actionStr = '';

  const thinkMatch = text.match(/<think[^>]*>([\s\S]*?)<\/think[^>]*>/i);
  const computerEnvMatch = text.match(/<computer_env>([\s\S]*?)<\/computer_env>/i);
  logger.debug('[actionStringParserNew] 匹配结果:', {
    thinkMatch: !!thinkMatch,
    computerEnvMatch: !!computerEnvMatch,
  });

  if (thinkMatch && computerEnvMatch) {
    if (thinkMatch) {
      thought = thinkMatch[1].trim();
      logger.debug('[actionStringParserNew] 提取思考内容:', thought.substring(0, 100) + '...');
    }
    if (computerEnvMatch) {
      actionStr = computerEnvMatch[1].trim();
      actionStr = actionStr.replace(/^Action:\s*/i, '');
      logger.debug('[actionStringParserNew] 提取动作字符串:', actionStr);
    }
  }
  if (actionStr !== '') {
    const result = actionStr.split('\n\n');
    logger.debug('[actionStringParserNew] 返回动作数组:', result);
    return result;
  }

  // Parse thought/reflection based on different text patterns
  if (text.includes('Thought:')) {
    const thoughtMatch = text.match(/Thought: ([\s\S]+?)(?=\s*Action[:：]|$)/);
    logger.debug('[actionStringParserNew] Thought模式匹配:', !!thoughtMatch);

    if (thoughtMatch) {
      thought = thoughtMatch[1].trim();
      logger.debug('[actionStringParserNew] 提取Thought:', thought.substring(0, 100) + '...');
    }
  } else if (text.startsWith('Reflection:')) {
    const reflectionMatch = text.match(
      /Reflection: ([\s\S]+?)Action_Summary: ([\s\S]+?)(?=\s*Action[:：]|$)/,
    );
    logger.debug('[actionStringParserNew] Reflection模式匹配:', !!reflectionMatch);
    if (reflectionMatch) {
      thought = reflectionMatch[2].trim();
      reflection = reflectionMatch[1].trim();
      logger.debug('[actionStringParserNew] 提取Reflection和Action_Summary:', {
        reflection: reflection?.substring(0, 50),
        thought: thought?.substring(0, 50),
      });
    }
  } else if (text.startsWith('Action_Summary:')) {
    const summaryMatch = text.match(/Action_Summary: (.+?)(?=\s*Action[:：]|$)/);
    logger.debug('[actionStringParserNew] Action_Summary模式匹配:', !!summaryMatch);
    if (summaryMatch) {
      thought = summaryMatch[1].trim();
      logger.debug(
        '[actionStringParserNew] 提取Action_Summary:',
        thought.substring(0, 100) + '...',
      );
    }
  }

  if (['Action:', 'Action：'].some((keyword) => text.includes(keyword))) {
    const actionParts = text.split(/Action[:：]/);
    actionStr = actionParts[actionParts.length - 1];
    logger.debug('[actionStringParserNew] 提取Action部分:', actionStr);
  }

  if (actionStr !== '') {
    const result = actionStr.split('\n\n').map((str) => str.trim());
    logger.debug('[actionStringParserNew] 返回处理后的动作数组:', result);
    return result;
  }

  // Parse o1 format
  const thoughtMatch = text.match(/<Thought>\s*(.*?)\s*<\/Thought>/);
  const actionSummaryMatch = text.match(/\nAction_Summary:\s*(.*?)\s*Action:/);
  const actionMatch = text.match(/\nAction:\s*(.*?)\s*<\/Output>/);
  logger.debug('[actionStringParserNew] O1格式匹配结果:', {
    thoughtMatch: !!thoughtMatch,
    actionSummaryMatch: !!actionSummaryMatch,
    actionMatch: !!actionMatch,
  });

  const thoughtContent = thoughtMatch ? thoughtMatch[1] : null;
  const actionSummaryContent = actionSummaryMatch ? actionSummaryMatch[1] : null;
  const actionContent = actionMatch ? actionMatch[1] : null;

  thought = `${thoughtContent}\n<Action_Summary>\n${actionSummaryContent}`;
  actionStr = actionContent || '';
  logger.debug('[actionStringParserNew] O1格式解析结果:', {
    thought: thought?.substring(0, 100),
    actionStr,
  });

  if (actionStr !== '') {
    const result = actionStr.split('\n\n');
    logger.debug('[actionStringParserNew] 返回O1格式动作数组:', result);
    return result;
  }

  logger.debug('[actionStringParserNew] 未找到有效动作，返回空数组');
  return [];
}

export function parseActionInternal(
  text: string,
  factors: [number, number] = [1000, 1000],
  screenContext?: {
    width: number;
    height: number;
  },
  scaleFactor?: number,
  modelVer: UITarsModelVersion = UITarsModelVersion.V1_0,
): PredictionParsed[] {
  logger.debug('[parseActionInternal] 开始解析，参数:', {
    textLength: text.length,
    factors,
    screenContext,
    scaleFactor,
    modelVer,
  });

  let smartResizeFactors: [number, number] | null = null;
  if (modelVer === UITarsModelVersion.V1_5 && screenContext?.height && screenContext?.width) {
    smartResizeFactors = smartResizeForV15(screenContext.height, screenContext.width);
    logger.debug('[parseActionInternal] 计算smartResizeFactors:', smartResizeFactors);
  }

  text = text.trim();

  const parserChain = new FormatParserChain(logger);
  const { thought, actionStr } = parserChain.parse(text);
  logger.debug('[parseActionInternal] 责任链解析结果:', {
    thought,
    actionStr,
  });

  // 处理动作字符串
  const allActions = actionStr.split('\n\n').filter((action) => action.trim() !== '');
  logger.debug('[parseActionInternal] 分割后的动作数量:', allActions.length);
  logger.debug('[parseActionInternal] 所有动作:', allActions);

  const actions: PredictionParsed[] = [];

  for (let i = 0; i < allActions.length; i++) {
    const rawStr = allActions[i];
    logger.debug(`[parseActionInternal] 处理第${i + 1}个动作:`, rawStr);

    // prettier-ignore
    const actionInstance = parseAction(rawStr.replace(/\n/g, String.raw`\n`).trimStart());
    logger.debug(`[parseActionInternal] 第${i + 1}个动作解析结果:`, actionInstance);

    let actionType = '';
    let actionInputs: ActionInputs = {};

    if (actionInstance) {
      actionType = actionInstance.function;
      const params = actionInstance.args;
      actionInputs = {};
      logger.debug(`[parseActionInternal] 第${i + 1}个动作类型: ${actionType}, 参数:`, params);

      for (const [paramName, param] of Object.entries(params)) {
        if (!param) continue;
        const trimmedParam = (param as string).trim();
        logger.debug(`[parseActionInternal] 处理参数 ${paramName}:`, trimmedParam);

        if (paramName.includes('start_box') || paramName.includes('end_box')) {
          const oriBox = trimmedParam;
          logger.debug(`[parseActionInternal] 处理坐标参数 ${paramName}, 原始值:`, oriBox);

          // Remove parentheses and split
          const numbers = oriBox
            .replace(/[()[\]]/g, '')
            .split(',')
            .filter((ori) => ori !== '');
          logger.debug(`[parseActionInternal] 提取的数字:`, numbers);

          // Convert to float and scale
          const floatNumbers = numbers.map((num, idx) => {
            const factorIndex = idx % 2;
            let result;
            if (modelVer === UITarsModelVersion.V1_5 && smartResizeFactors) {
              result = Number.parseFloat(num) / smartResizeFactors[factorIndex];
              logger.debug(
                `[parseActionInternal] V1.5模式坐标转换: ${num} / ${smartResizeFactors[factorIndex]} = ${result}`,
              );
            } else {
              result = Number.parseFloat(num) / factors[factorIndex];
              logger.debug(
                `[parseActionInternal] 标准坐标转换: ${num} / ${factors[factorIndex]} = ${result}`,
              );
            }
            return result;
          });
          logger.debug(`[parseActionInternal] 转换后的浮点数:`, floatNumbers);

          if (floatNumbers.length === 2) {
            floatNumbers.push(floatNumbers[0], floatNumbers[1]);
            logger.debug(`[parseActionInternal] 补充坐标为4个值:`, floatNumbers);
          }

          actionInputs[
            paramName.trim() as keyof Omit<ActionInputs, 'start_coords' | 'end_coords'>
          ] = JSON.stringify(floatNumbers);
          logger.debug(`[parseActionInternal] 设置 ${paramName}:`, JSON.stringify(floatNumbers));

          if (screenContext?.width && screenContext?.height) {
            const boxKey = paramName.includes('start_box') ? 'start_coords' : 'end_coords';
            const [x1, y1, x2 = x1, y2 = y1] = floatNumbers;
            const [widthFactor, heightFactor] = factors;
            logger.debug(
              `[parseActionInternal] 计算屏幕坐标，boxKey: ${boxKey}, 坐标: [${x1}, ${y1}, ${x2}, ${y2}]`,
            );

            actionInputs[boxKey] = [x1, y1, x2, y2].every(isNumber)
              ? [
                  (Math.round(((x1 + x2) / 2) * screenContext?.width * widthFactor) / widthFactor) *
                    (scaleFactor ?? 1),
                  (Math.round(((y1 + y2) / 2) * screenContext?.height * heightFactor) /
                    heightFactor) *
                    (scaleFactor ?? 1),
                ]
              : [];
            logger.debug(`[parseActionInternal] 设置屏幕坐标 ${boxKey}:`, actionInputs[boxKey]);
          }
        } else {
          actionInputs[
            paramName.trim() as keyof Omit<ActionInputs, 'start_coords' | 'end_coords'>
          ] = trimmedParam;
          logger.debug(`[parseActionInternal] 设置普通参数 ${paramName}:`, trimmedParam);
        }
      }
    }

    const actionResult = {
      reflection: null,
      thought: thought || '',
      action_type: actionType,
      action_inputs: actionInputs,
    };
    logger.debug(`[parseActionInternal] 第${i + 1}个动作最终结果:`, actionResult);
    actions.push(actionResult);
  }

  logger.debug('[parseActionInternal] 解析完成，总共生成动作数量:', actions.length);
  logger.debug('[parseActionInternal] 最终结果:', JSON.stringify(actions, null, 2));
  return actions;
}

/**
 * Parses an action string into a structured object
 * @param {string} actionStr - The action string to parse (e.g. "click(start_box='(279,81)')")
 * @returns {Object|null} Parsed action object or null if parsing fails
 */
function parseAction(actionStr: string) {
  logger.debug('[parseAction] 开始解析动作字符串:', actionStr);

  try {
    // Support format: click(start_box='<|box_start|>(x1,y1)<|box_end|>')
    const originalStr = actionStr;
    actionStr = actionStr.replace(/<\|box_start\|>|<\|box_end\|>/g, '');
    if (originalStr !== actionStr) {
      logger.debug('[parseAction] 移除box_start/box_end标签:', actionStr);
    }

    // Support format: click(point='<point>510 150</point>') => click(start_box='<point>510 150</point>')
    // Support format: drag(start_point='<point>458 328</point>', end_point='<point>350 309</point>') => drag(start_box='<point>458 328</point>', end_box='<point>350 309</point>')
    const beforePointReplace = actionStr;
    actionStr = actionStr
      .replace(/(?<!start_|end_)point=/g, 'start_box=')
      .replace(/start_point=/g, 'start_box=')
      .replace(/end_point=/g, 'end_box=');
    if (beforePointReplace !== actionStr) {
      logger.debug('[parseAction] 替换point参数名:', actionStr);
    }

    // Match function name and arguments using regex
    const functionPattern = /^(\w+)\((.*)\)$/;
    const match = actionStr.trim().match(functionPattern);

    if (!match) {
      logger.debug('[parseAction] 不匹配函数调用格式');
      throw new Error('Not a function call');
    }

    const [_, functionName, argsStr] = match;
    logger.debug('[parseAction] 提取函数名:', functionName);
    logger.debug('[parseAction] 提取参数字符串:', argsStr);

    // Parse keyword arguments
    const kwargs = {};

    if (argsStr.trim()) {
      // Split on commas that aren't inside quotes or parentheses
      const argPairs = argsStr.match(/([^,']|'[^']*')+/g) || [];
      logger.debug('[parseAction] 分割参数对:', argPairs);

      for (let i = 0; i < argPairs.length; i++) {
        const pair = argPairs[i];
        logger.debug(`[parseAction] 处理第${i + 1}个参数对:`, pair);

        const [key, ...valueParts] = pair.split('=');
        if (!key) {
          logger.debug(`[parseAction] 第${i + 1}个参数对无效，跳过`);
          continue;
        }

        let value = valueParts
          .join('=')
          .trim()
          .replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes
        logger.debug(`[parseAction] 参数 ${key.trim()}:`, value);

        // Support format: click(start_box='<bbox>637 964 637 964</bbox>')
        if (value.includes('<bbox>')) {
          const beforeBbox = value;
          value = value.replace(/<bbox>|<\/bbox>/g, '').replace(/\s+/g, ',');
          value = `(${value})`;
          logger.debug(`[parseAction] 转换bbox格式: ${beforeBbox} -> ${value}`);
        }

        // Support format: click(point='<point>510 150</point>')
        if (value.includes('<point>')) {
          const beforePoint = value;
          value = value.replace(/<point>|<\/point>/g, '').replace(/\s+/g, ',');
          value = `(${value})`;
          logger.debug(`[parseAction] 转换point格式: ${beforePoint} -> ${value}`);
        }

        //@ts-ignore
        kwargs[key.trim()] = value;
      }
    }

    const result = {
      function: functionName,
      args: kwargs,
    };
    logger.debug('[parseAction] 解析成功:', result);
    return result;
  } catch (e) {
    console.error(`[parseAction] 解析失败 '${actionStr}': ${e}`);
    return null;
  }
}
