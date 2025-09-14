/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { BaseAction, Coordinates, isSupportedActionType } from '@gui-agent/shared/types';
import { XMLBuilder } from 'fast-xml-parser';
import isNumber from 'lodash.isnumber';

const defaultLogger = new ConsoleLogger('XMLFormatAdapter', LogLevel.DEBUG);

export class ActionParserHelper {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger = defaultLogger) {
    this.logger = logger.spawn('[ActionParserHelper]');
  }

  public parseActionFromString(actionString: string): BaseAction | null {
    // Process action string
    this.logger.debug('[parseActionFromString] raw:', actionString);

    // prettier-ignore
    const actionInstance = this.parseRoughActionFromString(actionString.replace(/\n/g, String.raw`\n`).trimStart());
    this.logger.debug(`[parseActionFromString] action instance:`, actionInstance);

    if (!actionInstance) {
      return null;
    }

    const actionType = actionInstance.action_type;
    const params: Record<string, string> = actionInstance.action_params;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionInputs = this.standardizeActionInputs(actionType, params);

    return {
      type: actionType,
      inputs: actionInputs,
    };
  }

  /**
   * Roughly parses an action string into a structured object (initial parsing)
   * @param {string} actionStr - The action string to parse (e.g. "click(start_box='(279,81)')")
   * @returns {Object} Parsed action object
   * @throws {Error} If action string is invalid
   */
  public parseRoughActionFromString(actionStr: string): {
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
   * Example:
   * {
   *   "function=scroll": {
   *     "parameter=direction": "up",
   *     "parameter=point": {
   *       "point": "500 500",
   *     },
   *   },
   *   "function=type": {
   *     "parameter=content": "hello",
   *     "parameter=point": {
   *       "point": "200 126",
   *     },
   *   },
   *   "function=wait": "",
   * }
   */
  public standardizeGUIActions(object: unknown): BaseAction[] {
    const result: BaseAction[] = [];
    if (!object || typeof object !== 'object') return result;

    for (const [key, value] of Object.entries(object as Record<string, unknown>)) {
      // Check if key is in format like "function=scroll", "function=type", etc.
      // Extract the function name and process accordingly
      const functionMatch = key.match(/^function=(.+)$/);
      if (!functionMatch) continue;

      const functionName = functionMatch[1]; // Extract function name (e.g., "scroll", "type")
      if (!isSupportedActionType(functionName)) {
        this.logger.warn(`Unsupported action type: ${functionName}`);
        continue;
      }

      const argumentsRecord = this.standardizeActionInputsRecord(functionName, value);
      const actionInputs = this.standardizeActionInputs(functionName, argumentsRecord);

      result.push({
        type: functionName,
        inputs: actionInputs,
      });
    }
    return result;
  }

  public standardizeActionInputsRecord(
    actionType: string,
    object: unknown,
  ): Record<string, string> {
    if (!object || typeof object !== 'object') return {};

    const argumentsObj: Record<string, string> = {};
    const builder = new XMLBuilder();
    for (const [key, value] of Object.entries(object as Record<string, string>)) {
      // Check if key is in format like "parameter=content", "parameter=point", etc.
      // Extract the parameter name and process accordingly
      const parameterMatch = key.match(/^parameter=(.+)$/);
      if (!parameterMatch) continue;

      const paramName = parameterMatch[1];
      if (typeof value === 'string') {
        argumentsObj[paramName] = value;
      } else if (value && typeof value === 'object') {
        let xmlStr = builder.build(value);
        if (!xmlStr || typeof xmlStr !== 'string') {
          throw new SyntaxError(
            `The required parameters of ${paramName} of ${actionType} action is empty`,
          );
        }
        this.logger.debug(`[standardizeActionInputsRecord] built xml string: ${xmlStr}`);
        // Support format: click(point='<point>510 150</point>')
        if (xmlStr.includes('<point>')) {
          xmlStr = xmlStr.replace(/<point>|<\/point>/g, '').replace(/\s+/g, ',');
          xmlStr = `(${xmlStr})`;
          this.logger.debug(`[standardizeActionInputsRecord] formatted point: ${xmlStr}`);
        }
        argumentsObj[paramName] = xmlStr;
      }
    }
    return argumentsObj;
  }

  public standardizeActionInputs(
    actionType: string,
    params: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionInputs: Record<string, any> = {};
    for (const [paramName, paramStr] of Object.entries(params)) {
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
        const coords = this.standardlizeCoordinates(trimmedParam);
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

    return actionInputs;
  }

  /**
   * Parses coordinate string into structured coordinates
   * @param {string} params - The coordinate string to parse, supported format:
   *  - "(100, 200)"
   *  - "[100, 200]"
   * @returns {Coordinates} Parsed coordinates object
   * @throws {Error} If coordinate string is invalid
   */
  public standardlizeCoordinates(params: string): Coordinates {
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

  /**
   * Convert args object to legacy string, like:
   * click(start_box="(100,200)")
   */
  public convertRoughActionInputsToLegacyActionString(
    actionType: string,
    argsObj: Record<string, string>,
  ): string {
    let action_string = '';
    let pointStr = '';
    try {
      switch (actionType) {
        case 'navigate':
          if (argsObj.content) {
            action_string = `navigate(content='${argsObj.content}')`;
          }
          break;
        case 'navigate_back':
          action_string = `navigate_back()`;
          break;
        case 'wait':
          // TODO: Add wait's parameters
          action_string = `wait()`;
          break;
        case 'mouse_down':
        case 'mouse_up':
          // TODO: Support mouse_down and mouse_up
          const button = argsObj.button ?? 'left';
          action_string = `${actionType}(point='${argsObj.point}', button=${button})`;
          break;
        case 'click':
        case 'left_double':
        case 'right_single':
        case 'move_to':
          if (typeof argsObj.point === 'string') {
            pointStr = argsObj.point;
          } else if (argsObj.point && typeof argsObj.point === 'object' && 'raw' in argsObj.point) {
            // Format coordinates as (x1, y1, x2, y2) if referenceBox exists
            const pointWithRaw = argsObj.point as { raw: { x: number; y: number } };
            pointStr = `(${pointWithRaw.raw.x}, ${pointWithRaw.raw.y})`;
          }
          // click(point='<point>168 868</point>')
          action_string = `${actionType}(point='${pointStr}')`;
          break;
        case 'scroll':
          let directionStr = 'down';
          if (argsObj.direction) {
            directionStr = argsObj.direction;
          }
          pointStr = '';
          if (typeof argsObj.point === 'string') {
            pointStr = argsObj.point;
          } else if (argsObj.point && typeof argsObj.point === 'object' && 'raw' in argsObj.point) {
            // Format coordinates as (x1, y1, x2, y2) if referenceBox exists
            const pointWithRaw = argsObj.point as { raw: { x: number; y: number } };
            pointStr = `(${pointWithRaw.raw.x}, ${pointWithRaw.raw.y})`;
          }
          // Demo: Action: scroll(point='<point>500 500</point>', direction='down')
          action_string = `${actionType}(point='${pointStr}', direction='${directionStr}')`;
          break;
        case 'drag':
          let startPointStr = '';
          let endPointStr = '';
          if (typeof argsObj.start_point === 'string') {
            startPointStr = argsObj.start_point;
          } else if (
            argsObj.start_point &&
            typeof argsObj.start_point === 'object' &&
            'raw' in argsObj.start_point
          ) {
            // Format coordinates as (x1, y1, x2, y2) if referenceBox exists
            const pointWithRaw = argsObj.start_point as { raw: { x: number; y: number } };
            startPointStr = `(${pointWithRaw.raw.x}, ${pointWithRaw.raw.y})`;
          }
          if (typeof argsObj.end_point === 'string') {
            endPointStr = argsObj.end_point;
          } else if (
            argsObj.end_point &&
            typeof argsObj.end_point === 'object' &&
            'raw' in argsObj.end_point
          ) {
            // Format coordinates as (x1, y1, x2, y2) if referenceBox exists
            const pointWithRaw = argsObj.end_point as { raw: { x: number; y: number } };
            endPointStr = `(${pointWithRaw.raw.x}, ${pointWithRaw.raw.y})`;
          }
          if (typeof argsObj.start === 'string') {
            startPointStr = argsObj.start;
          } else if (argsObj.start && typeof argsObj.start === 'object' && 'raw' in argsObj.start) {
            // Format coordinates as (x1, y1, x2, y2) if referenceBox exists
            const pointWithRaw = argsObj.start as { raw: { x: number; y: number } };
            startPointStr = `(${pointWithRaw.raw.x}, ${pointWithRaw.raw.y})`;
          }
          if (typeof argsObj.end === 'string') {
            endPointStr = argsObj.end;
          } else if (argsObj.end && typeof argsObj.end === 'object' && 'raw' in argsObj.end) {
            // Format coordinates as (x1, y1, x2, y2) if referenceBox exists
            const pointWithRaw = argsObj.end as { raw: { x: number; y: number } };
            endPointStr = `(${pointWithRaw.raw.x}, ${pointWithRaw.raw.y})`;
          }

          if (startPointStr && endPointStr) {
            // Demo: drag(start_point='<point>190 868</point>', end_point='<point>280 868</point>')
            action_string = `drag(start_point='${startPointStr}', end_point='${endPointStr}')`;
          }
          break;
        case 'type':
        case 'call_user':
        case 'finished':
          if (argsObj.content) {
            action_string = `${actionType}(content='${argsObj.content}')`;
          }
          break;
        case 'hotkey':
          if (argsObj.key) {
            action_string = `hotkey(key='${argsObj.key}')`;
          }
          break;
        default:
          this.logger.warn(`Unknown action type: ${actionType}`);
      }
    } catch (error) {
      this.logger.error(`[convertArgsStrToActionInput]: Failed to parse: ${error}`);
      action_string = `${actionType}()`;
    }

    return action_string;
  }
}
