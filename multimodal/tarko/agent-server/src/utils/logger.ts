/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLogger } from '@tarko/shared-utils';

// Create module-specific loggers for different components
export const agentSessionLogger = getLogger('agent-session');
export const socketHandlerLogger = getLogger('socket-handler');
export const storageLogger = getLogger('storage');
export const apiLogger = getLogger('api');
export const serverLogger = getLogger('server');
export const serviceLogger = getLogger('service');
export const utilsLogger = getLogger('utils');
