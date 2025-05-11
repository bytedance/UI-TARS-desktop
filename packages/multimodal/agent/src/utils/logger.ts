/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

// 创建根日志记录器
const rootLogger = new ConsoleLogger('[Agent]');

// 根据环境变量设置日志级别
if (process.env.NODE_ENV === 'production') {
  rootLogger.setLevel(LogLevel.WARN);
} else if (process.env.AGENT_DEBUG) {
  rootLogger.setLevel(LogLevel.DEBUG);
} else {
  rootLogger.setLevel(LogLevel.INFO);
}

/**
 * 创建并获取模块特定的日志记录器
 * @param module 模块名称，将作为日志前缀
 * @returns 特定于该模块的日志记录器实例
 */
export function getLogger(module: string) {
  return rootLogger.spawn(module);
}

// 导出主要日志级别给消费者使用
export { LogLevel };
