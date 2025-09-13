/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseAction, Coordinates, ParsedGUIResponse } from '@gui-agent/shared/types';
import { BaseActionParser } from '@gui-agent/shared/base';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import isNumber from 'lodash.isnumber';
import { FormatParserChain } from './FormatParserChain';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class DefaultActionParser extends BaseActionParser {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger = defaultLogger) {
    super();
    this.logger = logger.spawn('[DefaultActionParser]');
  }

  extractActionStrings(input: string): { reasoningContent?: string; rawActionStrings?: string[] } {
    const parserChain = new FormatParserChain(this.logger);
    const { reasoningContent, actionStr } = parserChain.parse(input);
    this.logger.debug('[extractActionStrings] result of chains:', {
      reasoningContent,
      actionStr,
    });

    return {
      reasoningContent: reasoningContent || undefined,
      rawActionStrings: actionStr.split('\n\n').filter((action) => action.trim() !== ''),
    };
  }

  parseActionFromString(actionString: string): BaseAction | null {
    // Process action string
    this.logger.debug('[parseActionFromString] raw:', actionString);

    // prettier-ignore
    const actionInstance = this.parseAction(actionString.replace(/\n/g, String.raw`\n`).trimStart());
    this.logger.debug(`[parseActionFromString] action instance:`, actionInstance);

    if (!actionInstance) {
      return null;
    }

    let actionType = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionInputs: Record<string, any> = {};

    actionType = actionInstance.action_type;
    const params: Record<string, string> = actionInstance.action_params;

    for (const [paramName, paramStr] of Object.entries(params)) {
      // TODO: handle paramStr is empty when start_box/end_box/...
      if (!paramStr) {
        this.logger.debug(`[parseActionFromString] paramStr of ${paramName} is empty, skipping`);
        if (
          paramName.includes('start_box') ||
          paramName.includes('end_box') ||
          paramName.includes('point') ||
          paramName.includes('key')
        ) {
          throw new SyntaxError(
            `The required parameters of ${paramName} of ${actionType} action is empty`,
          );
        }
        continue;
      }

      const trimmedParam = (paramStr as string).trim();
      this.logger.debug(`[parseActionFromString] Processing parameter ${paramName}:`, trimmedParam);

      if (
        paramName.includes('start_box') ||
        paramName.includes('end_box') ||
        paramName.includes('point')
      ) {
        const coords = this.parseCoordinates(trimmedParam);
        if (!coords) {
          continue;
        }

        let boxKey = paramName.trim().toLowerCase();
        if (boxKey === 'start_box' || boxKey.startsWith('start_')) {
          boxKey = 'start';
        } else if (boxKey === 'end_box' || boxKey.startsWith('end_')) {
          boxKey = 'end';
        } else if (boxKey.includes('start')) {
          boxKey = 'start';
        } else if (boxKey.includes('end')) {
          boxKey = 'end';
        }
        this.logger.debug(`[parseActionFromString] determined ${paramName} -> ${boxKey}`);

        actionInputs[boxKey] = coords;
        continue;
      }

      // actionInputs[paramName.trim() as keyof Omit<ActionInputs, 'start_coords' | 'end_coords'>] =
      actionInputs[paramName.trim()] = trimmedParam;
    }

    // Rename start to point if end is not provided
    if (actionInputs.start && !actionInputs.end && !actionInputs.point) {
      actionInputs.point = actionInputs.start;
      delete actionInputs.start;
    }

    return {
      type: actionType,
      inputs: actionInputs,
    };
  }

  parsePrediction(input: string): ParsedGUIResponse | null {
    this.logger.debug(
      '[parsePrediction] starting:',
      input.length <= 30 ? input : input.substring(0, 30) + '...',
    );
    const originInput = input;

    input = input.trim();

    let reasoningContent = null;
    let rawActionStrings = null;
    try {
      ({ reasoningContent, rawActionStrings } = this.extractActionStrings(input));
    } catch (error) {
      return {
        errorMessage: (error as Error).message,
        rawContent: originInput,
        rawActionStrings: [],
        actions: [],
      };
    }

    if (!rawActionStrings || rawActionStrings.length <= 0) {
      return {
        errorMessage: 'There is no GUI action detected',
        rawContent: originInput,
        reasoningContent,
        rawActionStrings: [],
        actions: [],
      };
    }

    const actions: BaseAction[] = [];
    try {
      for (const actionString of rawActionStrings) {
        const action = this.parseActionFromString(actionString);
        if (action) actions.push(action);
      }
    } catch (error) {
      return {
        errorMessage: (error as Error).message,
        rawContent: originInput,
        reasoningContent,
        rawActionStrings,
        actions: [],
      };
    }

    this.logger.debug(
      '[parsePrediction] final result: reasoningContent:',
      reasoningContent,
      ', actions lenth:',
      actions.length,
    );

    return {
      rawContent: originInput,
      reasoningContent,
      rawActionStrings,
      actions,
    };
  }

  /**
   * Parses an action string into a structured object
   * @param {string} actionStr - The action string to parse (e.g. "click(start_box='(279,81)')")
   * @returns {Object} Parsed action object
   * @throws {Error} If action string is invalid
   */
  private parseAction(actionStr: string): {
    action_type: string;
    action_params: Record<string, string>;
  } {
    // this.logger.debug('[parseAction] raw:', actionStr);

    try {
      // Support format: click(start_box='<|box_start|>(x1,y1)<|box_end|>')
      const originalStr = actionStr;
      actionStr = actionStr.replace(/<\|box_start\|>|<\|box_end\|>/g, '');
      if (originalStr !== actionStr) {
        this.logger.debug('[parseAction] remove box_start/box_end tag:', actionStr);
      }

      // Support format: click(point='<point>510 150</point>') => click(start_box='<point>510 150</point>')
      // Support format: drag(start_point='<point>458 328</point>', end_point='<point>350 309</point>') => drag(start_box='<point>458 328</point>', end_box='<point>350 309</point>')
      const beforePointReplace = actionStr;
      actionStr = actionStr
        .replace(/(?<!start_|end_)point=/g, 'start_box=')
        .replace(/start_point=/g, 'start_box=')
        .replace(/end_point=/g, 'end_box=');
      if (beforePointReplace !== actionStr) {
        this.logger.debug('[parseAction] replace point param name:', actionStr);
      }

      // Match function name and arguments using regex
      const functionPattern = /^(\w+)\((.*)\)$/;
      const match = actionStr.trim().match(functionPattern);

      if (!match) {
        this.logger.debug('[parseAction] not match function call format');
        throw new Error('Not a function call');
      }

      const [_, functionName, argsStr] = match;
      this.logger.debug('[parseAction] extract function name:', functionName);
      this.logger.debug('[parseAction] extract param string:', argsStr);

      // Parse keyword arguments
      const kwargs: Record<string, string> = {};

      if (argsStr.trim()) {
        // Split on commas that aren't inside quotes or parentheses

        // const argPairs = argsStr.match(/([^,']|'[^']*')+/g) || [];
        // Support format: click(start_box="(100,200)")
        const keyValueRawStrList = argsStr.match(/([^,'"]|'[^']*'|"[^"]*")+/g) || [];
        this.logger.debug('[parseAction] split param pairs:', keyValueRawStrList);

        for (let i = 0; i < keyValueRawStrList.length; i++) {
          const keyValueRawStr = keyValueRawStrList[i];
          this.logger.debug(`[parseAction] handle param pair ${i + 1}:`, keyValueRawStr);

          const [key, ...valueParts] = keyValueRawStr.split('=');
          if (!key) {
            this.logger.debug(`[parseAction] param pair ${i + 1} invalid, skip`);
            continue;
          }

          let value = valueParts
            .join('=')
            .trim()
            .replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes
          this.logger.debug(`[parseAction] handle param ${key.trim()}:`, value);

          // Support format: click(start_box='<bbox>637 964 637 964</bbox>')
          if (value.includes('<bbox>')) {
            const beforeBbox = value;
            value = value.replace(/<bbox>|<\/bbox>/g, '').replace(/\s+/g, ',');
            value = `(${value})`;
            this.logger.debug(`[parseAction] Converting bbox format: ${beforeBbox} -> ${value}`);
          }

          // Support format: click(point='<point>510 150</point>')
          if (value.includes('<point>')) {
            const beforePoint = value;
            value = value.replace(/<point>|<\/point>/g, '').replace(/\s+/g, ',');
            value = `(${value})`;
            this.logger.debug(`[parseAction] Converting point format: ${beforePoint} -> ${value}`);
          }

          kwargs[key.trim()] = value;
        }
      }

      const result = {
        action_type: functionName,
        action_params: kwargs,
      };
      this.logger.debug('[parseAction] parse success:', result);
      return result;
    } catch (e) {
      console.error(`[parseAction] parse failed '${actionStr}': ${e}`);
      throw new Error(
        `Failed to parse GUI action: "${actionStr}", detail: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Parses coordinate string into structured coordinates
   * @param {string} params - The coordinate string to parse (e.g. "(100,200)")
   * @returns {Coordinates} Parsed coordinates object
   * @throws {Error} If coordinate string is invalid
   */
  private parseCoordinates(params: string): Coordinates {
    const oriBox = params.trim();
    this.logger.debug(`[parseCoordinates] processing trimmed params:`, oriBox);

    if (!oriBox || oriBox.length === 0) {
      this.logger.warn('[parseCoordinates] empty coordinate string');
      throw new Error('Coordinate string is empty');
    }

    const hasValidBrackets = /[[\]()]+/.test(oriBox);
    if (!hasValidBrackets) {
      this.logger.warn('[parseCoordinates] invalid bracket format');
      throw new Error('Invalid coordinate format');
    }

    // Remove parentheses and split
    const numbers = oriBox
      .replace(/[()[\]]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');
    this.logger.debug(`[parseCoordinates] extracted numbers:`, numbers);

    if (numbers.length < 2) {
      this.logger.warn('[parseCoordinates] no valid numbers found');
      throw new Error('Insufficient coordinate, at least 2 numbers required');
    }

    // Convert to float with validation
    const floatNumbers = numbers.map((num, index) => {
      const result = Number.parseFloat(num);
      if (isNaN(result)) {
        this.logger.warn(`[parseCoordinates] invalid number at position ${index}: ${num}`);
        return 0;
      }
      this.logger.debug(`[parseCoordinates] number conversion: ${num} = ${result}`);
      return result;
    });

    if (floatNumbers.length < 2) {
      this.logger.warn('[parseCoordinates] insufficient coordinate values');
      throw new Error('Insufficient coordinate, at least 2 numbers are required');
    }

    const [x1, y1, x2 = x1, y2 = y1] = floatNumbers;

    const validCoordinates = [x1, y1, x2, y2].every((coord) => isNumber(coord) && isFinite(coord));
    if (!validCoordinates) {
      this.logger.warn('[parseCoordinates] invalid coordinate values detected');
      throw new Error('Invalid coordinate values detected');
    }

    // Calculate the center point
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const validCenter = isFinite(centerX) && isFinite(centerY);
    if (!validCenter) {
      this.logger.warn('[parseCoordinates] invalid center point');
      throw new Error('Failed to calculate valid center point from the provided coordinates');
    }

    // Construct the coordinates object
    const coords: Coordinates = {
      raw: {
        x: centerX,
        y: centerY,
      },
      referenceBox: {
        x1: Math.min(x1, x2),
        y1: Math.min(y1, y2),
        x2: Math.max(x1, x2),
        y2: Math.max(y1, y2),
      },
    };

    this.logger.debug('[parseCoordinates] final coordinates:', coords);
    return coords;
  }
}
