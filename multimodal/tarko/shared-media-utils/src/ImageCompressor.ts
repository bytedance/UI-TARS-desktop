/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';

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
    let instance = sharp(imageBuffer);

    if (this.options.width || this.options.height) {
      instance = instance.resize(this.options.width, this.options.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    switch (this.options.format) {
      case 'jpeg':
        instance = instance.jpeg({ quality: this.options.quality, mozjpeg: true });
        break;
      case 'png':
        instance = instance.png({ quality: this.options.quality, compressionLevel: 9 });
        break;
      case 'webp':
      default:
        instance = instance.webp({ quality: this.options.quality });
        break;
    }

    return instance.toBuffer();
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
