/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgentOptions } from '@tarko/mcp-agent-interface';

export interface SkillInfo {
  name: string;
  description: string;
  location: string;
}

export interface SkillFilterOptions {
  include?: string[];
  exclude?: string[];
}

export type SkillRegistry = Record<string, SkillInfo>;

export interface SkillAgentOptions extends MCPAgentOptions {
  disableClaudeSkills?: boolean;
  skillFilter?: SkillFilterOptions;
  skills?: boolean;
}
