import type { Viewport } from 'puppeteer-core';
import { ToolDefinition } from '../typings.js';

export const delayReject = (ms: number) =>
  new Promise((_, reject) => setTimeout(() => reject(false), ms));

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Validate if either selector or index is provided
 * @param args - The arguments to validate
 * @returns True if either selector or index is provided, false otherwise
 */
export function validateSelectorOrIndex(args: {
  selector?: string;
  index?: number;
  [key: string]: any;
}) {
  if (args?.index !== undefined || args?.selector !== undefined) {
    return true;
  }

  return false;
}

export function defineTools<T extends Record<keyof T, ToolDefinition>>(
  tools: T,
): T {
  return tools;
}

/**
 * Parse proxy url to username and password
 * @param proxyUrl - proxy url
 * @returns username and password
 */
export function parseProxyUrl(proxyUrl: string) {
  const result = { username: '', password: '' };

  try {
    const url = new URL(proxyUrl);
    result.username = url.username || '';
    result.password = url.password || '';
  } catch (error) {
    try {
      if (proxyUrl.includes('@')) {
        const protocolIndex = proxyUrl.indexOf('://');
        if (protocolIndex !== -1) {
          const authStartIndex = protocolIndex + 3;
          const authEndIndex = proxyUrl.indexOf('@');

          if (authEndIndex > authStartIndex) {
            const authInfo = proxyUrl.substring(authStartIndex, authEndIndex);
            const authParts = authInfo.split(':');

            if (authParts.length >= 2) {
              result.username = authParts[0];
              result.password = authParts[1];
            }
          }
        }
      }
    } catch (fallbackError) {
      console.error('parse proxy url error:', fallbackError);
    }
  }

  return result;
}

export function parseViewportSize(viewportSize: string): Viewport | undefined {
  if (!viewportSize || typeof viewportSize !== 'string') {
    return undefined;
  }

  const [width, height] = viewportSize
    .split(',')
    .map(Number)
    .filter((num) => !Number.isNaN(num));
  return { width, height };
}

export function parserFactor(factor: string): [number, number] | undefined {
  if (!factor || typeof factor !== 'string') {
    return undefined;
  }

  const [widthFactor, heightFactor] = factor
    .split(',')
    .map(Number)
    .filter((num) => !Number.isNaN(num));
  return [widthFactor, heightFactor ?? widthFactor];
}

export function sanitizeForFilePath(s: string) {
  const sanitize = (s: string) =>
    s.replace(/[<>:"|?*/\\]+/g, '-').replace(/[\p{Cc}]+/gu, '-');
  const separator = s.lastIndexOf('.');
  if (separator === -1) return sanitize(s);
  return (
    sanitize(s.substring(0, separator)) +
    '.' +
    sanitize(s.substring(separator + 1))
  );
}

/**
 * get download suggestion
 *
 * @param downloadsBefore before download
 * @param downloadsAfter after download
 * @param downloadedFiles downloaded files
 * @returns download suggestion
 */
export function getDownloadSuggestion(
  downloadsBefore: number,
  downloadedFiles: Array<{ suggestedFilename?: string }>,
  outputDir: string,
): string {
  const downloadsAfter = downloadedFiles.length;
  if (downloadsAfter <= downloadsBefore) return '';

  const latestFile = downloadedFiles[downloadsAfter - 1];
  return latestFile?.suggestedFilename
    ? `, Downloading file ${latestFile.suggestedFilename}`
    : '';
}
