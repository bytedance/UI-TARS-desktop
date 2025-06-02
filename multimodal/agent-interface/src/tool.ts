/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, JSONSchema7 } from '@multimodal/model-provider/types';

// Generic type for tool parameters
export type ToolParameters = Record<string, any>;

export type ToolDefinition = {
  name: string;
  description: string;
  schema: z.ZodObject<any> | JSONSchema7;
  function: (args: any) => Promise<any>;
  hasZodSchema?: () => boolean;
  hasJsonSchema?: () => boolean;
};
