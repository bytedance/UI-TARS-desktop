/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, AgentToolFilterOptions } from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';

const logger = getLogger('ToolFilter');

/**
 * Filter tools based on include/exclude patterns
 * 
 * @param tools Array of tools to filter
 * @param filterOptions Filter configuration with include/exclude patterns
 * @returns Filtered array of tools
 */
export function filterTools(tools: Tool[], filterOptions?: AgentToolFilterOptions): Tool[] {
  if (!filterOptions || (!filterOptions.include && !filterOptions.exclude)) {
    return tools;
  }

  const { include, exclude } = filterOptions;
  let filteredTools = tools;

  // Apply include filter first (whitelist)
  if (include && include.length > 0) {
    filteredTools = filteredTools.filter((tool) => {
      const shouldInclude = include.some((pattern) => tool.name.includes(pattern));
      return shouldInclude;
    });

    logger.info(
      `[Tool Filter] Applied include filter with patterns [${include.join(', ')}], ` +
      `${filteredTools.length}/${tools.length} tools matched`
    );
  }

  // Apply exclude filter second (blacklist)
  if (exclude && exclude.length > 0) {
    const beforeExcludeCount = filteredTools.length;
    filteredTools = filteredTools.filter((tool) => {
      const shouldExclude = exclude.some((pattern) => tool.name.includes(pattern));
      return !shouldExclude;
    });

    const excludedCount = beforeExcludeCount - filteredTools.length;
    if (excludedCount > 0) {
      logger.info(
        `[Tool Filter] Applied exclude filter with patterns [${exclude.join(', ')}], ` +
        `excluded ${excludedCount} tools, ${filteredTools.length} tools remaining`
      );
    }
  }

  // Log final result if any filtering was applied
  if (filteredTools.length !== tools.length) {
    const filteredNames = filteredTools.map(tool => tool.name);
    logger.info(
      `[Tool Filter] Final filtered tools (${filteredTools.length}): [${filteredNames.join(', ')}]`
    );
  }

  return filteredTools;
}
