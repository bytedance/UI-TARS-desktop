/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger } from '@agent-infra/logger';
import { BrowserSearch } from '../src';

export async function googleSearch() {
  const logger = new ConsoleLogger('[GoogleSearch]');
  const browserSearch = new BrowserSearch({
    logger,
    browserOptions: {
      headless: false,
    },
  });

  try {
    logger.info('Performing Google search');
    const results = await browserSearch.perform({
      query: 'GUI Agent',
      count: 5,
      engine: 'google',
    });

    logger.info(`Google search found ${results.length} results`);
    logger.info(JSON.stringify(results, null, 2));
    return results;
  } finally {
    await browserSearch.closeBrowser();
  }
}

// Execute when this file is run directly
if (require.main === module) {
  googleSearch().catch(console.error);
}
