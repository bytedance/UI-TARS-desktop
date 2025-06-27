/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger } from '@agent-infra/logger';
import { BrowserSearch } from '../src';

async function browserSearch() {
  const logger = new ConsoleLogger('[BrowserSearch]');
  const browserSearch = new BrowserSearch({
    logger,
    cdpEndpoint: process.env.CDP_ENDPOINT,
  });

  const results = await browserSearch.perform({
    query: 'ui-tars',
    count: 3,
  });

  logger.info('Second search results:', JSON.stringify(results, null, 2));
}

if (require.main === module) {
  browserSearch().catch(console.error);
}
