/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
// @ts-expect-error
import imageminMozjpeg from 'imagemin-mozjpeg';
// @ts-expect-error
import imageminWebp from 'imagemin-webp';

export interface ImageCompressionOptions {
  quality: number; // Compression quality (1-100)
  format?: 'jpeg' | 'png' | 'webp';
  width?: number; // Optional target width
  height?: number; // Optional target height
  tempDir?: string; // Temporary directory
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  path: string;
  buffer: Buffer;
}

/**
 * High-performance image compression utility class
 */
export class ImageCompressor {
  public readonly options: ImageCompressionOptions;

  constructor(options?: ImageCompressionOptions) {
    // Set default options
    this.options = {
      quality: options?.quality ?? 80,
      format: options?.format ?? 'webp',
      width: options?.width,
      height: options?.height,
    };
  }

  /**
   * Compress image and return Buffer without writing to file
   * @param imageBuffer Image Buffer
   */
  async compressToBuffer(imageBuffer: Buffer): Promise<Buffer> {
    // Choose appropriate compression plugin
    const plugins = this.getPluginsForFormat();

    // Compress image
    return await imagemin.buffer(imageBuffer, {
      plugins,
    });
  }

  /**
   * Select plugins based on target format
   */
  private getPluginsForFormat() {
    const quality = this.options.quality / 100; // Convert to 0-1 range (required by some plugins)

    switch (this.options.format) {
      case 'jpeg':
        return [imageminMozjpeg({ quality: this.options.quality })];
      case 'png':
        return [
          imageminPngquant({
            quality: [quality, Math.min(quality + 0.2, 1)],
          }),
        ];
      case 'webp':
        return [imageminWebp({ quality: this.options.quality })];
      default:
        return [imageminWebp({ quality: this.options.quality })];
    }
  }

  /**
   * Get formatted description of current compression options
   */
  getOptionsDescription(): string {
    return `Quality: ${this.options.quality}, Format: ${this.options.format}${
      this.options.width ? `, Width: ${this.options.width}px` : ''
    }${this.options.height ? `, Height: ${this.options.height}px` : ''}`;
  }
}

/**
 * Format byte size to human readable format
 * @param bytes Number of bytes
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
