/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';

/**
 * Extended Express app/router with group method
 */
export type ExtendedExpress = (express.Application | express.Router) & {
  group: (
    prefix: string,
    ...handlers: (express.RequestHandler | ((router: express.Router) => void))[]
  ) => void;
};