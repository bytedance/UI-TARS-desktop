/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { desktopCapturer, screen } from 'electron';

import { actionParser } from '@ui-tars/action-parser';
import { PredictionParsed, ScreenshotResult } from '@ui-tars/shared/types';

import * as env from '@main/env';
import { logger } from '@main/logger';

import { FACTOR } from './constant';
import { execute } from './execute';

export class Desktop {
  tearDown() {
    logger.info('tearDown');
  }

  async nl2Command(
    prediction: string,
    // width: number,
    // height: number,
  ): Promise<{
    command?: string;
    parsed: PredictionParsed[];
  }> {
    const data = {
      prediction,
      factor: FACTOR,
      // width,
      // height,
    };
    const body = JSON.stringify(data);
    logger.info('[nl2Command] body', body);
    try {
      const { parsed } = await actionParser(data);
      logger.info('[nl2Command] parsed', parsed);

      return {
        parsed,
      };
    } catch (error) {
      logger.error('[lCmd2pyCmd] error', error);
      return {
        parsed: [],
      };
    }
  }

  async execute(
    prediction: PredictionParsed,
    screenWidth: number,
    screenHeight: number,
  ) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { scaleFactor } = primaryDisplay;

    await execute({
      prediction,
      screenWidth,
      screenHeight,
      logger,
      scaleFactor: !env.isMacOS ? scaleFactor : 1,
    });
  }

  async screenshot(): Promise<ScreenshotResult> {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    logger.info('[screenshot] [primaryDisplay]', 'size:', primaryDisplay.size);

    logger.info('[screenshot] [scaleScreenSize]', width, height);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(width),
        height: Math.round(height),
      },
    });
    const primarySource = sources[0];
    const screenshot = primarySource.thumbnail;

    return {
      base64: screenshot.toPNG().toString('base64'),
      width,
      height,
    };
  }
}
