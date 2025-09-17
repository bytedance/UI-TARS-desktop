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

    // Create proxy to prepend module name to log messages
    // return new Proxy(rootLogger, {
    //     get(target, prop) {
    //         const logMethods = ['info', 'warn', 'debug', 'error'] as const;
            
    //         if (logMethods.includes(prop as any)) {
    //             return function(message: string, ...args: any[]) {
    //                 const prefixedMessage = `[${module}] ${message}`;
    //                 return (target as any)[prop](prefixedMessage, ...args);
    //             };
    //         }
            
    //         return (target as any)[prop];
    //     }
    // });
    return rootLogger;
}
