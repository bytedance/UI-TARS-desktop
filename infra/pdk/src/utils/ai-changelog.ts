import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execa } from 'execa';
import { logger } from './logger';
import { shouldIncludeCommitByScope } from './commit';
import { AgentModel } from '@tarko/model-provider';

interface CommitEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
  body?: string;
  prNumber?: string;
}

interface ChangelogSection {
  type: string;
  title: string;
  commits: {
    message: string;
    hash: string;
    prNumber?: string;
  }[];
}

interface ChangelogData {
  version: string;
  date: string;
  compareLink: string;
  sections: ChangelogSection[];
  summary?: string;
}

/**
 * AI-powered changelog generator
 * Uses LLM to analyze git commits and generate a structured changelog
 */
export class AIChangelogGenerator {
  private cwd: string;
  private tagPrefix: string;
  private model: Partial<AgentModel>;

  constructor(cwd: string, tagPrefix = 'v', model: Partial<AgentModel> = {}) {
    this.cwd = cwd;
    this.tagPrefix = tagPrefix;
    this.model = model;
  }

  /**
   * Retrieves git commits between two tags
   */
  private async getCommitsBetweenTags(
    fromTag?: string,
    toTag = 'HEAD',
    filterScopes?: string[],
  ): Promise<CommitEntry[]> {
    try {
      const range = fromTag ? `${fromTag}..${toTag}` : toTag;
      let gitArgs = [
        'log',
        range,
        '--pretty=format:%H|%an|%ad|%s|%b',
        '--date=short',
      ];

      try {
        await execa('git', ['rev-parse', fromTag || toTag], { cwd: this.cwd });
      } catch {
        logger.warn(
          `Tag ${fromTag || toTag} not found. Falling back to recent commits.`,
        );
        gitArgs = [
          'log',
          '--max-count=100',
          '--pretty=format:%H|%an|%ad|%s|%b',
          '--date=short',
        ];
      }

      const { stdout } = await execa('git', gitArgs, { cwd: this.cwd });

      if (!stdout.trim()) {
        return [];
      }

      const commits = stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, date, message, ...bodyParts] = line.split('|');
          const body = bodyParts.join('|').trim();

          const prMatch = `${message}\n${body}`.match(/#(\d+)/);
          const prNumber = prMatch ? prMatch[1] : undefined;

          return {
            hash,
            author,
            date,
            message,
            prNumber,
          };
        });

      // Apply scope filter if provided
      if (filterScopes && filterScopes.length > 0) {
        return commits.filter((commit) =>
          shouldIncludeCommitByScope(commit.message, filterScopes),
        );
      }

      return commits;
    } catch (error) {
      logger.error(`Failed to get commits: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Gets the repository URL for generating comparison links
   */
  private async getRepoUrl(): Promise<string> {
    try {
      const { stdout } = await execa(
        'git',
        ['config', '--get', 'remote.origin.url'],
        { cwd: this.cwd },
      );

      return stdout
        .trim()
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\.git$/, '');
    } catch {
      return '';
    }
  }

  /**
   * Generates a comparison URL between two versions
   */
  private async getCompareLink(
    fromTag?: string,
    toTag?: string,
  ): Promise<string> {
    const repoUrl = await this.getRepoUrl();
    if (!repoUrl || !fromTag) return '';
    return `${repoUrl}/compare/${fromTag}...${toTag || 'HEAD'}`;
  }

  /**
   * Uses LLM to analyze commits and generate structured changelog
   */
  private async generateChangelogWithAI(
    commits: CommitEntry[],
    version: string,
    fromTag?: string,
    toTag?: string,
  ): Promise<ChangelogData> {
    if (commits.length === 0) {
      return {
        version,
        date: new Date().toISOString().split('T')[0],
        compareLink: await this.getCompareLink(fromTag, toTag),
        sections: [],
      };
    }

    const { createLLMClient } = await import('@tarko/model-provider');
    const llm = createLLMClient(this.model as AgentModel);

    const { buildChangelogPrompt } = await import('./prompts');
    const prompt = buildChangelogPrompt(
      commits.map(({ hash, author, date, message, prNumber }) => ({
        hash,
        author,
        date,
        message,
        prNumber,
      })),
    );

    const response = await llm.chat.completions.create({
      model: this.model.id,
      messages: [
        {
          role: 'system',
          content:
            'You are a changelog generator that produces structured JSON output.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Failed to generate changelog: Empty response from LLM');
    }

    try {
      const result = JSON.parse(content);
      return {
        version,
        date: new Date().toISOString().split('T')[0],
        compareLink: await this.getCompareLink(fromTag, toTag),
        sections: result.sections || [],
        summary: result.summary,
      };
    } catch (error) {
      logger.error(`Failed to parse LLM response: ${(error as Error).message}`);
      throw new Error('Failed to generate changelog: Invalid JSON response');
    }
  }

  /**
   * Formats changelog data into Markdown
   */
  private async formatChangelogMarkdown(data: ChangelogData): Promise<string> {
    const { version, date, compareLink, sections, summary } = data;
    const repoUrl = await this.getRepoUrl();

    let markdown = `## [${version}](${compareLink}) (${date})\n\n`;

    if (summary) {
      markdown += `${summary}\n\n`;
    }

    for (const section of sections) {
      markdown += `### ${section.title}\n\n`;

      for (const commit of section.commits) {
        let commitText = `* ${commit.message}`;
        if (commit.prNumber) {
          commitText += ` ([#${commit.prNumber}](${repoUrl}/pull/${commit.prNumber}))`;
        }
        commitText += ` ([${commit.hash.substring(0, 7)}](${repoUrl}/commit/${commit.hash}))`;
        markdown += `${commitText}\n`;
      }

      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Generates changelog for a specific version
   */
  public async generate(
    version: string,
    previousTag?: string,
    filterScopes?: string[],
  ): Promise<string> {
    const currentTag = `${this.tagPrefix}${version}`;

    if (!previousTag) {
      try {
        const { stdout } = await execa(
          'git',
          ['describe', '--tags', '--abbrev=0', `${currentTag}^`],
          { cwd: this.cwd },
        );
        previousTag = stdout.trim();
      } catch {
        previousTag = undefined;
      }
    }

    logger.info(
      `Generating changelog from ${previousTag || 'initial commit'} to ${currentTag}`,
    );

    const commits = await this.getCommitsBetweenTags(
      previousTag,
      currentTag,
      filterScopes,
    );
    const changelogData = await this.generateChangelogWithAI(
      commits,
      version,
      previousTag,
      currentTag,
    );

    return await this.formatChangelogMarkdown(changelogData);
  }

  /**
   * Updates existing changelog file with new content
   */
  public async updateChangelogFile(
    version: string,
    newContent: string,
    changelogPath: string,
  ): Promise<void> {
    let existingContent = '';
    if (existsSync(changelogPath)) {
      existingContent = readFileSync(changelogPath, 'utf-8');
    }

    let updatedContent = `# Changelog\n\n${newContent}`;

    if (existingContent) {
      const headerMatch = existingContent.match(/^# Changelog\n\n/);
      if (headerMatch) {
        updatedContent = existingContent.replace(
          headerMatch[0],
          `# Changelog\n\n${newContent}\n`,
        );
      } else {
        updatedContent = `# Changelog\n\n${newContent}\n\n${existingContent}`;
      }
    }

    writeFileSync(changelogPath, updatedContent, 'utf-8');
    logger.success(`Updated changelog for version ${version}`);
  }
}
