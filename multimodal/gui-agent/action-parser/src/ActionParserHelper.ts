/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { BaseAction, Coordinates, isSupportedActionType } from '@gui-agent/shared/types';
import { unifyActionInputName, unifyActionType } from '@gui-agent/shared/utils';
import { XMLBuilder } from 'fast-xml-parser';
import isNumber from 'lodash.isnumber';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

/**
 * Interface for parsed action data in its raw, unstandardized form.
 *
 * This represents the intermediate state between parsing raw action strings and
 * creating standardized BaseAction objects that operators can execute.
 *
 * Terminology:
 * - 'rough': Raw action data parsed from action strings, may have inconsistent naming
 * - 'standard': Normalized action data with consistent parameter names and types
 *
 * The standardizeAction() method transforms RoughAction into BaseAction by:
 * 1. Normalizing action types and parameter names
 * 2. Converting string coordinates to Coordinates objects
 * 3. Validating required parameters
 * 4. Applying naming conventions (e.g., 'start_box' -> 'start', 'start' -> 'point' when no 'end')
 *
 * @example
 * ```typescript
 * const roughAction: RoughAction = {
 *   roughType: "left_click_single",
 *   roughInputs: { "start_box": "(100, 200)" }
 * };
 * // After standardization becomes:
 * // { type: "click", inputs: { point: { raw: { x: 100, y: 200 }, referenceBox {x1: 100, y1: 200, x2: 100, y2: 200}}} } }
 * ```
 */
export interface RoughAction {
  roughType: string; // Raw action type (e.g., "click", "key", "swipe") - may need normalization
  roughInputs: Record<string, string>; // Raw parameters as strings - require parsing and validation
}

export class ActionParserHelper {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger = defaultLogger) {
    this.logger = logger.spawn('[ActionParserHelper]');
  }

  /**
   * Parse action call string into BaseAction object
   * @param actionString Action call string in function format
   * @example
   * - "click(point='(1, 1)')"
   * - "type(content='Hello, world!', point='(1, 1)')"
   * - "drag(start='(1, 1)', end='(2, 2)')"
   * - "navigate(url='www.google.com')"
   * - "mouse_down(point='(1, 1)', button='left')"
   * @returns BaseAction object or null if parsing fails
   */
  public parseActionCallString(actionString: string): BaseAction | null {
    // Process action string
    this.logger.debug('[parseActionCallString] raw:', actionString);

    // prettier-ignore
    const roughAction = this.parseRoughFromCallString(actionString.replace(/\n/g, String.raw`\n`).trimStart());
    this.logger.debug(`[parseActionCallString] rough action:`, JSON.stringify(roughAction));

    if (!roughAction) return null;

    const action = this.standardizeAction(roughAction.roughType, roughAction.roughInputs);
    this.logger.debug(`[parseActionCallString] standard action:`, JSON.stringify(action));

    return action;
  }

  /**
   * Roughly parses an action string into a structured object (initial parsing)
   * @param {string} actionStr - The action string to parse (e.g. "click(start_box='(279,81)')")
   * @returns {Object} Parsed action object
   * @throws {Error} If action string is invalid
   */
  public parseRoughFromCallString(actionStr: string): {
    roughType: string;
    roughInputs: Record<string, string>;
  } {
    // this.logger.debug('[parseAction] raw:', actionStr);

    try {
      // Support format: click(start_box='<|box_start|>(x1,y1)<|box_end|>')
      const originalStr = actionStr;
      actionStr = actionStr.replace(/<\|box_start\|>|<\|box_end\|>/g, '');
      if (originalStr !== actionStr) {
        this.logger.debug('[parseRoughFromCallString] remove box_start/box_end tag:', actionStr);
      }

      // Support format: click(point='<point>510 150</point>') => click(start_box='<point>510 150</point>')
      // Support format: drag(start_point='<point>458 328</point>', end_point='<point>350 309</point>') => drag(start_box='<point>458 328</point>', end_box='<point>350 309</point>')
      const beforePointReplace = actionStr;
      actionStr = actionStr
        .replace(/(?<!start_|end_)point=/g, 'start_box=')
        .replace(/start_point=/g, 'start_box=')
        .replace(/end_point=/g, 'end_box=');
      if (beforePointReplace !== actionStr) {
        this.logger.debug('[parseRoughFromCallString] replace point param name:', actionStr);
      }

      // Match function name and arguments using regex
      const functionPattern = /^(\w+)\((.*)\)$/;
      const match = actionStr.trim().match(functionPattern);

      if (!match) {
        this.logger.debug('[parseRoughFromCallString] not match function call format');
        throw new Error('Not a function call');
      }

      const [_, functionName, argsStr] = match;
      this.logger.debug('[parseRoughFromCallString] extract function name:', functionName);
      this.logger.debug('[parseRoughFromCallString] extract param string:', argsStr);

      // Parse keyword arguments
      const kwargs: Record<string, string> = {};

      if (argsStr.trim()) {
        // Split on commas that aren't inside quotes or parentheses

        // const argPairs = argsStr.match(/([^,']|'[^']*')+/g) || [];
        // Support format: click(start_box="(100,200)")
        const keyValueRawStrList = argsStr.match(/([^,'"]|'[^']*'|"[^"]*")+/g) || [];
        this.logger.debug('[parseRoughFromCallString] split param pairs:', keyValueRawStrList);

        for (let i = 0; i < keyValueRawStrList.length; i++) {
          const keyValueRawStr = keyValueRawStrList[i];
          this.logger.debug(
            `[parseRoughFromCallString] handle param pair ${i + 1}:`,
            keyValueRawStr,
          );

          const [key, ...valueParts] = keyValueRawStr.split('=');
          if (!key) {
            this.logger.debug(`[parseRoughFromCallString] param pair ${i + 1} invalid, skip`);
            continue;
          }

          let value = valueParts
            .join('=')
            .trim()
            .replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes
          this.logger.debug(`[parseRoughFromCallString] handle param ${key.trim()}:`, value);

          // Support format: click(start_box='<bbox>637 964 637 964</bbox>')
          if (value.includes('<bbox>')) {
            const beforeBbox = value;
            value = value.replace(/<bbox>|<\/bbox>/g, '').replace(/\s+/g, ',');
            value = `(${value})`;
            this.logger.debug(
              `[parseRoughFromCallString] Converting bbox format: ${beforeBbox} -> ${value}`,
            );
          }

          // Support format: click(point='<point>510 150</point>')
          if (value.includes('<point>')) {
            const beforePoint = value;
            value = value.replace(/<point>|<\/point>/g, '').replace(/\s+/g, ',');
            value = `(${value})`;
            this.logger.debug(
              `[parseRoughFromCallString] Converting point format: ${beforePoint} -> ${value}`,
            );
          }

          kwargs[key.trim()] = value;
        }
      }

      return {
        roughType: functionName,
        roughInputs: kwargs,
      };
    } catch (e) {
      console.error(`[parseRoughFromCallString] parse failed '${actionStr}': ${e}`);
      throw new Error(
        `Failed to parse GUI action: "${actionStr}", detail: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Parse a JSON string representation of an OpenAI function call into a standardized BaseAction.
   *
   * This method accepts a JSON string that represents a function call object conforming to
   * OpenAI's ChatCompletionMessageToolCall.Function format, parses it, and converts it
   * into a standardized GUI action.
   *
   * @param functionCallString - JSON string representation of a function call object
   * @returns The parsed and standardized BaseAction object, or null if parsing fails
   * @throws Error if the JSON string is malformed or function call cannot be processed
   *
   * @example
   * ```typescript
   * // Input JSON string examples:
   * const scrollAction = '{"name": "scroll", "arguments": "{\\"direction\\": \\"up\\", \\"point\\": \\"<point>500 500</point>\\"}"}';
   * const clickAction = '{"name": "left_double", "arguments": "{\\"point\\": \\"<point>18 58</point>\\"}"}';
   * const typeAction = '{"name": "type", "arguments": "{\\"content\\": \\"hello\\", \\"point\\": \\"<point>200 126</point>\\"}"}';
   * const hotkeyAction = '{"name": "hotkey", "arguments": "{\\"key\\": \\"enter\\"}"}';
   * const waitAction = '{"name": "wait", "arguments": ""}';
   *
   * const action = parser.parseFunctionCall(scrollAction);
   * // Returns standardized BaseAction object
   * ```
   */
  public parseFunctionCallString(functionCallString: string): BaseAction | null {
    try {
      const functionCall = JSON.parse(functionCallString);
      const roughAction = this.parseRoughFromFunctionCall(functionCall);
      this.logger.debug(`[parseFunctionCallString] rough action:`, JSON.stringify(roughAction));

      if (!roughAction) return null;

      const action = this.standardizeAction(roughAction.roughType, roughAction.roughInputs);
      this.logger.debug(`[parseFunctionCallString] standard action:`, JSON.stringify(action));
      return action;
    } catch (e) {
      this.logger.warn(`[parseFunctionCallString] parse failed '${functionCallString}': ${e}`);
      throw new Error(`Failed to parse GUI action: ${(e as Error).message}`);
    }
  }

  /**
   * Extract rough action information from an OpenAI function call object.
   *
   * This method processes a function call object that conforms to OpenAI's
   * ChatCompletionMessageToolCall.Function format, extracting the action type
   * and parameters for further standardization.
   *
   * The function call object format is defined by OpenAI's API specification:
   * - `name`: The name of the function to call (becomes roughType)
   * - `arguments`: JSON string containing the function arguments (becomes roughInputs)
   *
   * @param functionCall - Function call object from OpenAI ChatCompletionMessageToolCall.Function
   * @returns Object containing roughType (action name) and roughInputs (parsed arguments)
   * @throws Error if arguments JSON string cannot be parsed
   *
   * @example
   * ```typescript
   * // Input function call object examples:
   * const scrollCall = {
   *   name: 'scroll',
   *   arguments: '{"direction": "up", "point": "<point>500 500</point>"}'
   * };
   *
   * const clickCall = {
   *   name: 'left_double',
   *   arguments: '{"point": "<point>18 58</point>"}'
   * };
   *
   * const typeCall = {
   *   name: 'type',
   *   arguments: '{"content": "hello", "point": "<point>200 126</point>"}'
   * };
   *
   * const hotkeyCall = {
   *   name: 'hotkey',
   *   arguments: '{"key": "enter"}'
   * };
   *
   * const waitCall = {
   *   name: 'wait',
   *   arguments: ''  // Empty arguments for wait action
   * };
   *
   * const result = parser.parseRoughFromFunctionCall(scrollCall);
   * // Returns: { roughType: 'scroll', roughInputs: { direction: 'up', point: '<point>500 500</point>' } }
   * ```
   */
  public parseRoughFromFunctionCall(functionCall: any): {
    roughType: string;
    roughInputs: Record<string, string>;
  } {
    const roughType = functionCall.name;
    let roughInputs: Record<string, string> = {};
    try {
      roughInputs = functionCall.arguments ? JSON.parse(functionCall.arguments) : {};
    } catch (error) {
      this.logger.warn(
        `[parseRoughFromFunctionCall] parse arguments failed '${functionCall.arguments}': ${error}`,
      );
      throw error;
    }
    return {
      roughType,
      roughInputs,
    };
  }

  /**
   * Standardizes action inputs based on action type by normalizing parameter names
   * and converting coordinate strings to structured Coordinates objects.
   *
   * Key transformations:
   * 1. Normalizes parameter names:
   *    - 'start_box' or any parameter containing 'start' -> 'start'
   *    - 'end_box' or any parameter containing 'end' -> 'end'
   * 2. If 'start' exists without 'end', renames 'start' to 'point'
   * 3. Converts string coordinate formats to structured Coordinates objects
   *
   * @param actionType - The type of the action
   * @param params - The raw parameters of the action
   * @returns The standardized parameters object for GUIAction(see: @gui-agent/shared/types)
   */
  public standardizeAction(roughType: string, roughInputs: Record<string, string>): BaseAction {
    const stdType = unifyActionType(roughType);
    const stdInputs: Record<string, any> = {};

    for (const [roughInputName, roughInputStrValue] of Object.entries(roughInputs)) {
      const stdInputName = unifyActionInputName(stdType, roughInputName);
      if (!roughInputStrValue) {
        this.logger.debug(`[standardizeAction] paramStr of ${roughInputName} is empty.`);
        if (
          stdInputName.includes('start') ||
          stdInputName.includes('end') ||
          stdInputName.includes('point') ||
          stdInputName.includes('key') ||
          stdInputName.includes('url') ||
          stdInputName.includes('name')
        ) {
          throw new SyntaxError(
            `The required parameters of ${roughInputName} of ${roughType} action is empty`,
          );
        }
      }

      let stdParamValue: any = roughInputStrValue.trim();
      if (
        stdInputName.includes('start') ||
        stdInputName.includes('end') ||
        stdInputName.includes('point')
      ) {
        const coords = this.parseCoordinates(stdParamValue);
        if (!coords) {
          throw new Error(
            `The required coordinates of ${roughInputName} of ${roughType} action is empty`,
          );
        }
        stdParamValue = coords;
      }
      stdInputs[stdInputName] = stdParamValue;
    }

    // Rename start to point if end is not provided
    if (stdInputs.start && !stdInputs.end && !stdInputs.point) {
      stdInputs.point = stdInputs.start;
      delete stdInputs.start;
    }

    return {
      type: stdType,
      inputs: stdInputs,
    };
  }

  /**
   * Parses coordinate string into structured coordinates
   * @param {string} params - The coordinate string to parse, supported format:
   *  - 100, 200
   *  - 100 200
   *  - "(100, 200)"
   *  - "(100 200)"
   *  - "[100, 200]"
   *  - "[100 200]"
   *  - "<point>100, 200</point>"
   *  - "<point>100 200</point>"
   * and the coordinate must contain either 2 numbers (x,y) or 4 numbers (x1,y1,x2,y2)
   * @returns {Coordinates} Parsed coordinates object
   * @throws {Error} If coordinate string is invalid
   */
  public parseCoordinates(params: string): Coordinates {
    const oriBox = params.trim();
    this.logger.debug(`[parseCoordinates] processing trimmed params:`, oriBox);

    if (!oriBox || oriBox.length === 0) {
      this.logger.warn('[parseCoordinates] empty coordinate string');
      throw new Error('Coordinate string is empty');
    }

    const hasValidBrackets = /[[\]()<point></point>]+/.test(oriBox);
    if (!hasValidBrackets) {
      this.logger.warn('[parseCoordinates] invalid bracket format');
      // to support '100, 200' or '100 200', NOT throw error
      // throw new Error('Invalid coordinate format');
    }

    // Remove brackets and split
    const numbers = oriBox
      .replace(/[()[\]<point></point>]/g, '')
      .split(/[,\s]+/) // Split by comma or whitespace
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
        throw new Error(`Invalid number at position ${index}: ${num}`);
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

    this.logger.debug('[parseCoordinates] final coordinates:', JSON.stringify(coords));
    return coords;
  }

  /**
   * @param objectFromXML
   * The object parsed from XML, where keys are in the format "function=scroll", "function=type", etc.
   * and values are objects with keys like "parameter=direction", "parameter=content", etc.
   *
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
   * @return The standardized GUIActions array
   */
  public standardizeGUIActionsFromXMLObject(object: unknown): BaseAction[] {
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

      const argumentsRecord = this.standardizeActionInputsFromXMLObject(functionName, value);
      const action = this.standardizeAction(functionName, argumentsRecord);
      result.push(action);
    }
    return result;
  }

  /**
   * Standardizes action input parameters for a specific action type.
   *
   * This method processes raw input parameters by:
   * 1. Filtering keys with 'parameter=' prefix
   * 2. Extracting parameter names from keys
   * 3. Organizing them into a standardized format for GUIAction
   *
   * Examples of input formats:
   * Example 1:
   * {
   *   "parameter=direction": "up",
   *   "parameter=point": {
   *     "point": "500 500",
   *   },
   * }
   *
   * Example 2:
   * {
   *   "parameter=content": "hello",
   *   "parameter=point": {
   *     "point": "200 126",
   *   },
   * }
   *
   * Example 3: "" (empty string)
   *
   * @param actionType - The type of the action
   * @param object - The raw parameters of the action
   * @returns The standardized parameters object for GUIAction
   */
  public standardizeActionInputsFromXMLObject(
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
        const xmlStr = builder.build(value);
        if (!xmlStr || typeof xmlStr !== 'string') {
          throw new SyntaxError(
            `The required parameters of ${paramName} of ${actionType} action is empty`,
          );
        }
        this.logger.debug(`[standardizeActionInputsRecord] built xml string: ${xmlStr}`);
        // Support format: click(point='<point>510 150</point>')
        // if (xmlStr.includes('<point>')) {
        //   xmlStr = xmlStr.replace(/<point>|<\/point>/g, '').replace(/\s+/g, ',');
        //   xmlStr = `(${xmlStr})`;
        //   this.logger.debug(`[standardizeActionInputsRecord] formatted point: ${xmlStr}`);
        // }
        argumentsObj[paramName] = xmlStr;
      }
    }
    return argumentsObj;
  }
}
