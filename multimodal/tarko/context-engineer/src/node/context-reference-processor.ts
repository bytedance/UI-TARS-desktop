/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import type { ChatCompletionContentPart } from '@tarko/agent-interface';
import { WorkspacePack } from './workspace-pack';

/**
 * ContextReferenceProcessor - Processes contextual references in agent queries
 *
 * Features:
 * - Expands @file: references to actual file content
 * - Expands @dir: references to directory structure and content
 * - Security validation to prevent path traversal
 * - High-performance workspace packing
 */
export class ContextReferenceProcessor {
  private workspacePack: WorkspacePack;

  constructor(
    options: {
      maxFileSize?: number;
      ignoreExtensions?: string[];
      ignoreDirs?: string[];
      maxDepth?: number;
    } = {},
  ) {
    this.workspacePack = new WorkspacePack({
      maxFileSize: options.maxFileSize ?? 2 * 1024 * 1024, // 2MB limit for LLM context
      ignoreExtensions: options.ignoreExtensions ?? [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.svg',
        '.pdf',
        '.zip',
        '.tar',
        '.gz',
        '.exe',
        '.dll',
      ],
      ignoreDirs: options.ignoreDirs ?? [
        'node_modules',
        '.git',
        '.next',
        'dist',
        'build',
        'coverage',
        '.vscode',
        '.idea',
      ],
      maxDepth: options.maxDepth ?? 8,
    });
  }

  /**
   * Process contextual references in query content
   * Expands @file: and @dir: references to actual content
   * @param query - The query content that may contain contextual references
   * @param workspacePath - Base workspace path for security validation and path resolution
   * @returns Processed query with expanded contextual content
   */
  async processContextualReferences(
    query: string | ChatCompletionContentPart[],
    workspacePath: string,
  ): Promise<string | ChatCompletionContentPart[]> {
    // Only process string queries for now
    if (typeof query !== 'string') {
      return query;
    }

    // Find all contextual references
    const contextualReferencePattern = /@(file|dir):([^\s]+)/g;
    const matches = Array.from(query.matchAll(contextualReferencePattern));

    if (matches.length === 0) {
      return query;
    }

    // Separate file and directory references
    const fileReferences: string[] = [];
    const dirReferences: string[] = [];

    for (const match of matches) {
      const [, type, relativePath] = match;
      if (type === 'file') {
        fileReferences.push(relativePath);
      } else if (type === 'dir') {
        dirReferences.push(relativePath);
      }
    }

    let processedQuery = query;

    // Process directory references with high-performance packing
    if (dirReferences.length > 0) {
      try {
        // Convert relative paths to absolute paths
        const absoluteDirPaths = dirReferences
          .map((dirRef) => {
            const absolutePath = path.resolve(workspacePath, dirRef);

            // Security check: ensure path is within workspace
            const normalizedWorkspace = path.resolve(workspacePath);
            const normalizedTarget = path.resolve(absolutePath);

            if (!normalizedTarget.startsWith(normalizedWorkspace)) {
              console.warn(`Directory reference outside workspace: ${dirRef}`);
              return null;
            }

            return absolutePath;
          })
          .filter((p): p is string => p !== null);

        if (absoluteDirPaths.length > 0) {
          const packResult = await this.workspacePack.packPaths(absoluteDirPaths);

          // Replace all @dir: references with the packed content
          for (const dirRef of dirReferences) {
            const pattern = new RegExp(
              `@dir:${dirRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
              'g',
            );
            processedQuery = processedQuery.replace(pattern, `\n\n${packResult.packedContent}\n\n`);
          }

          // Log packing statistics
          console.log('Workspace packing completed:', {
            paths: packResult.processedPaths.length,
            files: packResult.stats.totalFiles,
            totalSize: packResult.stats.totalSize,
            errors: packResult.stats.errorCount,
          });
        }
      } catch (error) {
        console.error('Failed to pack workspace paths:', error);

        // Fallback to error message for failed packing
        for (const dirRef of dirReferences) {
          const pattern = new RegExp(`@dir:${dirRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
          processedQuery = processedQuery.replace(
            pattern,
            `\n\n=== Error packing directory: ${dirRef} ===\n`,
          );
        }
      }
    }

    // Process individual file references
    for (const fileRef of fileReferences) {
      try {
        const absolutePath = path.resolve(workspacePath, fileRef);

        // Security check: ensure path is within workspace
        const normalizedWorkspace = path.resolve(workspacePath);
        const normalizedTarget = path.resolve(absolutePath);

        if (!normalizedTarget.startsWith(normalizedWorkspace)) {
          console.warn(`File reference outside workspace: ${fileRef}`);
          continue;
        }

        if (!fs.existsSync(absolutePath)) {
          console.warn(`File reference not found: ${fileRef}`);
          continue;
        }

        const stats = fs.statSync(absolutePath);
        if (stats.isFile()) {
          try {
            const fileContent = fs.readFileSync(absolutePath, 'utf8');
            const expandedContent = `\n\n=== File: ${fileRef} ===\n${fileContent}\n=== End of File ===\n`;

            const pattern = new RegExp(
              `@file:${fileRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
              'g',
            );
            processedQuery = processedQuery.replace(pattern, expandedContent);
          } catch (error) {
            console.error(`Failed to read file ${fileRef}:`, error);
            const pattern = new RegExp(
              `@file:${fileRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
              'g',
            );
            processedQuery = processedQuery.replace(
              pattern,
              `\n\n=== Error reading file: ${fileRef} ===\n`,
            );
          }
        }
      } catch (error) {
        console.error(`Failed to process file reference ${fileRef}:`, error);
      }
    }

    return processedQuery;
  }
}
