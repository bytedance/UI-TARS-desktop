/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent Web UI implementation type
 *
 * - `static`: local static directory.
 * - `remote`: remote web ui implementation.
 */
export type AgentWebUIImplementationType = 'static' | 'remote';

/**
 * Navigation item configuration for workspace
 */
export interface WorkspaceNavItem {
  /**
   * Navigation item title displayed on the button
   */
  title: string;
  /**
   * Link URL to open in new tab
   */
  link: string;
}

/**
 * Workspace configuration options
 */
export interface WorkspaceConfig {
  /**
   * Navigation items to display in the workspace header
   */
  navItems?: WorkspaceNavItem[];
}

/**
 * GUI Agent configuration for web UI
 */
export interface TarkoWebUIGUIAgentConfig {
  /**
   * GUI Agent 截图呈现策略
   *
   * - `both`: 同时展示执行前后的截图，便于对比动作效果
   * - `beforeAction`: 展示动作执行前的截图，适用于在 onEachAgentLoopStart 时截图的 Agent（如 Agent-TARS）
   * - `afterAction`: 展示动作执行后的截图，适用于在 onEachAgentLoopEnd 时截图的 Agent（如 Omni-TARS）
   *
   * 注意：鼠标光标（Cursor）只会渲染在 beforeAction 截图上，因为它指示动作将要执行的位置
   *
   * @defaultValue 'afterAction'
   */
  screenshotRenderStrategy: 'both' | 'beforeAction' | 'afterAction';
  /**
   * 是否开启 GUI Agent Action 的渲染
   *
   * 由于 Action 是 GUI Agent 模型基于 beforeActionImage 来输出的，因此
   * 在设计上，GUIAction 只应该渲染在 BeforeActionImage 上。
   * 当设置为 false 时，将隐藏 GUI 操作详情卡片（思考过程、步骤、动作命令等）
   *
   * @defaultValue true
   */
  renderGUIAction: boolean;
}

/**
 * Base agent implementation interface
 */
export interface BaseAgentWebUIImplementation {
  /**
   * Agent implementation type
   *
   * @defaultValue static
   */
  type?: AgentWebUIImplementationType;
  /**
   * Web UI Logo
   *
   * @defaultValue Tarko logo
   */
  logo?: string;
  /**
   * Web UI site title, usually displayed in the upper right corner of the navbar
   * also used in meta.
   *
   * @defaultValue Agent Name
   */
  title?: string;
  /**
   * Web UI Sub title
   *
   * @defaultValue Agent Subtitle, Subtitle, for Home or SEO
   */
  subtitle?: string;
  /**
   * Web UI hero title, usually displayed on the home page, The project's positioning
   * and welcome message, telling people your positioning
   */
  welcomTitle?: string;
  /**
   * Welcome prompts
   */
  welcomePrompts?: string[];
  /**
   * Enable contextual file selector with @ syntax
   * When enabled, users can type @ in the input to search and select workspace files/directories
   *
   * @defaultValue false
   */
  enableContextualSelector?: boolean;
  /**
   * Workspace configuration
   */
  workspace?: WorkspaceConfig;
  /**
   * GUI Agent configuration for web UI
   */
  guiAgent?: TarkoWebUIGUIAgentConfig;
}

/**
 * Static implementation
 */
export interface StaticAgentWebUIImplementation extends BaseAgentWebUIImplementation {
  type?: 'static';
  /**
   * Web UI Static Path, example implementation: `@tarko/web-ui`.
   */
  staticPath: string;
}

/**
 * Remote implementation (TODO)
 */
export interface RemoteAgentWebUIImplementation extends BaseAgentWebUIImplementation {
  type?: 'remote';
}

/**
 * Union type for all agent implementations
 */
export type AgentWebUIImplementation =
  | StaticAgentWebUIImplementation
  | RemoteAgentWebUIImplementation;

/**
 * Utility type to extract implementation by type
 */
export type AgentWebUIImplementationByType<T extends AgentWebUIImplementationType> =
  T extends 'static'
    ? StaticAgentWebUIImplementation
    : T extends 'remote'
      ? RemoteAgentWebUIImplementation
      : never;

/**
 * Type guard to check if implementation is of specific type
 */
export function isAgentWebUIImplementationType<T extends AgentWebUIImplementationType>(
  implementation: AgentWebUIImplementation,
  type: T,
): implementation is AgentWebUIImplementationByType<T> {
  return implementation.type === type;
}
