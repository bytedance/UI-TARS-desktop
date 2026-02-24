/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'fs';
import { join, resolve, sep } from 'path';
import { SkillFilterOptions, SkillInfo, SkillRegistry } from './skill-types';
import z from 'zod';

/**
 * Simple filter function to replace @tarko/shared-utils filterItems
 */
function filterItems<T extends Record<string, any>>(items: T, filter?: SkillFilterOptions): T {
  if (!filter) {
    return items;
  }

  const { include, exclude } = filter;
  const filtered: Record<string, any> = {};

  Object.entries(items).forEach(([key, value]) => {
    // Apply include filter if specified
    if (include && include.length > 0) {
      const matchesInclude = include.some((pattern) =>
        key.toLowerCase().includes(pattern.toLowerCase()),
      );
      if (!matchesInclude) {
        return;
      }
    }

    // Apply exclude filter if specified
    if (exclude && exclude.length > 0) {
      const matchesExclude = exclude.some((pattern) =>
        key.toLowerCase().includes(pattern.toLowerCase()),
      );
      if (matchesExclude) {
        return;
      }
    }

    filtered[key] = value;
  });

  return filtered as T;
}

export class SkillManager {
  /**
   * Skill 信息验证模式
   */
  private static readonly SkillInfoSchema = z.object({
    name: z.string(),
    description: z.string(),
    location: z.string(),
  });

  /**
   * Load skills from filesystem
   */
  static async loadSkills(disableClaudeSkills = false): Promise<SkillRegistry> {
    const skills: SkillRegistry = {};

    // 加载 Claude 技能
    if (!disableClaudeSkills) {
      await this.loadClaudeSkills(skills);
    }

    // 加载 Opencode 技能
    await this.loadOpencodeSkills(skills);

    return skills;
  }

  /**
   * 加载 Claude 技能
   */
  private static async loadClaudeSkills(skills: SkillRegistry): Promise<void> {
    try {
      // 扫描项目目录下的 .claude/skills/ 目录
      const currentDir = process.cwd();
      const claudeDir = join(currentDir, '.claude');

      if (await this.isDir(claudeDir)) {
        const skillsDir = join(claudeDir, 'skills');
        if (await this.isDir(skillsDir)) {
          const claudeSkills = await this.scanDirectoryForSkills(skillsDir, false);
          Object.assign(skills, claudeSkills);
        }
      }

      // 扫描全局 ~/.claude/skills/ 目录
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (homeDir) {
        const globalClaudeDir = join(homeDir, '.claude');
        if (await this.isDir(globalClaudeDir)) {
          const globalSkillsDir = join(globalClaudeDir, 'skills');
          if (await this.isDir(globalSkillsDir)) {
            const globalClaudeSkills = await this.scanDirectoryForSkills(globalSkillsDir, false);
            Object.assign(skills, globalClaudeSkills);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading Claude skills: ${error}`);
    }
  }

  /**
   * 加载 Opencode 技能
   */
  private static async loadOpencodeSkills(skills: SkillRegistry): Promise<void> {
    try {
      // 扫描项目目录下的 skill/ 或 skills/ 目录
      const currentDir = process.cwd();
      const skillDirs = ['skill', 'skills'];

      for (const dirName of skillDirs) {
        const skillDir = join(currentDir, dirName);
        if (await this.isDir(skillDir)) {
          const opencodeSkills = await this.scanDirectoryForSkills(skillDir, false);
          Object.assign(skills, opencodeSkills);
        }
      }
    } catch (error) {
      console.error(`Error loading Opencode skills: ${error}`);
    }
  }

  /**
   * 添加技能到注册表
   */
  private static async addSkill(skills: SkillRegistry, filePath: string): Promise<void> {
    try {
      const skillInfo = await this.parseSkillFile(filePath);
      if (skillInfo && skillInfo.name) {
        // 警告重复的技能名称
        if (skills[skillInfo.name]) {
          console.warn(`Duplicate skill name: ${skillInfo.name}`);
          console.warn(`Existing: ${skills[skillInfo.name].location}`);
          console.warn(`Duplicate: ${filePath}`);
        }

        skills[skillInfo.name] = {
          name: skillInfo.name,
          description: skillInfo.description || '',
          location: filePath,
        };
      }
    } catch (error) {
      console.error(`Error adding skill ${filePath}: ${error}`);
    }
  }

  /**
   * Filter skills based on provided filter options
   */
  static filterSkills(skills: SkillRegistry, filter?: SkillFilterOptions): SkillRegistry {
    return filterItems(skills, filter);
  }

  /**
   * Check if a path is a directory
   */
  private static async isDir(path: string): Promise<boolean> {
    try {
      const stats = await fs.stat(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Scan a directory for skills recursively
   */
  private static async scanDirectoryForSkills(
    directory: string,
    disableClaudeSkills: boolean,
  ): Promise<SkillRegistry> {
    const skills: SkillRegistry = {};

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          // Skip Claude skills if disabled
          if (disableClaudeSkills && entry.name.includes('claude')) {
            continue;
          }

          // Recursively scan subdirectories
          const subdirectorySkills = await this.scanDirectoryForSkills(
            fullPath,
            disableClaudeSkills,
          );

          // Merge skills from subdirectory
          Object.assign(skills, subdirectorySkills);
        } else if (entry.isFile() && entry.name === 'SKILL.md') {
          // 使用 addSkill 方法添加技能
          await this.addSkill(skills, fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory for skills: ${error}`);
    }

    return skills;
  }

  /**
   * Parse a skill file to extract skill information
   */
  private static async parseSkillFile(filePath: string): Promise<Partial<SkillInfo> | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---[\s\S]*?---/);
      if (!frontmatterMatch) {
        console.error(`No frontmatter found in skill file: ${filePath}`);
        return null;
      }

      const frontmatter = frontmatterMatch[0];
      const data: Record<string, string> = {};

      // Parse key-value pairs
      const lines = frontmatter
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('---'));

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key) {
          data[key.trim()] = valueParts.join(':').trim();
        }
      }

      // Validate required fields
      if (!data.name) {
        console.error(`Skill name is required in: ${filePath}`);
        return null;
      }

      return {
        name: data.name,
        description: data.description || '',
      };
    } catch (error) {
      console.error(`Error parsing skill file ${filePath}: ${error}`);
      return null;
    }
  }
}
