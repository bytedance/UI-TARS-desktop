/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import sharp from 'sharp';

import { type PredictionParsed } from '@ui-tars/shared/types';

import { logger } from '@main/logger';
import { setOfMarksOverlays } from '@main/shared/setOfMarks';

// eslint-disable-next-line @typescript-eslint/require-await
export async function compressBase64Image(base64String: string) {
  try {
    // 移除 base64 字符串的 header（如："data:image/jpeg;base64,"）
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

    // 将 base64 转换为 buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 创建 sharp 实例
    const image = sharp(imageBuffer);

    // 获取图片格式信息
    const metadata = await image.metadata();

    // 根据原始图片格式选择合适的压缩方式
    let compressedImageBuffer;
    if (metadata.format === 'png') {
      compressedImageBuffer = await image
        .png({ compressionLevel: 9 })
        .withMetadata()
        .toBuffer();
    }

    logger.debug(
      '[metadata]',
      'width:',
      metadata.width,
      'height:',
      metadata.height,
      'origin_size:',
      `${(imageBuffer.length / 1024).toFixed(2)}KB`,
      'compressed_size:',
      `${(compressedImageBuffer.length / 1024).toFixed(2)}KB`,
    );

    return compressedImageBuffer.toString('base64');
  } catch (error) {
    logger.error('压缩图片时出错:', error);
    // throw error;
    return base64String;
  }
}

export async function getImageDimensions(base64String) {
  // 移除 base64 字符串的 data:image 前缀部分
  const base64Image = base64String.replace(/^data:image\/\w+;base64,/, '');

  // 将 base64 转换为 buffer
  const imageBuffer = Buffer.from(base64Image, 'base64');

  try {
    // 使用 sharp 获取图片信息
    const metadata = await sharp(imageBuffer).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    logger.error('获取图片尺寸失败:', error);
    throw error;
  }
}

export async function markClickPosition(data: {
  base64: string;
  width: number;
  height: number;
  parsed: PredictionParsed[];
}): Promise<string> {
  if (!data?.parsed?.length) {
    return data.base64;
  }
  try {
    const imageBuffer = Buffer.from(data.base64, 'base64');
    const { overlays = [] } = setOfMarksOverlays({
      predictions: data.parsed,
      screenshotContext: {
        width: data.width,
        height: data.height,
      },
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

/**
 * Preprocess image: If the image exceeds/falls below the pixel limit, calculate a resize factor `resize_factor` to scale the image down to equal or fewer than max_pixels. This scaling factor is calculated by taking the square root, ensuring aspect ratio preservation, allowing original relative coordinates to be reused without conversion.
 * @param image_base64 The base64 encoded image
 * @returns The base64 encoded processed image
 */
export async function preprocessResizeImage(
  image_base64: string,
  maxPixels: number,
): Promise<string> {
  try {
    // base64 to buffer
    const imageBuffer = Buffer.from(image_base64, 'base64');

    // get image info
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('can not get image size');
    }

    // calculate resize factor
    const currentPixels = metadata.width * metadata.height;
    if (currentPixels > maxPixels) {
      const resizeFactor = Math.sqrt(maxPixels / currentPixels);

      const newWidth = Math.floor(metadata.width * resizeFactor);
      const newHeight = Math.floor(metadata.height * resizeFactor);

      // resize image and convert to RGB format
      const processedImage = await sharp(imageBuffer)
        .resize(newWidth, newHeight)
        .png({
          quality: 75,
          compressionLevel: 9,
        })
        .toBuffer();

      logger.debug(
        '[preprocessResizeImage]',
        'width:',
        newWidth,
        'height:',
        newHeight,
        'size:',
        `${(processedImage.length / 1024).toFixed(2)}KB`,
      );

      return processedImage.toString('base64');
    }

    return image_base64;
  } catch (error) {
    logger.error('preprocessResizeImage error:', error);
    throw error;
  }
}
