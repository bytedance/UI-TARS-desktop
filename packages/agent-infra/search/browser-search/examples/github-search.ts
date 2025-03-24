/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger } from '@agent-infra/logger';
import { BrowserSearch } from '../src';

/**
 * We commented github engine temporarily,
 * since it does not work,
 * we'll figure out later.
 */
export async function githubSearch() {
  const logger = new ConsoleLogger('[GitHubSearch]');
  const browserSearch = new BrowserSearch({
    logger,
    browserOptions: {
      headless: false,
    },
  });

  try {
    logger.info('Performing GitHub search');
    const results = await browserSearch.perform({
      query: 'GUI Agent',
      count: 3,
      // @ts-expect-error
      engine: 'github',
    });

    logger.info(`GitHub search found ${results.length} results`);
    logger.info(JSON.stringify(results, null, 2));
    return results;
  } finally {
    await browserSearch.closeBrowser();
  }
}

// Execute when this file is run directly
if (require.main === module) {
  githubSearch().catch(console.error);
}
