/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// import { PredictionParsed } from '@ui-tars/shared';
import isNumber from 'lodash.isnumber';
import { ConsoleLogger } from '@agent-infra/logger';
import { ChatCompletionMessageToolCall, LogLevel } from '@tarko/agent-interface';
import { getScreenInfo } from './shared';

export interface ActionInstance {
  function: string;
  args: Record<string, string>;
}

export type Coords = [number, number] | [];
export type ActionInputs = Partial<{
  content: string;
  start_box: string;
  end_box: string;
  key: string;
  hotkey: string;
  direction: string;
  start_coords: Coords;
  end_coords: Coords;
  button: string;
}>;

export interface PredictionParsed {
  /** `<action_inputs>` parsed from action_type(`action_inputs`) */
  action_inputs: ActionInputs;
  /** `<reflection>` parsed from Reflection: `<reflection>` */
  reflection: string | null;
  /** `<action_type>` parsed from `<action_type>`(action_inputs) */
  action_type: string;
  /** `<thought>` parsed from Thought: `<thought>` */
  thought: string;
}

export interface BrowserVisionControlCall extends ChatCompletionMessageToolCall {
  id: string;
  type: 'function';
  function: {
    name: 'browser_vision_control';
    arguments: string;
  };
}

export class GUIAgentT5Adapter {
  private logger: ConsoleLogger;
  private readonly actionTypeMap: Record<string, string> = {
    navigate: 'navigate',
    navigate_back: 'navigate_back',
    call_user: 'call_user',
    click: 'click',
    drag: 'drag',
    finished: 'finished',
    hotkey: 'hotkey',
    left_double: 'left_double',
    mouse_down: 'mouse_down',
    mouse_up: 'mouse_up',
    move_to: 'mouse_move',
    press: 'press',
    release: 'release',
    right_single: 'right_single',
    scroll: 'scroll',
    type: 'type',
    wait: 'wait',
  };

  constructor(logger?: ConsoleLogger) {
    this.logger = logger || new ConsoleLogger('GUIAgentT5Adapter', LogLevel.DEBUG);
  }

  /**
   * Convert tool definition array to browser_vision_control call format
   * @param tools Tool definition array
   * @param reasoningBuffer Reasoning buffer content
   * @returns browser_vision_control call object array
   */
  public convertToolsToOperatorActions(
    tools: ChatCompletionMessageToolCall[],
    reasoningBuffer: string,
  ): BrowserVisionControlCall[] {
    return tools.map((tool) => {
      this.logger.debug(`[convertToolsToOperatorActions] Processing tool: ${JSON.stringify(tool)}`);

      const actionType = this.convertNameToActionType(tool.function.name);
      const { action_inputs, action_string } = this.convertArgsStrToActionInput(
        actionType,
        tool.function.arguments,
      );
      const operator_action: PredictionParsed = {
        action_type: actionType,
        action_inputs,
        reflection: '',
        thought: '',
      };

      const browserCall: BrowserVisionControlCall = {
        id: tool.id,
        type: 'function',
        function: {
          name: 'browser_vision_control',
          arguments: JSON.stringify({
            action: action_string,
            step: '',
            thought: reasoningBuffer,
            operator_action,
          }),
        },
      };

      this.logger.debug(
        `[convertToolsToOperatorActions] Generated browser call for tool ${tool.id}`,
      );
      return browserCall;
    });
  }

  private convertNameToActionType(functionName: string) {
    return this.actionTypeMap[functionName] || functionName;
  }

  private convertArgsStrToActionInput(
    actionType: string,
    argsStr: string,
  ): {
    action_inputs: ActionInputs;
    action_string: string;
  } {
    this.logger.debug(
      `[convertArgsStrToActionInput]: actionType: ${actionType}, argsStr: ${argsStr}`,
    );

    let action_inputs: ActionInputs = {};
    let action_string = '';

    try {
      const args = argsStr.length > 0 ? JSON.parse(argsStr) : {};
      switch (actionType) {
        case 'navigate':
          if (args.content) {
            action_string = `navigate(content='${args.content}')`;
            action_inputs = {
              content: args.content,
            };
          }
          break;
        case 'navigate_back':
          action_string = `navigate_back()`;
          // action_inputs = {};
          break;
        case 'wait':
          // TODO: Add wait's parameters
          action_string = `wait()`;
          this.logger.debug(`Generated wait action: ${action_string}`);
          // action_inputs = {};
          break;
        case 'mouse_down':
        case 'mouse_up':
          // TODO: Support mouse_down and mouse_up
          const button = args.button ?? 'left';
          action_string = `${actionType}(point='${args.point}', button=${button})`;
          this.logger.debug(`Generated mouse action: ${action_string}`);
          // action_inputs = {};
          break;
        case 'click':
        case 'left_double':
        case 'right_single':
        case 'move_to':
          if (args.point) {
            // click(point='<point>168 868</point>')
            action_string = `${actionType}(point='${args.point}')`;
            action_inputs = this.parseActionInputWithCoords(action_string);
            this.logger.debug(`Generated click/move action: ${action_string}`);
          }
          break;
        case 'scroll':
          if (args.direction) {
            // Demo: Action: scroll(point='<point>500 500</point>', direction='down')
            action_string = `scroll(point='${args.point}', direction='${args.direction}')`;
            action_inputs = this.parseActionInputWithCoords(action_string);
            this.logger.debug(`Generated scroll action: ${action_string}`);
          }
          break;
        case 'drag':
          if (args.start_point && args.end_point) {
            // Demo: drag(start_point='<point>190 868</point>', end_point='<point>280 868</point>')
            action_string = `drag(start_point='${args.start_point}', end_point='${args.end_point}')`;
            action_inputs = this.parseActionInputWithCoords(action_string);
            this.logger.debug(`Generated drag action: ${action_string}`);
          }
          break;
        case 'type':
        case 'call_user':
        case 'finished':
          if (args.content) {
            action_string = `${actionType}(content='${args.content}')`;
            action_inputs = {
              content: args.content,
            };
            this.logger.debug(`Generated content action: ${action_string}`);
          }
          break;
        case 'hotkey':
          if (args.key) {
            action_string = `hotkey(key='${args.key}')`;
            action_inputs = {
              hotkey: args.key,
            };
            this.logger.debug(`Generated hotkey action: ${action_string}`);
          }
          break;
        default:
          this.logger.warn(`Unknown action type: ${actionType}`);
      }
    } catch (error) {
      this.logger.warn(`[convertArgsStrToActionInput]: Failed to parse '${argsStr}': ${error}`);
      action_string = `${actionType}()`;
      // action_inputs = {};
    }

    const result = {
      action_inputs: action_inputs,
      action_string: action_string,
    };
    this.logger.debug(`Convert args result: ${JSON.stringify(result)}`);
    return result;
  }

  private parseActionInputWithCoords(actionStr: string): ActionInputs {
    this.logger.debug(`[parseActionInputWithCoords]: ${actionStr}`);
    const parsedAction = this.parseSingleActionStr(actionStr);
    if (!parsedAction) {
      this.logger.warn(`[parseActionInputWithCoords] Failed to parse action string: ${actionStr}`);
      return {};
    }
    const actionInputs = this.calculateActionInstance(parsedAction);
    this.logger.debug(
      `[parseActionInputWithCoords] Parsed actionInputs: ${JSON.stringify(actionInputs)}`,
    );
    return actionInputs;
  }

  /**
   * Parses an action string into a structured object
   * @param {string} actionStr - The action string to parse (e.g. "click(start_box='(279,81)')")
   * @returns {Object|null} Parsed action object or null if parsing fails
   */
  private parseSingleActionStr(actionStr: string): ActionInstance | null {
    try {
      // Support format: click(start_box='<|box_start|>(x1,y1)<|box_end|>')
      actionStr = actionStr.replace(/<\|box_start\|>|<\|box_end\|>/g, '');

      // Support format: click(point='<point>510 150</point>') => click(start_box='<point>510 150</point>')
      // Support format: drag(start_point='<point>458 328</point>', end_point='<point>350 309</point>') => drag(start_box='<point>458 328</point>', end_box='<point>350 309</point>')
      actionStr = actionStr
        .replace(/(?<!start_|end_)point=/g, 'start_box=')
        .replace(/start_point=/g, 'start_box=')
        .replace(/end_point=/g, 'end_box=');

      this.logger.debug(`[parseSingleActionStr] Normalized action string: ${actionStr}`);

      // Match function name and arguments using regex
      const functionPattern = /^(\w+)\((.*)\)$/;
      const match = actionStr.trim().match(functionPattern);

      if (!match) {
        throw new Error('Not a function call');
      }

      const [_, functionName, argsStr] = match;
      this.logger.debug(
        `[parseSingleActionStr] Extracted function: ${functionName}, args: ${argsStr}`,
      );

      // Parse keyword arguments
      const kwargs = {};

      if (argsStr.trim()) {
        // Split on commas that aren't inside quotes or parentheses
        const argPairs = argsStr.match(/([^,']|'[^']*')+/g) || [];
        this.logger.debug(`[parseSingleActionStr] argPairs: ${JSON.stringify(argPairs)}`);

        for (const pair of argPairs) {
          const [key, ...valueParts] = pair.split('=');
          if (!key) continue;

          let value = valueParts
            .join('=')
            .trim()
            .replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes

          // Support format: click(start_box='<bbox>637 964 637 964</bbox>')
          if (value.includes('<bbox>')) {
            value = value.replace(/<bbox>|<\/bbox>/g, '').replace(/\s+/g, ',');
            value = `(${value})`;
          }

          // Support format: click(point='<point>510 150</point>')
          if (value.includes('<point>')) {
            value = value.replace(/<point>|<\/point>/g, '').replace(/\s+/g, ',');
            value = `(${value})`;
          }

          //@ts-ignore
          kwargs[key.trim()] = value;
        }
      }

      return {
        function: functionName,
        args: kwargs,
      };
    } catch (e) {
      this.logger.error(`[parseSingleActionStr] Failed to parse: '${actionStr}': ${e}`);
      return null;
    }
  }

  private calculateActionInstance(actionInstance: ActionInstance): ActionInputs {
    this.logger.debug(
      `[calculateActionInstance] actionInstance: ${JSON.stringify(actionInstance)}`,
    );
    let actionType = '';
    let actionInputs: ActionInputs = {};

    actionType = actionInstance.function;
    const params = actionInstance.args;
    actionInputs = {};

    const factors = [1000, 1000];
    const screenContext = getScreenInfo();
    this.logger.debug(`[calculateActionInstance] screenContext: ${JSON.stringify(screenContext)}`);
    const scaleFactor = null;

    for (const [paramName, param] of Object.entries(params)) {
      if (!param) continue;
      const trimmedParam = (param as string).trim();
      this.logger.debug(
        `[calculateActionInstance] Processing parameter: ${paramName} = ${trimmedParam}`,
      );

      if (paramName.includes('start_box') || paramName.includes('end_box')) {
        const oriBox = trimmedParam;
        // Remove parentheses and split
        const numbers = oriBox
          .replace(/[()[\]]/g, '')
          .split(',')
          .filter((ori) => ori !== '');

        // Convert to float and scale
        const floatNumbers = numbers.map((num, idx) => {
          const factorIndex = idx % 2;
          return Number.parseFloat(num) / factors[factorIndex];
        });

        if (floatNumbers.length === 2) {
          floatNumbers.push(floatNumbers[0], floatNumbers[1]);
        }

        this.logger.debug(
          `[calculateActionInstance] converted coords: ${JSON.stringify(floatNumbers)}`,
        );

        actionInputs[paramName.trim() as keyof Omit<ActionInputs, 'start_coords' | 'end_coords'>] =
          JSON.stringify(floatNumbers);

        if (screenContext?.screenWidth && screenContext?.screenHeight) {
          const boxKey = paramName.includes('start_box') ? 'start_coords' : 'end_coords';
          const [x1, y1, x2 = x1, y2 = y1] = floatNumbers;
          const [widthFactor, heightFactor] = factors;

          actionInputs[boxKey] = [x1, y1, x2, y2].every(isNumber)
            ? [
                (Math.round(((x1 + x2) / 2) * screenContext?.screenWidth * widthFactor) /
                  widthFactor) *
                  (scaleFactor ?? 1),
                (Math.round(((y1 + y2) / 2) * screenContext?.screenHeight * heightFactor) /
                  heightFactor) *
                  (scaleFactor ?? 1),
              ]
            : [];
        }
      } else {
        actionInputs[paramName.trim() as keyof Omit<ActionInputs, 'start_coords' | 'end_coords'>] =
          trimmedParam;
      }
    }
    return actionInputs;
  }
}
