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

  if (hBar * wBar > maxPixels) {
    const beta = Math.sqrt((height * width) / maxPixels);
    hBar = floorByFactor(height / beta, factor);
    wBar = floorByFactor(width / beta, factor);
  } else if (hBar * wBar < minPixels) {
    const beta = Math.sqrt(minPixels / (height * width));
    hBar = ceilByFactor(height * beta, factor);
    wBar = ceilByFactor(width * beta, factor);
  }

  return [wBar, hBar];
}

export function actionParser(params: {
  prediction: string;
  /** [widthFactor, heightFactor] */
  factor: number | [number, number];
  screenContext?: {
    width: number;
    height: number;
  };
  scaleFactor?: number;
  mode?: 'bc' | 'o1';
  modelVer?: UITarsModelVersion;
}): {
  parsed: PredictionParsed[];
} {
  const { prediction, factor, mode, screenContext, scaleFactor, modelVer } =
    params;

  const parsed = parseActionVlm(
    prediction,
    Array.isArray(factor) ? factor : [factor, factor],
    mode,
    screenContext,
    scaleFactor,
    modelVer,
  );

  return {
    parsed,
  };
}

export function parseActionVlm(
  text: string,
  factors: [number, number] = [1000, 1000],
  mode: 'bc' | 'o1' = 'bc',
  screenContext?: {
    width: number;
    height: number;
  },
  scaleFactor?: number,
  modelVer: UITarsModelVersion = UITarsModelVersion.V1_0,
): PredictionParsed[] {
  let reflection: string | null = null;
  let thought: string | null = null;
  let actionStr = '';
  let actionMarkerCount = 0;

  let smartResizeFactors: [number, number] | null = null;
  if (
    modelVer === UITarsModelVersion.V1_5 &&
    screenContext?.height &&
    screenContext?.width
  ) {
    smartResizeFactors = smartResizeForV15(
      screenContext.height,
      screenContext.width,
    );
  }

  text = text.trim();
  if (mode === 'bc') {
    // Parse thought/reflection based on different text patterns
    if (text.includes('Thought:')) {
      const thoughtMatch = text.match(
        /Thought: ([\s\S]+?)(?=\s*Action[:：]|$)/,
      );

      if (thoughtMatch) {
        thought = thoughtMatch[1].trim();
      }
    } else if (text.startsWith('Reflection:')) {
      const reflectionMatch = text.match(
        /Reflection: ([\s\S]+?)Action_Summary: ([\s\S]+?)(?=\s*Action[:：]|$)/,
      );
      if (reflectionMatch) {
        thought = reflectionMatch[2].trim();
        reflection = reflectionMatch[1].trim();
      }
    } else if (text.startsWith('Action_Summary:')) {
      const summaryMatch = text.match(
        /Action_Summary: (.+?)(?=\s*Action[:：]|$)/,
      );
      if (summaryMatch) {
        thought = summaryMatch[1].trim();
      }
    }

    const actionMarkers = findActionMarkers(text);
    actionMarkerCount = actionMarkers.length;

    if (actionMarkerCount === 0) {
      //   throw new Error('No Action found in text');
      actionStr = text;
    } else {
      for (let i = actionMarkers.length - 1; i >= 0; i--) {
        const actionMarker = actionMarkers[i];
        const candidate = text.slice(
          actionMarker.index + actionMarker.marker.length,
        );
        if (extractLeadingFunctionCall(candidate)) {
          actionStr = candidate;
          break;
        }

        if (!actionStr) {
          actionStr = candidate;
        }
      }
    }
  } else if (mode === 'o1') {
    // Parse o1 format
    const thoughtMatch = text.match(/<Thought>\s*(.*?)\s*<\/Thought>/);
    const actionSummaryMatch = text.match(
      /\nAction_Summary:\s*(.*?)\s*Action:/,
    );
    const actionMatch = text.match(/\nAction:\s*(.*?)\s*<\/Output>/);

    const thoughtContent = thoughtMatch ? thoughtMatch[1] : null;
    const actionSummaryContent = actionSummaryMatch
      ? actionSummaryMatch[1]
      : null;
    const actionContent = actionMatch ? actionMatch[1] : null;

    thought = `${thoughtContent}\n<Action_Summary>\n${actionSummaryContent}`;
    actionStr = actionContent || '';
  }

  // Parse actions
  let allActions: string[] = [];
  const hasExplicitActionBlock = mode === 'o1' || actionMarkerCount > 0;

  if (hasExplicitActionBlock) {
    allActions = actionStr
      .split('\n\n')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .flatMap((segment) => {
        const leadingAction = extractLeadingFunctionCall(segment);
        return leadingAction ? [leadingAction.value] : [];
      });
  }

  if (allActions.length === 0) {
    allActions = actionStr
      .split('\n\n')
      .map((action) => action.trim())
      .filter((action) => action.length > 0);
  }

  if (allActions.length === 0) {
    allActions = [''];
  }

  const actions: PredictionParsed[] = [];

  for (const rawStr of allActions) {
    // prettier-ignore
    const actionInstance = parseAction(rawStr.replace(/\n/g, String.raw`\n`).trimStart());
    let actionType = '';
    let actionInputs: ActionInputs = {};

    if (actionInstance) {
      actionType = actionInstance.function;
      const params = actionInstance.args;
      actionInputs = {};

      for (const [paramName, param] of Object.entries(params)) {
        if (!param) continue;
        const trimmedParam = (param as string).trim();

        if (paramName.includes('start_box') || paramName.includes('end_box')) {
          const oriBox = trimmedParam;
          const normalizedBox = oriBox.replace(/\)\s*\(/g, ',');
          // Remove parentheses and split
          const numbers = normalizedBox
            .replace(/[()[\]]/g, '')
            .split(',')
            .filter((ori) => ori !== '');

          const useAbsolutePixelCoords =
            !!screenContext &&
            numbers.some((num, idx) => {
              const parsed = Number.parseFloat(num);
              if (!isNumber(parsed)) {
                return false;
              }
              const factorIndex = idx % 2;
              return parsed > factors[factorIndex];
            });

          // Convert to float and scale
          const floatNumbers = numbers.map((num, idx) => {
            const factorIndex = idx % 2;
            if (modelVer === UITarsModelVersion.V1_5 && smartResizeFactors) {
              return Number.parseFloat(num) / smartResizeFactors[factorIndex];
            }
            if (useAbsolutePixelCoords && screenContext) {
              const axisSize =
                factorIndex === 0 ? screenContext.width : screenContext.height;
              return Number.parseFloat(num) / axisSize;
            }
            return Number.parseFloat(num) / factors[factorIndex];
          });

          if (floatNumbers.length === 2) {
            floatNumbers.push(floatNumbers[0], floatNumbers[1]);
          }

          actionInputs[
            paramName.trim() as keyof Omit<
              ActionInputs,
              'start_coords' | 'end_coords'
            >
          ] = JSON.stringify(floatNumbers);

          if (screenContext?.width && screenContext?.height) {
            const boxKey = paramName.includes('start_box')
              ? 'start_coords'
              : 'end_coords';
            const [x1, y1, x2 = x1, y2 = y1] = floatNumbers;
            const [widthFactor, heightFactor] = factors;

            actionInputs[boxKey] = [x1, y1, x2, y2].every(isNumber)
              ? [
                  (Math.round(
                    ((x1 + x2) / 2) * screenContext?.width * widthFactor,
                  ) /
                    widthFactor) *
                    (scaleFactor ?? 1),
                  (Math.round(
                    ((y1 + y2) / 2) * screenContext?.height * heightFactor,
                  ) /
                    heightFactor) *
                    (scaleFactor ?? 1),
                ]
              : [];
          }
        } else {
          actionInputs[
            paramName.trim() as keyof Omit<
              ActionInputs,
              'start_coords' | 'end_coords'
            >
          ] = trimmedParam;
        }
      }
    }

    actions.push({
      reflection: reflection,
      thought: thought || '',
      action_type: actionType,
      action_inputs: actionInputs,
    });
  }

  return actions;
}

function findActionMarkers(
  text: string,
): Array<{ index: number; marker: string }> {
  const markers: Array<{ index: number; marker: string }> = [];
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quote) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === '\n' || char === '\r') {
        quote = null;
        continue;
      }

      if (char === '\\') {
        escaping = true;
        continue;
      }

      if (char === quote) {
        if (quote === "'" && isInWordApostrophe(text, i)) {
          continue;
        }

        quote = null;
        continue;
      }

      if (
        (text.startsWith('Action:', i) || text.startsWith('Action：', i)) &&
        !hasClosingQuoteBeforeLineBreak(text, i, quote)
      ) {
        quote = null;
      } else {
        continue;
      }
    }

    if (char === "'" && isApostrophe(text, i)) {
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char as "'" | '"';
      continue;
    }

    if (text.startsWith('Action:', i)) {
      markers.push({ index: i, marker: 'Action:' });
      i += 'Action:'.length - 1;
      continue;
    }

    if (text.startsWith('Action：', i)) {
      markers.push({ index: i, marker: 'Action：' });
      i += 'Action：'.length - 1;
    }
  }

  return markers;
}

function isApostrophe(text: string, index: number): boolean {
  const prev = text[index - 1] ?? '';
  const next = text[index + 1] ?? '';

  if (!/[A-Za-z0-9]/.test(prev)) {
    return false;
  }

  if (/[A-Za-z0-9]/.test(next)) {
    return true;
  }

  return next === '' || /[\s,.;:!?)}\]]/.test(next);
}

function isInWordApostrophe(text: string, index: number): boolean {
  const prev = text[index - 1] ?? '';
  const next = text[index + 1] ?? '';
  return /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(next);
}

function hasClosingQuoteBeforeLineBreak(
  text: string,
  fromIndex: number,
  quote: "'" | '"',
): boolean {
  let escaping = false;

  for (let i = fromIndex; i < text.length; i++) {
    const char = text[i];

    if (char === '\n' || char === '\r') {
      return false;
    }

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    if (char === quote) {
      if (quote === "'" && isInWordApostrophe(text, i)) {
        continue;
      }

      return true;
    }
  }

  return false;
}

/**
 * Parses an action string into a structured object
 * @param {string} actionStr - The action string to parse (e.g. "click(start_box='(279,81)')")
 * @returns {Object|null} Parsed action object or null if parsing fails
 */
function parseAction(actionStr: string) {
  try {
    // Support format: click(start_box='<|box_start|>(x1,y1)<|box_end|>')
    actionStr = actionStr.replace(/<\|box_start\|>|<\|box_end\|>/g, '');

    // Support format: click(point='<point>510 150</point>') => click(start_box='<point>510 150</point>')
    // Support format: drag(start_point='<point>458 328</point>', end_point='<point>350 309</point>') => drag(start_box='<point>458 328</point>', end_box='<point>350 309</point>')
    actionStr = actionStr
      .replace(/(?<!start_|end_)point=/g, 'start_box=')
      .replace(/start_point=/g, 'start_box=')
      .replace(/end_point=/g, 'end_box=');

    // Match function name and arguments using regex
    const functionPattern = /^(\w+)\((.*)\)$/;
    const match = actionStr.trim().match(functionPattern);

    if (!match) {
      throw new Error('Not a function call');
    }

    const [_, functionName, argsStr] = match;

    // Parse keyword arguments
    const kwargs = {};

    if (argsStr.trim()) {
      // Split on commas that aren't inside quotes or parentheses
      const argPairs = argsStr.match(/([^,']|'[^']*')+/g) || [];

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
    console.error(`Failed to parse action '${actionStr}': ${e}`);
    return null;
  }
}

function extractLeadingFunctionCall(
  text: string,
  allowOffset = false,
): { value: string; end: number } | null {
  const fnPattern = allowOffset
    ? /[A-Za-z_][A-Za-z0-9_]*\s*\(/
    : /^[\s\n\r]*([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
  const match = fnPattern.exec(text);

  if (!match || match.index == null) {
    return null;
  }

  const start = allowOffset ? match.index : text.search(/[A-Za-z_]/);
  if (start < 0) {
    return null;
  }

  const openParenIndex = text.indexOf('(', start);
  if (openParenIndex < 0) {
    return null;
  }

  let depth = 0;
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (let i = openParenIndex; i < text.length; i++) {
    const char = text[i];

    if (quote) {
      if (escaping) {
        escaping = false;
        continue;
      }
      if (char === '\\') {
        escaping = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char as "'" | '"';
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        return {
          value: text.slice(start, i + 1).trim(),
          end: i + 1,
        };
      }
    }
  }

  return null;
}
