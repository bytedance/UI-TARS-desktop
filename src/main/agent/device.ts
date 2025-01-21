/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { desktopCapturer, screen } from 'electron';

import { actionParser } from '@ui-tars/action-parser';
import {
  PredictionParsed,
  ScreenshotResult,
} from '@ui-tars/desktop-shared/types';

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
    await execute({
      prediction,
      screenWidth,
      screenHeight,
      logger,
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
