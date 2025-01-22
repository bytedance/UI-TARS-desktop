/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import sharp from 'sharp';

import { type PredictionParsed } from '@ui-tars/shared/types';

import { logger } from '@main/logger';

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

function parseCoordinates(metaInfo: {
  width: number;
  height: number;
  p: PredictionParsed;
}) {
  const { p, width, height } = metaInfo;
  const startBox = p.action_inputs?.start_box
    ? JSON.parse(p.action_inputs.start_box)
    : null;
  if (!startBox) {
    logger.warn('startBox is null', p);
    return { clickX: 0, clickY: 0, circleSize: 0 };
  }
  const clickX = startBox[0] * width;
  const clickY = startBox[1] * height;

  const boxWidth = Math.abs((startBox[2] - startBox[0]) * width);
  const boxHeight = Math.abs((startBox[3] - startBox[1]) * height);

  const circleSize = Math.max(
    50,
    Math.min(150, Math.round((boxWidth + boxHeight) / 2)),
  );

  return { clickX, clickY, circleSize };
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
    const overlays = data?.parsed
      ?.map((p) => {
        try {
          if (!p.action_inputs?.start_box) {
            return;
          }

          const actionType = p.action_type;
          const { clickX, clickY, circleSize } = parseCoordinates({
            p,
            width: data.width,
            height: data.height,
          });

          const circleRadius = Math.round(circleSize * 0.45);
          const innerRadius = Math.round(circleSize * 0.12);
          const textOffset = Math.round(circleSize * 0.8);
          const fontSize = Math.round(circleSize); // 增大文本大小

          const svgWidth = Math.max(
            400,
            circleSize + textOffset + actionType.length * fontSize + 400,
          );

          const extraInfo =
            clickX && clickY
              ? `(${Math.floor(clickX)}, ${Math.floor(clickY)})`
              : '';

          const svg = `
          <svg width="${svgWidth}" height="${circleSize}">
          <!-- 圆圈标记 -->
          <circle
            cx="${circleSize / 2}"
            cy="${circleSize / 2}"
            r="${circleRadius}"
            fill="none"
            stroke="red"
            stroke-width="${Math.max(2, circleSize / 12)}"
          />
          <circle
            cx="${circleSize / 2}"
            cy="${circleSize / 2}"
            r="${innerRadius}"
            fill="red"
          />
          <!-- 文本标注 -->
          <text
            x="${circleSize + textOffset}"
            y="${circleSize / 2 + fontSize / 3}"
            font-family="Arial"
            font-size="${fontSize}px"
            fill="red"
            font-weight="bold"
            style="word-break: break-all; white-space: pre-wrap;"
          >${actionType}${extraInfo}</text>
        </svg>
      `;

          return {
            input: Buffer.from(svg),
            top: Math.round(clickY - circleSize / 2),
            left: Math.round(clickX - circleSize / 2),
          };
        } catch (e) {
          logger.error('解析坐标失败:', e);
          return;
        }
      })
      .filter((overlay) => !!overlay);

    if (!overlays?.length) {
      return '';
    }

    const result = await sharp(imageBuffer)
      .composite(overlays as sharp.OverlayOptions[])
      .toBuffer();

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
      logger.debug(
        '[resizeFactor] maxPixels',
        maxPixels,
        'currentPixels',
        currentPixels,
        'resizeFactor',
        resizeFactor,
      );

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
