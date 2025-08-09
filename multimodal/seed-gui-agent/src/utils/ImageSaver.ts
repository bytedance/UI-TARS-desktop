/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

import { LLMRequestHookPayload } from '@tarko/agent';

/**
 * Save base64 image data as files
 */
export class ImageSaver {
  /**
   * Save base64 image to file
   * @param base64Data - base64 encoded image data
   * @param outputPath - output file path
   * @param filename - filename (optional)
   */
  static async saveBase64Image(
    base64Data: string,
    outputPath: string,
    filename?: string,
  ): Promise<string> {
    try {
      // Remove base64 prefix (if exists)
      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to Buffer
      const imageBuffer = Buffer.from(cleanBase64, 'base64');

      // Ensure output directory exists
      if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
      }

      // Generate filename (if not provided)
      const finalFilename = filename || `image-${Date.now()}.jpg`;
      const fullPath = path.join(outputPath, finalFilename);

      // Write file
      await fs.promises.writeFile(fullPath, imageBuffer);

      console.log(`Image saved to: ${fullPath}`);
      return fullPath;
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  }

  /**
   * Automatically detect image format from base64 data and save
   */
  static async saveBase64ImageWithAutoFormat(
    base64Data: string,
    outputPath: string,
    baseName?: string,
  ): Promise<string> {
    // Remove base64 prefix and get format information
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    let format = 'jpg';
    let cleanBase64 = base64Data;

    if (matches) {
      format = matches[1];
      cleanBase64 = matches[2];
    } else {
      // If no prefix, try to detect format from binary data
      const buffer = Buffer.from(cleanBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      format = ImageSaver.detectImageFormat(buffer);
    }

    const filename = `${baseName || `image-${Date.now()}`}.${format}`;
    return await ImageSaver.saveBase64Image(base64Data, outputPath, filename);
  }

  /**
   * Extract and save images from LLM request payload
   * @param sessionId - session identifier for organizing saved images
   * @param payload - LLM request payload containing potential image data
   */
  static async saveImagesFromPayload(
    sessionId: string,
    payload: LLMRequestHookPayload,
  ): Promise<void> {
    console.log('saveImagesFromPayload', sessionId);
    try {
      // @ts-ignore, Extract messages from payload
      const messages = payload.request.messages;
      if (!messages || !Array.isArray(messages)) {
        return;
      }

      // Create save directory
      const saveDir = path.join(os.homedir(), '.seed-gui-agent', 'images', sessionId);
      console.log('saveDir', saveDir);

      let imageIndex = 0;
      // Get the last message instead of iterating through all messages
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.content && Array.isArray(lastMessage.content)) {
        for (const contentItem of lastMessage.content) {
          if (contentItem.type === 'image_url' && contentItem.image_url?.url) {
            const imageUrl = contentItem.image_url.url;

            // Check if it's a base64 image
            if (imageUrl.startsWith('data:image/')) {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const baseName = `${timestamp}-${imageIndex}`;

              try {
                const savedPath = await ImageSaver.saveBase64ImageWithAutoFormat(
                  imageUrl,
                  saveDir,
                  baseName,
                );
                console.log(`Image saved: ${savedPath}`);
                imageIndex++;
              } catch (error) {
                console.error(`Failed to save image (index ${imageIndex}):`, error);
              }
            }
          }
        }
      }
      if (imageIndex > 0) {
        console.log(`Session ${sessionId} saved ${imageIndex} images to directory: ${saveDir}`);
      }
    } catch (error) {
      console.error('Error processing image saving:', error);
    }
  }

  /**
   * Detect image format
   */
  private static detectImageFormat(buffer: Buffer): string {
    // PNG format detection
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'png';
    }
    // JPEG format detection
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return 'jpg';
    }
    // WebP format detection
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      return 'webp';
    }
    // Default return jpg
    return 'jpg';
  }
}
