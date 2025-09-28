/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAgent } from '@tarko/interface';
import { transliterate } from 'transliteration';

/**
 * Response schema for LLM-generated slug
 */
interface SlugResponse {
  /**
   * Generated slug containing 3-5 words separated by hyphens
   */
  slug: string;
}

/**
 * SlugGenerator - Intelligent slug generation using LLM JSON mode
 *
 * This class provides AI-powered slug generation that can handle multilingual content
 * and produce semantic, URL-friendly slugs. It uses the LLM's JSON mode to ensure
 * structured output and proper formatting.
 *
 * Key features:
 * - Multilingual support (Chinese, English, etc.)
 * - Semantic understanding of content
 * - Consistent 3-5 word length
 * - URL-safe formatting
 * - Internal fallback to manual normalization if LLM fails
 */
export class SlugGenerator {
  constructor(private agent: IAgent) {}

  /**
   * Generate a semantic slug from user message
   * Handles all normalization logic internally, no external fallback needed
   *
   * @param userMessage The original user message to generate slug from
   * @returns Promise resolving to a normalized slug string
   */
  async generateSlug(userMessage: string): Promise<string> {
    if (!userMessage.trim()) {
      return this.getDefaultSlug();
    }

    try {
      // Try LLM-powered generation first
      const llmSlug = await this.generateWithLLM(userMessage);
      if (llmSlug) {
        return llmSlug;
      }
    } catch (error) {
      console.error('[SlugGenerator] LLM slug generation failed:', error);
    }

    // Fallback to manual normalization
    return this.manualNormalization(userMessage);
  }

  /**
   * Generate slug using LLM JSON mode
   */
  private async generateWithLLM(userMessage: string): Promise<string | null> {
    try {
      const response = await this.agent.callLLM({
        messages: [
          {
            role: 'system',
            content: `You are a URL slug generator. Generate a semantic, URL-friendly slug from the given text.

Requirements:
- Use 3-5 words separated by hyphens
- Use only lowercase English words
- No special characters except hyphens
- Capture the main topic/intent of the text
- Handle multilingual input (Chinese, English, etc.)
- NEVER include non-ASCII characters like Chinese in the output

Return only a JSON object with a "slug" field.`,
          },
          {
            role: 'user',
            content: `Generate a slug for: "${userMessage}"`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 100,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return null;
      }

      try {
        const parsed = JSON.parse(content) as SlugResponse;
        // Apply manual normalization to ensure LLM output is also sanitized
        return this.manualNormalization(parsed.slug);
      } catch (error) {
        console.error('[SlugGenerator] Failed to parse LLM response:', error);
        return null;
      }
    } catch (error) {
      console.error('[SlugGenerator] LLM call failed:', error);
      throw error; // Re-throw to be caught by the caller
    }
  }

  /**
   * Manual normalization - the consolidated logic from all places
   */
  private manualNormalization(text: string): string {
    // Enhanced normalization to handle Chinese and other non-ASCII characters better
    let normalized = text.toLowerCase();

    // First, try to extract meaningful English words if any exist
    const englishWords = normalized.match(/[a-z0-9]+/g) || [];

    if (englishWords.length > 0) {
      // Use English words if available
      normalized = englishWords.join('-');
    } else {
      // Try transliteration for non-English text
      const transliterated = this.simpleTransliterate(text);
      if (transliterated && transliterated.length > 0) {
        return transliterated; // simpleTransliterate already handles all cleanup
      } else {
        // For non-translatable text, create a semantic fallback
        if (/[\u4e00-\u9fff]/.test(text)) {
          normalized = 'chinese-query';
        } else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
          normalized = 'japanese-query';
        } else if (/[\u0400-\u04ff]/.test(text)) {
          normalized = 'cyrillic-query';
        } else {
          normalized = 'international-query';
        }
      }
    }

    // Apply final cleanup (only for English words and language fallbacks)
    normalized = normalized
      .replace(/[^\w\s-]/g, '') // Remove remaining special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove consecutive hyphens
      .substring(0, 60) // Limit length
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    if (!normalized || normalized.length === 0) {
      return this.getDefaultSlug();
    }

    // Take first few words if too long
    const words = normalized.split('-').filter((word) => word.length > 0);
    return words.slice(0, 4).join('-') || this.getDefaultSlug();
  }

  /**
   * Transliterate non-ASCII characters using transliteration library
   */
  private simpleTransliterate(text: string): string {
    try {
      // Use transliteration library for proper conversion
      const transliterated = transliterate(text, {
        unknown: '', // Remove unknown characters
        replace: {
          // Common technical terms mapping
          代码: 'code',
          文件: 'file',
          下载: 'download',
          生成: 'generate',
          创建: 'create',
          删除: 'delete',
          修改: 'modify',
          查找: 'search',
          分析: 'analyze',
          处理: 'process',
          转换: 'convert',
          打开: 'open',
          关闭: 'close',
          保存: 'save',
          读取: 'read',
          运行: 'run',
          执行: 'execute',
          测试: 'test',
          调试: 'debug',
          安装: 'install',
          配置: 'config',
          设置: 'setup',
          帮助: 'help',
        },
      });

      // Clean up and normalize
      const result = transliterated
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ') // Replace non-alphanumeric with spaces
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Remove consecutive hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 60); // Limit length

      return result;
    } catch (error) {
      console.error('[SlugGenerator] Transliteration failed:', error);
      return '';
    }
  }

  /**
   * Get default slug when all else fails
   */
  private getDefaultSlug(): string {
    return 'untitled-session';
  }
}
