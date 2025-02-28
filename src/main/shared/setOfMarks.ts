/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Conversation, PredictionParsed } from '@ui-tars/shared/types';
import { parseBoxToScreenCoords } from '@ui-tars/sdk/core';

export interface Overlay {
  prediction: PredictionParsed;
  xPos: number | undefined;
  offsetX: number;
  yPos: number | undefined;
  offsetY: number;
  boxWidth: number | undefined;
  boxHeight: number | undefined;
  svg: string;
}

/**
 * set of marks overlays, action highlights
 * @param predictions PredictionParsed[]
 * @param screenshotContext screenWidth, screenHeight
 * @returns Overlay[]
 */
export const setOfMarksOverlays = ({
  predictions,
  screenshotContext,
  xPos,
  yPos,
}: {
  predictions: PredictionParsed[];
  screenshotContext: NonNullable<Conversation['screenshotContext']>;
  xPos?: number;
  yPos?: number;
}): {
  overlays: Overlay[];
} => {
  const overlays: Overlay[] = [];
  const { width, height } = screenshotContext?.size || {};

  for (const prediction of predictions) {
    let boxWidth: number;
    let boxHeight: number;
    switch (prediction.action_type) {
      case 'click':
      case 'left_click':
      case 'left_single':
      case 'left_double':
      case 'double_click':
        if (prediction.action_inputs?.start_box) {
          const coords = parseBoxToScreenCoords({
            boxStr: prediction.action_inputs.start_box,
            screenWidth: width,
            screenHeight: height,
          });
          const clickX = coords.x;
          const clickY = coords.y;
          if (!clickX || !clickY) break;

          boxWidth = 250;
          boxHeight = 100;

          xPos = Math.floor(clickX);
          yPos = Math.floor(clickY);
          overlays.push({
            prediction,
            xPos,
            offsetX: -boxWidth / 2,
            yPos,
            offsetY: -boxHeight / 2,
            boxWidth,
            boxHeight,
            svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}" viewBox="0 0 ${boxWidth} ${boxHeight}">
              <circle
                cx="${boxWidth / 2}"
                cy="${boxHeight / 2}"
                r="16"
                fill="none"
                stroke="red"
                stroke-width="3"
                stroke-dasharray="80 20"
                stroke-linecap="round">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 ${boxWidth / 2} ${boxHeight / 2}"
                  to="360 ${boxWidth / 2} ${boxHeight / 2}"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx="${boxWidth / 2}"
                cy="${boxHeight / 2}"
                r="3"
                fill="red"
              />
              <text
                x="${boxWidth / 2 + 65}"
                y="${boxHeight / 2}"
                font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif"
                font-size="16"
                fill="red"
                text-anchor="middle"
                dominant-baseline="middle"
              >${prediction.action_type}</text>
            </svg>`,
          });
        }
        break;
      case 'type':
        boxWidth = 400;
        boxHeight = 100;

        const { content } = prediction.action_inputs || {};

        overlays.push({
          prediction,
          xPos,
          offsetX: 0,
          yPos,
          offsetY: -boxHeight / 2,
          boxWidth,
          boxHeight,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}" viewBox="0 0 ${boxWidth} ${boxHeight}">
          <text
            x="${boxWidth / 2}"
            y="${boxHeight / 2}"
            font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif"
            font-size="16"
            fill="red"
            text-anchor="middle"
            dominant-baseline="middle"
          >Typing: "${content}"</text>
        </svg>`,
        });
        break;
      case 'hotkey':
        boxWidth = 200;
        boxHeight = 100;

        const { key = '' } = prediction.action_inputs || {};
        const keys = key.split(' ').join(' + ');

        overlays.push({
          prediction,
          offsetX: 0,
          xPos,
          yPos,
          offsetY: -boxHeight / 2,
          boxWidth,
          boxHeight,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}" viewBox="0 0 ${boxWidth} ${boxHeight}">
          <text
            x="${boxWidth / 2}"
            y="${boxHeight / 2}"
            font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif"
            font-size="16"
            fill="red"
            text-anchor="middle"
            dominant-baseline="middle"
          >Hotkey: ${keys}</text>
        </svg>`,
        });
        break;
      // case 'scroll':
      //   break;
      // case 'left_click_drag':
      // case 'drag':
      // case 'select':
      //   break;
      // case 'hover':
      // case 'mouse_move':
      //   break;
      // case 'wait':
      //   break;
      default:
        boxWidth = 100;
        boxHeight = 100;
        overlays.push({
          prediction,
          xPos,
          offsetX: 0,
          yPos,
          offsetY: -boxHeight / 2,
          boxWidth,
          boxHeight,
          svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${boxWidth}" height="${boxHeight}" viewBox="0 0 ${boxWidth} ${boxHeight}">
          <text
            x="${boxWidth / 2}"
            y="${boxHeight / 2}"
            font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif"
            font-size="16"
            fill="red"
            text-anchor="middle"
            dominant-baseline="middle"
          >${prediction.action_type}</text>
        </svg>`,
        });
        break;
    }
  }

  return {
    overlays,
  };
};
