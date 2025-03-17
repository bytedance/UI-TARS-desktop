/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import sharp from 'sharp';

import { Conversation, type PredictionParsed } from '@ui-tars/shared/types';

import { logger } from '@main/logger';
import { setOfMarksOverlays } from '@main/shared/setOfMarks';

// TODO: use jimp to mark click position
export async function markClickPosition(data: {
  base64: string;
  screenshotContext: NonNullable<Conversation['screenshotContext']>;
  parsed: PredictionParsed[];
}): Promise<string> {
  if (!data?.parsed?.length) {
    return data.base64;
  }
  try {
    const imageBuffer = Buffer.from(data.base64, 'base64');
    const { overlays = [] } = setOfMarksOverlays({
      predictions: data.parsed,
      screenshotContext: data.screenshotContext,
    });
    const imageOverlays: sharp.OverlayOptions[] = overlays
      .map((o) => {
        if (o.yPos && o.xPos) {
          return {
            input: Buffer.from(o.svg),
            top: o.yPos + o.offsetY,
            left: o.xPos + o.offsetX,
          };
        }
        return null;
      })
      .filter((overlay) => !!overlay);

    if (!imageOverlays?.length) {
      return '';
    }

    const result = await sharp(imageBuffer).composite(imageOverlays).toBuffer();

    return result.toString('base64');
  } catch (error) {
    logger.error('图片处理出错:', error);
    // return origin base64
    return '';
  }
}
