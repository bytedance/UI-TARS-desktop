import {
  type HTTPRequest,
  type HTTPResponse,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import { ElementHandle, Frame, Page as PuppeteerPage } from 'puppeteer-core';
import {
  BrowserContextConfig,
  DEFAULT_BROWSER_CONTEXT_CONFIG,
  PartialWithRequired,
} from './types';
import { DOMElementNode } from '../dom/views';

export async function scrollIntoViewIfNeeded(
  element: ElementHandle,
  timeout = 2500,
): Promise<void> {
  const startTime = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check if element is in viewport
    const isVisible = await element.evaluate((el) => {
      const rect = el.getBoundingClientRect();

      // Check if element has size
      if (rect.width === 0 || rect.height === 0) return false;

      // Check if element is hidden
      const style = window.getComputedStyle(el);
      if (
        style.visibility === 'hidden' ||
        style.display === 'none' ||
        style.opacity === '0'
      ) {
        return false;
      }

      // Check if element is in viewport
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <=
          (window.innerWidth || document.documentElement.clientWidth);

      if (!isInViewport) {
        // Scroll into view if not visible
        el.scrollIntoView({
          behavior: 'auto',
          block: 'center',
          inline: 'center',
        });
        return false;
      }

      return true;
    });

    if (isVisible) break;

    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Timed out while trying to scroll element into view');
    }

    // Small delay before next check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function locateElement(
  page: PuppeteerPage,
  element: DOMElementNode,
  _options?: Partial<BrowserContextConfig>,
): Promise<ElementHandle | null> {
  const options = {
    ...DEFAULT_BROWSER_CONTEXT_CONFIG,
    ..._options,
  };
  if (!page) {
    // throw new Error('Puppeteer page is not connected');
    console.warn('Puppeteer is not connected');
    return null;
  }
  let currentFrame: PuppeteerPage | Frame = page;

  // Start with the target element and collect all parents
  const parents: DOMElementNode[] = [];
  let current = element;
  while (current.parent) {
    parents.push(current.parent);
    current = current.parent;
  }

  // Process all iframe parents in sequence (in reverse order - top to bottom)
  const iframes = parents.reverse().filter((item) => item.tagName === 'iframe');
  for (const parent of iframes) {
    const cssSelector = parent.enhancedCssSelectorForElement(
      options.includeDynamicAttributes,
    );
    const frameElement: ElementHandle | null =
      await currentFrame.$(cssSelector);
    if (!frameElement) {
      // throw new Error(`Could not find iframe with selector: ${cssSelector}`);
      console.warn(`Could not find iframe with selector: ${cssSelector}`);
      return null;
    }
    const frame: Frame | null = await frameElement.contentFrame();
    if (!frame) {
      // throw new Error(`Could not access frame content for selector: ${cssSelector}`);
      console.warn(
        `Could not access frame content for selector: ${cssSelector}`,
      );
      return null;
    }
    currentFrame = frame;
  }

  const cssSelector = element.enhancedCssSelectorForElement(
    options.includeDynamicAttributes,
  );

  try {
    const elementHandle: ElementHandle | null =
      await currentFrame.$(cssSelector);
    if (elementHandle) {
      // Scroll element into view if needed
      await scrollIntoViewIfNeeded(elementHandle);
      return elementHandle;
    }
  } catch (error) {
    console.error('Failed to locate element:', error);
  }

  return null;
}

export async function waitForStableNetwork(
  page: PuppeteerPage | null,
  _options?: Partial<BrowserContextConfig>,
) {
  const options = {
    ...DEFAULT_BROWSER_CONTEXT_CONFIG,
    ..._options,
  };
  if (!page) {
    throw new Error('Puppeteer page is not connected');
  }

  const RELEVANT_RESOURCE_TYPES = new Set([
    'document',
    'stylesheet',
    'image',
    'font',
    'script',
    'iframe',
  ]);

  const RELEVANT_CONTENT_TYPES = new Set([
    'text/html',
    'text/css',
    'application/javascript',
    'image/',
    'font/',
    'application/json',
  ]);

  const IGNORED_URL_PATTERNS = new Set([
    // Analytics and tracking
    'analytics',
    'tracking',
    'telemetry',
    'beacon',
    'metrics',
    // Ad-related
    'doubleclick',
    'adsystem',
    'adserver',
    'advertising',
    // Social media widgets
    'facebook.com/plugins',
    'platform.twitter',
    'linkedin.com/embed',
    // Live chat and support
    'livechat',
    'zendesk',
    'intercom',
    'crisp.chat',
    'hotjar',
    // Push notifications
    'push-notifications',
    'onesignal',
    'pushwoosh',
    // Background sync/heartbeat
    'heartbeat',
    'ping',
    'alive',
    // WebRTC and streaming
    'webrtc',
    'rtmp://',
    'wss://',
    // Common CDNs
    'cloudfront.net',
    'fastly.net',
  ]);

  const pendingRequests = new Set();
  let lastActivity = Date.now();

  const onRequest = (request: HTTPRequest) => {
    // Filter by resource type
    const resourceType = request.resourceType();
    if (!RELEVANT_RESOURCE_TYPES.has(resourceType)) {
      return;
    }

    // Filter out streaming, websocket, and other real-time requests
    if (
      ['websocket', 'media', 'eventsource', 'manifest', 'other'].includes(
        resourceType,
      )
    ) {
      return;
    }

    // Filter out by URL patterns
    const url = request.url().toLowerCase();
    if (
      Array.from(IGNORED_URL_PATTERNS).some((pattern) => url.includes(pattern))
    ) {
      return;
    }

    // Filter out data URLs and blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return;
    }

    // Filter out requests with certain headers
    const headers = request.headers();
    if (
      // biome-ignore lint/complexity/useLiteralKeys: <explanation>
      headers['purpose'] === 'prefetch' ||
      headers['sec-fetch-dest'] === 'video' ||
      headers['sec-fetch-dest'] === 'audio'
    ) {
      return;
    }

    pendingRequests.add(request);
    lastActivity = Date.now();
  };

  const onResponse = (response: HTTPResponse) => {
    const request = response.request();
    if (!pendingRequests.has(request)) {
      return;
    }

    // Filter by content type
    const contentType = response.headers()['content-type']?.toLowerCase() || '';

    // Skip streaming content
    if (
      [
        'streaming',
        'video',
        'audio',
        'webm',
        'mp4',
        'event-stream',
        'websocket',
        'protobuf',
      ].some((t) => contentType.includes(t))
    ) {
      pendingRequests.delete(request);
      return;
    }

    // Only process relevant content types
    if (
      !Array.from(RELEVANT_CONTENT_TYPES).some((ct) => contentType.includes(ct))
    ) {
      pendingRequests.delete(request);
      return;
    }

    // Skip large responses
    const contentLength = response.headers()['content-length'];
    if (contentLength && Number.parseInt(contentLength) > 5 * 1024 * 1024) {
      // 5MB
      pendingRequests.delete(request);
      return;
    }

    pendingRequests.delete(request);
    lastActivity = Date.now();
  };

  // Add event listeners
  page.on('request', onRequest as any);
  page.on('response', onResponse as any);

  try {
    const startTime = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const now = Date.now();
      const timeSinceLastActivity = (now - lastActivity) / 1000; // Convert to seconds

      if (
        pendingRequests.size === 0 &&
        timeSinceLastActivity >= options.waitForNetworkIdlePageLoadTime
      ) {
        break;
      }

      const elapsedTime = (now - startTime) / 1000; // Convert to seconds
      if (elapsedTime > options.maximumWaitPageLoadTime) {
        console.debug(
          `Network timeout after ${options.maximumWaitPageLoadTime}s with ${pendingRequests.size} pending requests:`,
          Array.from(pendingRequests).map((r) => (r as HTTPRequest).url()),
        );
        break;
      }
    }
  } finally {
    // Clean up event listeners
    page.off('request', onRequest as any);
    page.off('response', onResponse as any);
  }
  console.debug(
    `Network stabilized for ${options.waitForNetworkIdlePageLoadTime} seconds`,
  );
}

export async function waitForPageAndFramesLoad(
  page: PuppeteerPage | null,
  /** timeout in seconds */
  timeoutOverwrite?: number,
  _options?: Partial<BrowserContextConfig>,
): Promise<void> {
  const options = {
    ...DEFAULT_BROWSER_CONTEXT_CONFIG,
    ..._options,
  };
  // Start timing
  const startTime = Date.now();

  // Wait for page load
  try {
    await waitForStableNetwork(page, options);
  } catch (error) {
    console.warn('Page load failed, continuing...');
  }

  // Calculate remaining time to meet minimum wait time
  const elapsed = (Date.now() - startTime) / 1000; // Convert to seconds
  const minWaitTime = timeoutOverwrite || options.minimumWaitPageLoadTime;
  const remaining = Math.max(minWaitTime - elapsed, 0);

  console.debug(
    `--Page loaded in ${elapsed.toFixed(2)} seconds, waiting for additional ${remaining.toFixed(2)} seconds`,
  );

  // Sleep remaining time if needed
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining * 1000)); // Convert seconds to milliseconds
  }
}

export async function waitForPageLoadState(
  page: PuppeteerPage,
  timeout?: number,
) {
  const timeoutValue = timeout || 8000;
  await page?.waitForNavigation({ timeout: timeoutValue });
}
