/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AsyncLocalStorage } from 'async_hooks';
import type { RequestContext } from 'mcp-http-server';

const requestContext = new AsyncLocalStorage<RequestContext>();

export const setRequestContext = (context: RequestContext) => {
  requestContext.enterWith(context);
};

export const getRequestContext = (): RequestContext | undefined => {
  return requestContext.getStore();
};
