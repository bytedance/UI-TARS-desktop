/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgent, Tool } from '@tarko/mcp-agent';
import { z } from 'zod';
import { SkillAgentOptions, SkillRegistry } from './skill-types';
import { SkillManager } from './skill-manager';
import { Skill } from './skill';
import { ConfigMarkdown } from './config-markdown';
import path from 'path';

const skillParameters = z.object({
  name: z
    .string()
    .describe(
      'The skill identifier from available_skills (e.g., "code-review" or "category/helper")',
    ),
});

export const SkillTool = new Tool({
  id: 'skill',
  description:
    'Load a skill to get detailed instructions for a specific task. No skills are currently available.',
  parameters: skillParameters,
  function: async (params: z.infer<typeof skillParameters>) => {
    const skills = await Skill.all();

    if (skills.length === 0) {
      throw new Error('No skills are currently available.');
    }

    const skill = await Skill.get(params.name);

    if (!skill) {
      const available = skills.map((s) => s.name).join(', ');
      throw new Error(`Skill "${params.name}" not found. Available skills: ${available || 'none'}`);
    }

    const parsed = await ConfigMarkdown.parse(skill.location);
    const dir = path.dirname(skill.location);

    const output = [
      `## Skill: ${skill.name}`,
      '',
      `**Base directory**: ${dir}`,
      '',
      parsed.content.trim(),
    ].join('\n');

    return {
      title: `Loaded skill: ${skill.name}`,
      output,
      metadata: {
        name: skill.name,
        dir,
      },
    };
  },
});

export class SkillAgent<T extends SkillAgentOptions = SkillAgentOptions> extends MCPAgent<T> {
  static label = '@tarko/skill-agent';
  private skills: SkillRegistry = {};

  constructor(options: T) {
    super(options);
  }

  async initialize(): Promise<void> {
    this.logger.info('🎯 Initializing SkillAgent...');

    if (this.options.skills !== false) {
      const allSkills = await SkillManager.loadSkills(this.options.disableClaudeSkills);
      this.logger.info(`📚 Loaded ${Object.keys(allSkills).length} skills`);

      this.skills = SkillManager.filterSkills(allSkills, this.options.skillFilter);
      this.logger.info(`🔍 Filtered to ${Object.keys(this.skills).length} skills`);

      this.registerSkillTool();

      this.logger.success(`✅ Loaded ${Object.keys(this.skills).length} skills`);
    } else {
      this.logger.info('📚 Skills disabled');
    }

    await super.initialize();
  }

  private registerSkillTool(): void {
    const skillTool = new Tool({
      id: 'skill',
      description: this.buildSkillDescription(),
      parameters: skillParameters,
      function: async (params: z.infer<typeof skillParameters>) => {
        const skill = await Skill.get(params.name);

        if (!skill) {
          const available = await Skill.all().then((x) => x.map((s) => s.name).join(', '));
          throw new Error(
            `Skill "${params.name}" not found. Available skills: ${available || 'none'}`,
          );
        }

        const parsed = await ConfigMarkdown.parse(skill.location);
        const dir = path.dirname(skill.location);

        const output = [
          `## Skill: ${skill.name}`,
          '',
          `**Base directory**: ${dir}`,
          '',
          parsed.content.trim(),
        ].join('\n');

        return {
          title: `Loaded skill: ${skill.name}`,
          output,
          metadata: {
            name: skill.name,
            dir,
          },
        };
      },
    });

    this.registerTool(skillTool);
    this.logger.info('✅ Skill tool registered');
  }

  private buildSkillDescription(): string {
    const skills = Object.values(this.skills);

    if (skills.length === 0) {
      return 'Load a skill to get detailed instructions for a specific task. No skills are currently available.';
    }

    return [
      'Load a skill to get detailed instructions for a specific task.',
      'Skills provide specialized knowledge and step-by-step guidance.',
      "Use this when a task matches an available skill's description.",
      '<available_skills>',
      ...skills.flatMap((skill) => [
        '  <skill>',
        `    <name>${skill.name}</name>`,
        `    <description>${skill.description}</description>`,
        '  </skill>',
      ]),
      '</available_skills>',
    ].join('\n');
  }

  getSkills(): SkillRegistry {
    return this.skills;
  }

  getSkill(name: string): SkillRegistry[string] | undefined {
    return this.skills[name];
  }
}
