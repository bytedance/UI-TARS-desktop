/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAgent } from '@agent-tars/interface';

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
      console.warn('LLM slug generation failed, using manual normalization:', error);
    }

    // Fallback to manual normalization
    return this.manualNormalization(userMessage);
  }

  /**
   * Generate slug using LLM JSON mode
   */
  private async generateWithLLM(userMessage: string): Promise<string | null> {
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
      console.error('Failed to parse LLM slug response:', error);
      return null;
    }
  }

  /**
   * Manual normalization - the consolidated logic from all places
   */
  private manualNormalization(text: string): string {
    // First, attempt to transliterate non-ASCII characters
    // Then apply standard normalization
    const normalized = text
      .toLowerCase()
      // First, remove all non-ASCII characters completely
      .replace(/[^\x00-\x7F]+/g, '-')
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
   * Get default slug when all else fails
   */
  private getDefaultSlug(): string {
    return 'untitled-session';
  }
}
