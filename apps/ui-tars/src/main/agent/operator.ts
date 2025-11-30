/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Key, keyboard, screen } from '@computer-use/nut-js';
import {
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
} from '@ui-tars/sdk/core';
import { NutJSOperator } from '@ui-tars/operator-nut-js';
import { clipboard } from 'electron';
import { desktopCapturer } from 'electron';
import { Jimp } from 'jimp';

import * as env from '@main/env';
import { logger } from '@main/logger';
import { sleep } from '@ui-tars/shared/utils';
import { getScreenSize } from '@main/utils/screen';

export class NutJSElectronOperator extends NutJSOperator {
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `left_double(start_box='[x1, y1, x2, y2]')`,
      `right_single(start_box='[x1, y1, x2, y2]')`,
      `drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `hotkey(key='')`,
      `type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')`,
      `wait() #Sleep for 5s and take a screenshot to check for any changes.`,
      `finished()`,
      `call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.`,
    ],
  };

  // Screenshot compression parameters (easily adjustable)
  private readonly screenshotJpegQuality: number = 75; // JPEG quality percentage (0-100) default: 75

  // Resolution scaling factor for screenshots (1.0 = original size, 0.5 = half size)
  // Reducing resolution can significantly improve inference latency
  protected readonly resolutionScaleFactor: number = 0.7;

  // Performance threshold for auto-fallback to NutJS method (in milliseconds)
  // If desktopCapturer.getSources takes longer than this, fallback to screen.grab()
  private readonly performanceThreshold: number = 1000; // 1 second

  // Track whether we should use NutJS method based on performance
  private useNutJSMethod: boolean = false;

  /**
   * Screenshot using NutJS screen.grab() method
   * This is typically faster on Windows than desktopCapturer.getSources()
   */
  private async screenshotWithNutJS(): Promise<ScreenshotOutput> {
    const totalStartTime = Date.now();
    
    logger.info('[screenshot] Using NutJS method (parent class screenshot)');
    
    // Simply use the parent class's screenshot method which already handles
    // screen.grab() and basic image processing
    const result = await super.screenshot();
    
    const totalDuration = Date.now() - totalStartTime;
    
    logger.info(
      '[screenshot] [NutJS method] Total screenshot time:',
      `${totalDuration}ms, Base64 length: ${result.base64?.length || 0} characters`,
    );
    
    return result;
  }

  /**
   * Screenshot using Electron desktopCapturer.getSources() method
   * This is typically faster on Mac than Windows
   */
  private async screenshotWithElectron(): Promise<ScreenshotOutput> {
    const totalStartTime = Date.now();
    const {
      physicalSize,
      logicalSize,
      scaleFactor,
      id: primaryDisplayId,
    } = getScreenSize(); // Logical = Physical / scaleX

    logger.info(
      '[screenshot] [primaryDisplay]',
      'logicalSize:',
      logicalSize,
      'scaleFactor:',
      scaleFactor,
    );

    // Calculate target scaled dimensions upfront
    // This allows us to use target size as thumbnailSize, reducing
    // amount of pixels Windows needs to process
    const scaledWidth = Math.round(
      physicalSize.width * this.resolutionScaleFactor,
    );
    const scaledHeight = Math.round(
      physicalSize.height * this.resolutionScaleFactor,
    );

    // For Windows, use much smaller thumbnailSize for better performance
    // This is a more aggressive optimization for Windows
    const thumbnailWidth = env.isWindows 
      ? Math.round(scaledWidth * 0.6) // 40% smaller on Windows
      : scaledWidth;
    const thumbnailHeight = env.isWindows 
      ? Math.round(scaledHeight * 0.6) // 40% smaller on Windows
      : scaledHeight;

    // Performance optimization for Windows:
    // Use much smaller thumbnailSize to reduce pixel count
    // This reduces load on Windows' screen capture API
    const getSourcesStartTime = Date.now();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: thumbnailWidth,
        height: thumbnailHeight,
      },
    });
    const getSourcesDuration = Date.now() - getSourcesStartTime;
    logger.info(
      `[screenshot] desktopCapturer.getSources took ${getSourcesDuration}ms`,
    );

    // Auto-fallback to NutJS method if performance is poor
    if (
      env.isWindows &&
      getSourcesDuration > this.performanceThreshold &&
      !this.useNutJSMethod
    ) {
      logger.warn(
        `[screenshot] desktopCapturer.getSources took ${getSourcesDuration}ms (>${this.performanceThreshold}ms threshold), ` +
          `switching to NutJS method for better performance`,
      );
      this.useNutJSMethod = true;
      return await this.screenshotWithNutJS();
    }

    const primarySource =
      sources.find(
        (source) => source.display_id === primaryDisplayId.toString(),
      ) || sources[0];

    if (!primarySource) {
      logger.error('[screenshot] Primary display source not found', {
        primaryDisplayId,
        availableSources: sources.map((s) => s.display_id),
      });
      // fallback to default screenshot
      return await super.screenshot();
    }

    const screenshot = primarySource.thumbnail;

    // Log original screenshot dimensions before compression
    const originalWidth = screenshot.getSize().width;
    const originalHeight = screenshot.getSize().height;
    logger.info(
      '[screenshot] Original size before compression:',
      `${originalWidth}x${originalHeight} (${originalWidth * originalHeight} pixels)`,
    );

    // Check if resize is needed (thumbnailSize might already match target size)
    let imageToEncode = screenshot;
    if (
      originalWidth !== scaledWidth ||
      originalHeight !== scaledHeight
    ) {
      const resizeStartTime = Date.now();
      imageToEncode = screenshot.resize({
        width: scaledWidth,
        height: scaledHeight,
      });
      const resizeDuration = Date.now() - resizeStartTime;
      logger.info(`[screenshot] resize took ${resizeDuration}ms`);
    } else {
      logger.info('[screenshot] No resize needed, thumbnailSize matched target size');
    }

    // Convert to JPEG with configurable quality
    const jpegStartTime = Date.now();
    const jpegBuffer = imageToEncode.toJPEG(this.screenshotJpegQuality);
    const jpegDuration = Date.now() - jpegStartTime;
    logger.info(`[screenshot] toJPEG encoding took ${jpegDuration}ms`);

    const compressedBase64 = jpegBuffer.toString('base64');

    const totalDuration = Date.now() - totalStartTime;

    // Log compressed image dimensions and size
    logger.info(
      '[screenshot] [Electron method] Compressed size after JPEG compression:',
      `${scaledWidth}x${scaledHeight} (${scaledWidth * scaledHeight} pixels),`,
      `Resolution scale: ${this.resolutionScaleFactor},`,
      `Quality: ${this.screenshotJpegQuality}%,`,
      `Base64 length: ${compressedBase64.length} characters,`,
      `Total screenshot time: ${totalDuration}ms`,
    );

    // Return original scaleFactor (DPI scale), not modified by resolution scale
    // Coordinate restoration will be handled in execute() method
    return {
      base64: compressedBase64,
      scaleFactor,
    };
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    // On Windows, use NutJS method if it has been determined to be faster
    // On Mac, always use Electron method (it's faster there)
    if (env.isWindows && this.useNutJSMethod) {
      return await this.screenshotWithNutJS();
    }

    // Try Electron method first (with auto-fallback on Windows if slow)
    return await this.screenshotWithElectron();
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { action_type, action_inputs } = params.parsedPrediction;

    // Restore coordinates to original resolution
    // Since screenshot was scaled down by resolutionScaleFactor,
    // we need to scale the screen dimensions back up for correct coordinate calculation
    const restoredParams = {
      ...params,
      screenWidth: Math.round(params.screenWidth / this.resolutionScaleFactor),
      screenHeight: Math.round(
        params.screenHeight / this.resolutionScaleFactor,
      ),
    };

    logger.info(
      '[NutJSElectronOperator] Coordinate restoration:',
      `Scaled screen: ${params.screenWidth}x${params.screenHeight}`,
      `Original screen: ${restoredParams.screenWidth}x${restoredParams.screenHeight}`,
      `Resolution scale factor: ${this.resolutionScaleFactor}`,
    );

    if (action_type === 'type' && env.isWindows && action_inputs?.content) {
      const content = action_inputs.content?.trim();

      logger.info('[device] type', content);
      const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
      const originalClipboard = clipboard.readText();
      clipboard.writeText(stripContent);
      await keyboard.pressKey(Key.LeftControl, Key.V);
      await sleep(50);
      await keyboard.releaseKey(Key.LeftControl, Key.V);
      await sleep(50);
      clipboard.writeText(originalClipboard);
      
      // Check if content ends with \n and press Enter if it does
      if (content.endsWith('\n') || content.endsWith('\\n')) {
        await keyboard.pressKey(Key.Enter);
        await keyboard.releaseKey(Key.Enter);
      }
    } else {
      return await super.execute(restoredParams);
    }
  }
}