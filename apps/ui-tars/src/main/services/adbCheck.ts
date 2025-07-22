/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getAndroidDeviceId } from '@ui-tars/operator-adb';
import { logger } from '@main/logger';
import { store } from '@main/store/create';

/**
 * Check if there is an Android device available via ADB
 */
export async function checkAdbAvailability(): Promise<boolean> {
  try {
    logger.info('Checking ADB availability...');
    const deviceId = await getAndroidDeviceId();
    const available = deviceId !== null;
    logger.info(`ADB availability: ${available}`);
    store.setState({ adbAvailable: available });
    return available;
  } catch (error) {
    logger.error('Error checking ADB availability:', error);
    store.setState({ adbAvailable: false });
    return false;
  }
}
