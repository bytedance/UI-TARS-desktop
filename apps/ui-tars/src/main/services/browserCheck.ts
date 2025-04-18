/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { DefaultBrowserOperator } from '@ui-tars/operator-browser';
import { logger } from '@main/logger';
import { store } from '@main/store/create';

/**
 * Check if there is a browser available in the system
 */
export async function checkBrowserAvailability(): Promise<boolean> {
  try {
    logger.info('Checking browser availability...');
    const available = DefaultBrowserOperator.hasBrowser();
    logger.info(`Browser availability: ${available}`);
    store.setState({ browserAvailable: available });
    return available;
  } catch (error) {
    logger.error('Error checking browser availability:', error);
    store.setState({ browserAvailable: false });
    return false;
  }
}
