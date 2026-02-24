/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentOptions, CommonFilterOptions } from '@tarko/agent-interface';

// FIXME: remove enum-based logger
export { LogLevel } from '@tarko/agent-interface';
export type * from '@tarko/agent-interface';

/**
 * Skill 过滤选项
 */
export interface SkillFilterOptions extends CommonFilterOptions {}

/**
 * Skill Agent 选项
 */
export interface SkillAgentOptions extends AgentOptions {
  /**
   * Agent 描述
   */
  description?: string;

  /**
   * Skill 目录配置
   */
  skillDirectories?: string[];

  /**
   * Skill 过滤选项
   */
  skillFilter?: SkillFilterOptions;

  /**
   * 是否禁用 Claude 技能
   * @defaultValue false
   */
  disableClaudeSkills?: boolean;
}

/**
 * Skill 信息
 */
export interface SkillInfo {
  name: string;
  description: string;
  location: string;
}

/**
 * Skill 注册中心
 */
export interface SkillRegistry {
  [skillName: string]: SkillInfo;
}
