/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ConsoleLogger, LogLevel } from '@tarko/shared-utils';
import type { ILogger } from '../types';

let rootLogger: ILogger = new ConsoleLogger();

rootLogger?.setLevel && rootLogger.setLevel(process.env.AGENT_DEBUG ? LogLevel.DEBUG : LogLevel.INFO);

/**
 * Initialize the root logger with a custom logger instance
 * This should be called by AgentServer
 */
export function resetLogger(logger: ILogger): void {
    rootLogger = logger;
}

export function getLogger(module: string): ILogger {
    if ('spawn' in rootLogger && typeof rootLogger.spawn === 'function') {
        return rootLogger.spawn(module);
    }

    return rootLogger;
}
