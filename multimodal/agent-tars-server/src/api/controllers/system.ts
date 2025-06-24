/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { AgentTARSServer } from '../../server';

/**
 * Health check endpoint
 */
export function healthCheck(req: Request, res: Response) {
  res.status(200).json({ status: 'ok' });
}
