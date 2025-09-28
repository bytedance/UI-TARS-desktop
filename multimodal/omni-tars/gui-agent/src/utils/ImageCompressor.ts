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
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  buffer: Buffer;
}

/**
 * High-performance image compression utility class using Sharp
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
    try {
      let sharpInstance = sharp(imageBuffer);

      // Apply resizing if dimensions are specified
      if (this.options.width || this.options.height) {
        sharpInstance = sharpInstance.resize(this.options.width, this.options.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format-specific compression
      switch (this.options.format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({
            quality: this.options.quality,
            progressive: true,
            mozjpeg: true,
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({
            quality: this.options.quality,
            compressionLevel: 9,
            palette: true,
          });
          break;
        case 'webp':
        default:
          sharpInstance = sharpInstance.webp({
            quality: this.options.quality,
            effort: 6, // Higher effort for better compression
          });
          break;
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compress image and return compression statistics
   * @param imageBuffer Image Buffer
   */
  async compressWithStats(imageBuffer: Buffer): Promise<CompressionResult> {
    const originalSize = imageBuffer.byteLength;
    const compressedBuffer = await this.compressToBuffer(imageBuffer);
    const compressedSize = compressedBuffer.byteLength;
    const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

    return {
      originalSize,
      compressedSize,
      compressionRatio,
      buffer: compressedBuffer,
    };
  }

  /**
   * Get metadata about an image
   * @param imageBuffer Image Buffer
   */
  async getImageMetadata(imageBuffer: Buffer) {
    try {
      return await sharp(imageBuffer).metadata();
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  /**
   * Check if Sharp is available and working
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Create a small test image and try to process it
      const testBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xf8, 0x0f, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5c, 0x6a, 0x42, 0x2e, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
      ]);
      
      await sharp(testBuffer).webp({ quality: 80 }).toBuffer();
      return true;
    } catch {
      return false;
    }
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