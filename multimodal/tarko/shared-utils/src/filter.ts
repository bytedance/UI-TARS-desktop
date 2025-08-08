/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonFilterOptions } from '@tarko/agent-interface';
import { getLogger } from './logger';

const logger = getLogger('Filter');

/**
 * Interface for items that can be filtered by name
 */
export interface FilterableItem {
  name: string;
}

/**
 * Generic filter function that applies include/exclude patterns to items
 *
 * @param items Array of items to filter
 * @param filterOptions Filter configuration with include/exclude patterns
 * @param itemType Type description for logging (e.g., 'tools', 'servers')
 * @returns Filtered array of items
 */
export function filterItems<T extends FilterableItem>(
  items: T[],
  filterOptions?: CommonFilterOptions,
  itemType = 'items',
): T[] {
  if (!filterOptions || (!filterOptions.include && !filterOptions.exclude)) {
    return items;
  }

  const { include, exclude } = filterOptions;
  let filteredItems = items;

  // Apply include filter first (whitelist)
  if (include && include.length > 0) {
    filteredItems = filteredItems.filter((item) => {
      const shouldInclude = include.some((pattern) => item.name.includes(pattern));
      return shouldInclude;
    });

    logger.info(
      `[Filter] Applied include filter with patterns [${include.join(', ')}], ` +
        `${filteredItems.length}/${items.length} ${itemType} matched`,
    );
  }

  // Apply exclude filter second (blacklist)
  if (exclude && exclude.length > 0) {
    const beforeExcludeCount = filteredItems.length;
    filteredItems = filteredItems.filter((item) => {
      const shouldExclude = exclude.some((pattern) => item.name.includes(pattern));
      return !shouldExclude;
    });

    const excludedCount = beforeExcludeCount - filteredItems.length;
    if (excludedCount > 0) {
      logger.info(
        `[Filter] Applied exclude filter with patterns [${exclude.join(', ')}], ` +
          `excluded ${excludedCount} ${itemType}, ${filteredItems.length} ${itemType} remaining`,
      );
    }
  }

  // Log final result if any filtering was applied
  if (filteredItems.length !== items.length) {
    const filteredNames = filteredItems.map((item) => item.name);
    logger.info(
      `[Filter] Final filtered ${itemType} (${filteredItems.length}): [${filteredNames.join(', ')}]`,
    );
  }

  return filteredItems;
}
