/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemPromptTemplate, ACTION_SPACE_PLACEHOLDER } from '../types/agents';
import { SupportedActionType } from '../types/actions';

/**
 * Assemble system prompt template by replacing placeholders with actual values
 * @param template - The system prompt template configuration
 * @param supportedActions - Array of supported action types
 * @returns Assembled system prompt string with placeholders replaced
 */
export function assembleSystemPrompt(
  template: SystemPromptTemplate,
  supportedActions: SupportedActionType[],
): string {
  let assembledPrompt = template.template;

  // Replace action space placeholder if actionsToString function is provided
  if (template.actionsToString) {
    const actionSpacePlaceholder = `{{${ACTION_SPACE_PLACEHOLDER}}}`;
    const realActionSpaces = template.actionsToString(supportedActions);
    assembledPrompt = assembledPrompt.replace(actionSpacePlaceholder, realActionSpaces || '');
  }

  // Handle other custom placeholders replacement
  if (template.placeholders) {
    Object.entries(template.placeholders).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      assembledPrompt = assembledPrompt.replace(new RegExp(placeholder, 'g'), String(value));
    });
  }

  return assembledPrompt;
}

/**
 * Type guard to check if a system prompt is a template object
 * @param systemPrompt - The system prompt to check
 * @returns Whether the system prompt is a SystemPromptTemplate
 */
export function isSystemPromptTemplate(
  systemPrompt: string | SystemPromptTemplate,
): systemPrompt is SystemPromptTemplate {
  return typeof systemPrompt === 'object' && 'template' in systemPrompt;
}
