/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MiddlewareFunction } from 'mcp-http-server';
import { AsyncLocalStorage } from 'async_hooks';
import type { RequestContext } from 'mcp-http-server';

const requestContext = new AsyncLocalStorage<RequestContext>();

export const setRequestContext = (context: RequestContext) => {
  requestContext.enterWith(context);
};

export const getRequestContext = (): RequestContext | undefined => {
  return requestContext.getStore();
};

// @deprecated: use addMiddleware instead
export const onBeforeStart = () => {};

const middlewares: MiddlewareFunction[] = [];
export const addMiddleware = (middleware: MiddlewareFunction) => {
  middlewares.push(middleware);
};
export const getMiddlewares = () => {
  return middlewares;
};

export { setConfig } from './server.js';
export { BaseLogger } from '@agent-infra/logger';
