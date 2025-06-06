/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { toMarkdown } from '@agent-infra/shared';

/**
 * ContentExtractionMode defines how content should be extracted from web pages
 */
export enum ContentExtractionMode {
  /** Extract full content */
  FULL = 'full',
  /** Extract only a summary of the content */
  SUMMARY = 'summary',
  /** Extract structured data like tables, lists, headings */
  STRUCTURED = 'structured',
}

/**
 * ProcessedContent represents extracted and processed content from a web page
 */
export interface ProcessedContent {
  title: string;
  url: string;
  excerpt: string;
  content: string;
  structuredData?: {
    headings: string[];
    lists: string[][];
    tables: string[][][];
    links?: { url: string; text: string }[];
  };
  images?: ImageData[];
  error?: string;
}

/**
 * ImageData represents an extracted image with metadata
 */
export interface ImageData {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  pageUrl?: string; // 添加图片来源页面URL
}

/**
 * ContentProcessor handles extraction and processing of web content
 */
export class ContentProcessor {
  /**
   * Extract key information from HTML content
   * @param html Raw HTML content
   * @param maxLength Maximum length for the extracted content
   * @returns Extracted key information as string
   */
  static extractKeyInformation(html: string, maxLength = 5000): string {
    // 对于长文本，确保我们不超过限制
    if (typeof html !== 'string') {
      return '';
    }

    // 如果输入已经是markdown格式，直接处理
    const isMarkdown = !html.includes('<') || (html.includes('```') && html.includes('#'));

    // 转换为markdown以便于处理
    const markdown = isMarkdown ? html : toMarkdown(html);

    // 提取段落
    const paragraphs = markdown
      .split('\n\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 30); // 只保留足够长的段落

    // 为段落评分，找出更有可能包含重要信息的段落
    const scoredParagraphs = paragraphs.map((p) => {
      let score = 0;

      // 包含数字和百分比的段落可能更有事实性内容
      if (p.match(/\d+%|\d+\.\d+|\(\d+\)|（\d+）/)) score += 3;

      // 包含引用和参考信息的段落可能更有价值
      if (p.match(/来源|根据|引用|参考|报告|研究|调查|数据显示|根据.*表示|专家认为/)) score += 4;

      // 包含具体项目名称或组织的段落
      if (p.match(/开源项目|GitHub|开发者|贡献者|社区/)) score += 5;

      // 段落长度也是一个因素 - 适中的段落通常包含更多信息
      if (p.length > 100 && p.length < 500) score += 2;

      // 包含列表的段落通常很有价值
      if (p.match(/^\s*[\-\*]\s+/m) || p.match(/^\s*\d+\.\s+/m)) score += 3;

      // 添加一些随机性来确保多样性
      score += Math.random();

      return { text: p, score };
    });

    // 按分数排序
    scoredParagraphs.sort((a, b) => b.score - a.score);

    // 组合高分段落直到达到长度限制
    let result = '';
    for (const { text } of scoredParagraphs) {
      if ((result + '\n\n' + text).length <= maxLength) {
        result += (result ? '\n\n' : '') + text;
      } else if (result.length < maxLength / 2) {
        // 如果我们还没有收集足够的内容，添加一部分
        const remainingLength = maxLength - result.length - 2; // 为换行符留出空间
        if (remainingLength > 100) {
          // 只有当我们可以添加有意义的内容时
          result += '\n\n' + text.substring(0, remainingLength - 3) + '...';
        }
        break;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * Extract structured data from HTML content
   * @param document DOM document object
   * @returns Structured data extracted from the document
   */
  static extractStructuredData(document: Document): {
    headings: string[];
    lists: string[][];
    tables: string[][][];
    links: { url: string; text: string }[];
  } {
    // 提取标题
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[];

    // 提取列表
    const lists = Array.from(document.querySelectorAll('ul, ol'))
      .map(
        (listEl) =>
          Array.from(listEl.querySelectorAll('li'))
            .map((li) => li.textContent?.trim())
            .filter(Boolean) as string[],
      )
      .filter((list) => list.length > 0);

    // 提取表格
    const tables = Array.from(document.querySelectorAll('table'))
      .map((tableEl) => {
        const rows = Array.from(tableEl.querySelectorAll('tr'));
        return rows
          .map((row) =>
            Array.from(row.querySelectorAll('td, th')).map(
              (cell) => cell.textContent?.trim() || '',
            ),
          )
          .filter((row) => row.length > 0);
      })
      .filter((table) => table.length > 0);

    // 提取链接
    const links = Array.from(document.querySelectorAll('a[href]'))
      .filter((link) => {
        const href = link.getAttribute('href') || '';
        return (
          href && href.startsWith('http') && link.textContent && link.textContent.trim().length > 1
        );
      })
      .map((link) => ({
        url: link.getAttribute('href') || '',
        text: link.textContent?.trim() || '',
      }))
      .slice(0, 15); // 限制链接数量

    return { headings, lists, tables, links };
  }

  /**
   * Summarize content to a specified length
   * @param content Original content to summarize
   * @param maxLength Maximum length for the summary
   * @returns Summarized content
   */
  static summarize(content: string, maxLength = 1000): string {
    if (typeof content !== 'string') {
      return '';
    }

    // 检查内容是否为空
    if (!content || content.trim().length === 0) {
      return '';
    }

    // 提取段落
    const paragraphs = content.split('\n\n').filter((p) => p.trim().length > 0);

    if (paragraphs.length === 0) {
      return '';
    }

    // 如果内容已经很短，直接返回
    if (content.length <= maxLength) {
      return content;
    }

    // 对于长内容，优先提取包含重要信息的段落
    const importantParagraphs = paragraphs.filter((p) =>
      p.match(/关键|重要|主要|总结|概述|总体|结论|发现|分析表明|研究显示|数据表明/),
    );

    // 构建摘要，优先使用重要段落
    let summary = '';
    const paragraphsToUse =
      importantParagraphs.length > 0
        ? [...importantParagraphs, ...paragraphs.filter((p) => !importantParagraphs.includes(p))]
        : paragraphs;

    for (const p of paragraphsToUse) {
      if ((summary + '\n\n' + p).length <= maxLength) {
        summary += (summary ? '\n\n' : '') + p;
      } else {
        // 添加部分段落以达到最大长度
        const remainingLength = maxLength - summary.length - 2; // 为换行符留出空间
        if (remainingLength > 50) {
          summary += '\n\n' + p.substring(0, remainingLength - 3) + '...';
        }
        break;
      }
    }

    return summary.trim();
  }

  /**
   * Process content based on extraction mode
   * @param content Raw content from webpage
   * @param mode Content extraction mode
   * @param document DOM document for structured extraction
   * @returns Processed content based on mode
   */
  static processContent(content: string, mode: ContentExtractionMode, document?: Document): string {
    switch (mode) {
      case ContentExtractionMode.SUMMARY:
        return this.summarize(content);

      case ContentExtractionMode.STRUCTURED:
        if (!document) {
          return 'Error: Document object required for structured extraction';
        }
        const structuredData = this.extractStructuredData(document);
        return JSON.stringify(structuredData, null, 2);

      case ContentExtractionMode.FULL:
      default:
        return this.extractKeyInformation(content);
    }
  }

  /**
   * Process images for inclusion in the report
   * @param images Array of image data
   * @returns Markdown formatted image references
   */
  static processImagesForMarkdown(images: ImageData[]): string {
    if (!images || images.length === 0) {
      return '';
    }

    // 过滤掉无效的图片
    const validImages = images.filter(
      (img) =>
        img.src &&
        img.src.startsWith('http') &&
        (img.width === undefined || img.width > 100) &&
        (img.height === undefined || img.height > 100),
    );

    if (validImages.length === 0) {
      return '';
    }

    // 优先选择有描述的图片
    validImages.sort((a, b) => {
      const aHasCaption = a.caption && a.caption.length > 5 ? 1 : 0;
      const bHasCaption = b.caption && b.caption.length > 5 ? 1 : 0;
      return bHasCaption - aHasCaption;
    });

    return validImages
      .map((img) => {
        // 优化图片标题
        let caption = img.caption || img.alt || '相关图片';

        // 避免过长的标题
        if (caption.length > 100) {
          caption = caption.substring(0, 97) + '...';
        }

        // 添加图片来源页面信息
        const sourceInfo = img.pageUrl ? `\n*来源: ${img.pageUrl}*` : '';

        return `![${img.alt || caption}](${img.src})\n*${caption}*${sourceInfo}\n\n`;
      })
      .join('');
  }

  /**
   * Find the most relevant images based on keywords
   * @param images Array of image data
   * @param keywords Keywords to match against captions/alt text
   * @param maxImages Maximum number of images to return
   * @returns Array of most relevant images
   */
  static findRelevantImages(images: ImageData[], keywords: string[], maxImages = 3): ImageData[] {
    if (!images || images.length === 0 || !keywords || keywords.length === 0) {
      return images?.slice(0, maxImages) || [];
    }

    // 过滤掉无效的图片
    const validImages = images.filter(
      (img) =>
        img.src &&
        img.src.startsWith('http') &&
        (img.width === undefined || img.width > 100) &&
        (img.height === undefined || img.height > 100),
    );

    if (validImages.length === 0) {
      return [];
    }

    // 基于关键词匹配为图片评分
    const scoredImages = validImages.map((img) => {
      const text = ((img.caption || '') + ' ' + (img.alt || '')).toLowerCase();
      let score = 0;

      // 匹配关键词
      keywords.forEach((keyword) => {
        if (text.includes(keyword.toLowerCase())) {
          score += 2;
        }
        // 部分匹配也给一些分数
        else if (keyword.length > 4 && text.includes(keyword.substring(0, 4).toLowerCase())) {
          score += 1;
        }
      });

      // 如果有标题或描述，加分
      if (img.caption && img.caption.length > 5) score += 2;
      if (img.alt && img.alt.length > 5) score += 1;

      // 避免完全相同的图片URL
      const uniqueUrlBonus = 1;

      return { ...img, score: score + uniqueUrlBonus + Math.random() * 0.5 }; // 添加一些随机性
    });

    // 按分数排序（最高在前）并返回前N个
    return scoredImages.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, maxImages);
  }

  /**
   * 合并和处理多个来源的内容，消除重复并提取最有价值的信息
   * @param contents 从不同来源获取的内容数组
   * @param maxLength 最终内容的最大长度
   * @returns 合并和优化后的内容
   */
  static mergeContents(contents: string[], maxLength = 10000): string {
    if (!contents || contents.length === 0) {
      return '';
    }

    // 将每个内容分割为段落
    const allParagraphs: { text: string; score: number; source: number }[] = [];

    contents.forEach((content, sourceIndex) => {
      if (!content) return;

      const paragraphs = content
        .split('\n\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 30);

      paragraphs.forEach((p) => {
        // 计算段落分数
        let score = 0;

        // 包含事实性内容的段落
        if (p.match(/\d+%|\d+\.\d+|\(\d+\)|（\d+）/)) score += 3;

        // 引用和来源信息
        if (p.match(/来源|根据|引用|参考|报告|研究|调查|数据显示/)) score += 4;

        // 包含关键项目信息的段落
        if (p.match(/开源项目|GitHub|开发者|贡献者|社区/)) score += 5;

        // 较长的段落通常包含更多信息
        score += Math.min(5, p.length / 100);

        // 添加到段落集合
        allParagraphs.push({
          text: p,
          score,
          source: sourceIndex,
        });
      });
    });

    // 对段落去重 - 使用简单的相似度检测
    const uniqueParagraphs: { text: string; score: number }[] = [];
    const addedFingerprints = new Set<string>();

    allParagraphs.forEach((para) => {
      // 创建段落的简化指纹
      const words = para.text
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const fingerprint = words.slice(0, 10).join(' ');

      // 如果是新的内容，添加到结果中
      if (!addedFingerprints.has(fingerprint)) {
        uniqueParagraphs.push({
          text: para.text,
          score: para.score,
        });
        addedFingerprints.add(fingerprint);
      }
    });

    // 按分数排序
    uniqueParagraphs.sort((a, b) => b.score - a.score);

    // 构建最终内容
    let result = '';
    for (const para of uniqueParagraphs) {
      if ((result + '\n\n' + para.text).length <= maxLength) {
        result += (result ? '\n\n' : '') + para.text;
      } else {
        break;
      }
    }

    return result;
  }
}
