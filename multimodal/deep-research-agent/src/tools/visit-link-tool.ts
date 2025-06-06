/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, Tool } from '@multimodal/agent';
import { ConsoleLogger } from '@agent-infra/logger';
import { LocalBrowser } from '@agent-infra/browser';
import { READABILITY_SCRIPT, toMarkdown } from '@agent-infra/shared';
import { ContentProcessor, ContentExtractionMode } from '../utils/content-processor';

/**
 * Enhanced visit link tool with improved features:
 * - Multiple content extraction modes
 * - Structured data extraction
 * - Image extraction
 * - Improved content processing
 */
export const EnhancedVisitLinkTool = new Tool({
  id: 'visit-link',
  description:
    'Visit a specific webpage and extract content with various options for data analysis',
  parameters: z.object({
    url: z.string().describe('The URL to visit and extract content from'),
    extractionMode: z
      .enum(['full', 'summary', 'structured'])
      .optional()
      .describe('Content extraction mode (default: full)'),
    waitForSelector: z
      .string()
      .optional()
      .describe('Optional CSS selector to wait for before extraction'),
    maxContentLength: z
      .number()
      .optional()
      .describe('Maximum content length to extract (default: 8000 characters)'),
    includeImages: z
      .boolean()
      .optional()
      .describe('Whether to extract images from the page (default: true)'),
    maxImages: z.number().optional().describe('Maximum number of images to extract (default: 5)'),
  }),
  function: async ({
    url,
    extractionMode = 'full',
    waitForSelector,
    maxContentLength = 8000,
    includeImages = true,
    maxImages = 5,
  }) => {
    const logger = new ConsoleLogger('[VisitLink]');
    logger.info(`Visiting URL: "${url}" with extraction mode: ${extractionMode}`);

    const browser = new LocalBrowser({ logger });

    try {
      await browser.launch({ headless: true });

      const mode = extractionMode as ContentExtractionMode;

      // Enhanced page evaluation with multiple extraction modes
      const result = await browser.evaluateOnNewPage({
        url,
        waitForOptions: { waitUntil: 'networkidle2', timeout: 45000 }, // 增加超时时间
        pageFunction: (window, readabilityScript, extractionMode, includeImages, maxImages) => {
          const document = window.document;

          // Use Mozilla's Readability library
          const Readability = new Function('module', `${readabilityScript}\nreturn module.exports`)(
            {},
          );

          // Remove irrelevant elements
          document
            .querySelectorAll(
              'script,noscript,style,link,iframe,canvas,svg[width="0"],footer,nav,aside',
            )
            .forEach((el) => el.remove());

          // Parse content with Readability
          const article = new Readability(document).parse();

          // Extract images if requested
          let images: any[] = [];
          if (includeImages) {
            // 增强图片选择逻辑
            images = Array.from(document.querySelectorAll('img'))
              .filter((img) => {
                // 更智能地过滤图片
                const width = parseInt(img.getAttribute('width') || '0', 10) || img.width || 0;
                const height = parseInt(img.getAttribute('height') || '0', 10) || img.height || 0;
                const src =
                  img.src ||
                  img.getAttribute('data-src') ||
                  img.getAttribute('data-original') ||
                  '';

                // 排除小图标、空白图片和追踪像素
                if ((width < 100 || height < 100) && width * height < 10000) return false;

                // 确保图片有有效的src且不是base64格式(通常是小图标)
                return src && src.startsWith('http') && !src.startsWith('data:');
              })
              .slice(0, maxImages as number)
              .map((img) => {
                // 尝试获取更好的图片说明
                let caption = img.alt || '';
                let alt = img.alt || '';

                // 查找更好的图片说明来源
                const figure = img.closest('figure');
                const figcaption = figure?.querySelector('figcaption');
                if (figcaption && figcaption.textContent) {
                  caption = figcaption.textContent.trim();
                }

                // 尝试从周围文本中获取上下文
                if (!caption) {
                  const parent = img.parentElement;
                  const siblings = parent?.childNodes || [];
                  for (const sibling of siblings) {
                    if (
                      sibling.nodeType === 3 &&
                      sibling.textContent &&
                      sibling.textContent.trim().length > 10
                    ) {
                      caption = sibling.textContent.trim().substring(0, 100);
                      break;
                    }
                  }
                }

                // 如果没有找到任何说明，使用附近的标题
                if (!caption) {
                  const nearestHeading = img
                    .closest('section')
                    ?.querySelector('h1, h2, h3, h4, h5, h6');
                  if (nearestHeading && nearestHeading.textContent) {
                    caption = nearestHeading.textContent.trim();
                  }
                }

                const imgObj = {
                  src:
                    img.src ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-original') ||
                    '',
                  alt: alt || 'Image',
                  caption: caption || '相关图片',
                  width: img.width || parseInt(img.getAttribute('width') || '0', 10) || 0,
                  height: img.height || parseInt(img.getAttribute('height') || '0', 10) || 0,
                  pageUrl: window.location.href, // 保存图片来源页面URL
                };

                return imgObj;
              });
          }

          // 获取更丰富的结构化数据
          let structuredData = null;
          if (extractionMode === 'structured') {
            structuredData = {
              headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map((el) => el.textContent?.trim())
                .filter(Boolean),
              lists: Array.from(document.querySelectorAll('ul, ol'))
                .map((listEl) =>
                  Array.from(listEl.querySelectorAll('li'))
                    .map((li) => li.textContent?.trim())
                    .filter(Boolean),
                )
                .filter((list) => list.length > 0),
              tables: Array.from(document.querySelectorAll('table'))
                .map((tableEl) => {
                  const rows = Array.from(tableEl.querySelectorAll('tr'));
                  return rows.map((row) =>
                    Array.from(row.querySelectorAll('td, th')).map(
                      (cell) => cell.textContent?.trim() || '',
                    ),
                  );
                })
                .filter((table) => table.length > 0),
              links: Array.from(document.querySelectorAll('a[href]'))
                .filter((link) => {
                  const href = link.getAttribute('href') || '';
                  return (
                    href &&
                    href.startsWith('http') &&
                    link.textContent &&
                    link.textContent.trim().length > 1
                  );
                })
                .map((link) => ({
                  url: link.getAttribute('href'),
                  text: link.textContent?.trim() || '',
                }))
                .slice(0, 15), // 限制链接数量
            };
          }

          // 获取元数据
          const metaDescription =
            document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const metaKeywords =
            document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
          const metaAuthor =
            document.querySelector('meta[name="author"]')?.getAttribute('content') || '';

          // 获取JSON-LD结构化数据(如果存在)
          let jsonLdData = null;
          try {
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            if (jsonLdScripts.length > 0) {
              jsonLdData = Array.from(jsonLdScripts).map((script) => {
                try {
                  return JSON.parse(script.textContent || '{}');
                } catch (e) {
                  return {};
                }
              });
            }
          } catch (e) {
            // 忽略解析错误
          }

          return {
            title: article?.title || document.title,
            content: article?.content || document.body.innerHTML,
            url: window.location.href,
            excerpt: article?.excerpt || metaDescription,
            metadata: {
              description: metaDescription,
              keywords: metaKeywords,
              author: metaAuthor,
              jsonLd: jsonLdData,
            },
            structuredData,
            images,
            originalUrl: url, // 保存原始请求的URL
          };
        },
        pageFunctionParams: [READABILITY_SCRIPT, mode, includeImages, maxImages],
        beforePageLoad: async (page) => {
          await page.setViewport({ width: 1280, height: 900 });
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          );

          // 设置请求超时
          await page.setDefaultNavigationTimeout(45000);

          // 禁用JavaScript时间将可能更快加载某些页面
          // await page.setJavaScriptEnabled(false);
        },
        afterPageLoad: async (page) => {
          if (waitForSelector) {
            try {
              await page.waitForSelector(waitForSelector, { timeout: 5000 });
            } catch (e) {
              logger.warn(`Selector "${waitForSelector}" not found, continuing anyway`);
            }
          }

          // 滚动页面以加载懒加载内容
          await page.evaluate(() => {
            return new Promise((resolve) => {
              let totalHeight = 0;
              const distance = 300;
              const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                  clearInterval(timer);
                  resolve(true);
                }
              }, 100);
            });
          });

          // 等待动态内容加载
          await new Promise((resolve) => setTimeout(resolve, 2000));
        },
      });

      if (!result) {
        return {
          error: `Failed to extract content from page: ${url}`,
          url,
          originalUrl: url,
        };
      }

      // 将HTML转换为Markdown
      const markdownContent = toMarkdown(result.content);

      // 基于提取模式处理内容
      let processedContent;
      if (mode === ContentExtractionMode.STRUCTURED) {
        processedContent = result.structuredData;
      } else if (mode === ContentExtractionMode.SUMMARY) {
        processedContent = ContentProcessor.summarize(markdownContent, maxContentLength);
      } else {
        // FULL模式 - 提取关键信息
        processedContent = ContentProcessor.extractKeyInformation(
          markdownContent,
          maxContentLength,
        );
      }

      return {
        title: result.title,
        url: result.url,
        originalUrl: url, // 确保原始URL被保留
        excerpt: result.excerpt,
        metadata: result.metadata,
        extractionMode: mode,
        content: processedContent,
        images: result.images || [],
        structuredData: result.structuredData, // 始终返回结构化数据以便于使用
      };
    } catch (error) {
      logger.error(`Error visiting URL: ${error}`);
      return {
        error: `Failed to visit URL: ${error}`,
        url,
        originalUrl: url, // 即使失败也返回原始URL
      };
    } finally {
      await browser.close();
    }
  },
});
