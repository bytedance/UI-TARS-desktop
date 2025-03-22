/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import permissions from '@computer-use/node-mac-permissions';
import { logger } from './logger';

let hasAccessibilityPermission = false;

const wrapWithWarning =
  (message, nativeFunction) =>
  (...args) => {
    logger.warn(message);
    return nativeFunction(...args);
  };

const askForAccessibility = (nativeFunction, functionName) => {
  const accessibilityStatus = permissions.getAuthStatus('accessibility');
  logger.info('[accessibilityStatus]', accessibilityStatus);

  if (accessibilityStatus === 'authorized') {
    hasAccessibilityPermission = true;
    return nativeFunction;
  } else if (
    accessibilityStatus === 'not determined' ||
    accessibilityStatus === 'denied'
  ) {
    hasAccessibilityPermission = false;
    permissions.askForAccessibilityAccess();
    return wrapWithWarning(
      `##### WARNING! The application running this script tries to access accessibility features to execute ${functionName}! Please grant requested access for further information. #####`,
      nativeFunction,
    );
  }
};

export const ensurePermissions = (): {
  accessibility: boolean;
} => {
  if (process.env.CI === 'e2e') {
    return {
      accessibility: true,
    };
  }

  askForAccessibility(() => {}, 'execute accessibility');

  logger.info('hasAccessibilityPermission', hasAccessibilityPermission);

  return {
    accessibility: hasAccessibilityPermission,
  };
};
