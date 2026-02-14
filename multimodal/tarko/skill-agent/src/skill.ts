import path from 'path';
import { SkillManager } from './skill-manager';
import { ConfigMarkdown } from './config-markdown';
import type { SkillInfo } from './skill-types';

export class Skill {
  static async all(): Promise<SkillInfo[]> {
    const skills = await SkillManager.loadSkills(false);
    return Object.values(skills).map((skill) => ({
      name: skill.name,
      description: skill.description,
      location: skill.location,
    }));
  }

  static async get(name: string): Promise<SkillInfo | undefined> {
    const skills = await SkillManager.loadSkills(false);
    const skill = skills[name];
    if (!skill) {
      return undefined;
    }
    return {
      name: skill.name,
      description: skill.description,
      location: skill.location,
    };
  }

  static async loadContent(name: string): Promise<string | undefined> {
    const skill = await Skill.get(name);
    if (!skill) {
      return undefined;
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
    return output;
  }
}
