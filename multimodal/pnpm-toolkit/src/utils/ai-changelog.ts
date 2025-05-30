import { join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { execa } from 'execa';
import { logger } from './logger';

// Types for AI-generated changelog
interface CommitEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
  body?: string;
  prNumber?: string;
  prLink?: string;
}

interface ChangelogSection {
  type: string;
  title: string;
  commits: {
    message: string;
    hash: string;
    link?: string;
    prNumber?: string;
    prLink?: string;
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
  private modelOptions: {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseURL?: string;
  };

  constructor(
    cwd: string,
    tagPrefix: string = 'v',
    modelOptions: { provider?: string; model?: string; apiKey?: string; baseURL?: string } = {},
  ) {
    this.cwd = cwd;
    this.tagPrefix = tagPrefix;
    this.modelOptions = modelOptions;
  }

  /**
   * Retrieves git commits between two tags
   */
  private async getCommitsBetweenTags(fromTag?: string, toTag = 'HEAD'): Promise<CommitEntry[]> {
    try {
      let range = fromTag ? `${fromTag}..${toTag}` : toTag;
      let gitArgs = ['log', range, '--pretty=format:%H|%an|%ad|%s|%b', '--date=short'];

      try {
        // 尝试执行 git 命令
        await execa('git', ['rev-parse', fromTag || toTag], { cwd: this.cwd });
      } catch (error) {
        // 如果 tag 不存在，则获取最近 100 条与 tagPrefix 相关的提交
        logger.warn(`Tag ${fromTag || toTag} not found. Falling back to recent commits.`);

        // 修改为获取最近 100 条提交
        gitArgs = ['log', '--max-count=100', '--pretty=format:%H|%an|%ad|%s|%b', '--date=short'];

        // 如果有 tagPrefix，尝试过滤与前缀相关的提交
        if (this.tagPrefix) {
          logger.info(`Looking for commits related to tag prefix: ${this.tagPrefix}`);
        }
      }

      const { stdout } = await execa('git', gitArgs, { cwd: this.cwd });

      if (!stdout.trim()) {
        return [];
      }

      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, date, message, ...bodyParts] = line.split('|');
          const body = bodyParts.join('|').trim();

          // Extract PR number if available (e.g., "#123")
          const prMatch = message.match(/#(\d+)/);
          const prNumber = prMatch ? prMatch[1] : undefined;

          return {
            hash,
            author,
            date,
            message,
            body,
            prNumber,
            prLink: prNumber ? `https://github.com/user/repo/pull/${prNumber}` : undefined,
          };
        });
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
      const { stdout } = await execa('git', ['config', '--get', 'remote.origin.url'], {
        cwd: this.cwd,
      });

      // Convert SSH URL to HTTPS URL if needed
      return stdout
        .trim()
        .replace(/^git@github\.com:/, 'https://github.com/')
        .replace(/\.git$/, '');
    } catch (error) {
      return '';
    }
  }

  /**
   * Generates a comparison URL between two versions
   */
  private async getCompareLink(fromTag?: string, toTag?: string): Promise<string> {
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
    // If no commits, return an empty changelog
    if (commits.length === 0) {
      return {
        version,
        date: new Date().toISOString().split('T')[0],
        compareLink: await this.getCompareLink(fromTag, toTag),
        sections: [],
      };
    }

    const { createLLMClient, ModelResolver } = await import('@multimodal/model-provider');

    // Set up LLM client
    const resolver = new ModelResolver({
      providers: [
        {
          // @ts-expect-error
          name: this.modelOptions.provider,
          models: [],
          baseURL: this.modelOptions.baseURL,
          apiKey: this.modelOptions.apiKey,
        },
      ],
      use: {
        // @ts-expect-error
        provider: this.modelOptions.provider,
        model: this.modelOptions.model,
      },
    });

    const resolvedModel = resolver.resolve();
    const llm = createLLMClient(resolvedModel);

    // Prepare prompt for LLM
    const prompt = `Analyze these git commits and generate a structured changelog:

${JSON.stringify(commits, null, 2)}

Group similar commits into sections (e.g., Features, Bug Fixes, etc.).
If there are major architectural changes or breaking changes, highlight them in a summary.
Provide a concise, professional changelog in JSON format with the following structure:
{
  "sections": [
    {
      "type": "feat", // One of: feat, fix, docs, chore, refactor, perf, etc.
      "title": "Features",
      "commits": [
        {
          "message": "Clear description of the change",
          "hash": "commit hash",
          "prNumber": "PR number if available",
          "prLink": "PR link if available"
        }
      ]
    }
  ],
  "summary": "Optional overall summary for significant releases"
}`;

    // Call LLM with JSON mode
    const response = await llm.chat.completions.create({
      model: resolvedModel.model,
      messages: [
        {
          role: 'system',
          content: 'You are a changelog generator that produces structured JSON output.',
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

      // Compose final changelog data
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
  private formatChangelogMarkdown(data: ChangelogData): string {
    const { version, date, compareLink, sections, summary } = data;

    let markdown = `## [${version}](${compareLink}) (${date})\n\n`;

    if (summary) {
      markdown += `${summary}\n\n`;
    }

    for (const section of sections) {
      markdown += `### ${section.title}\n\n`;

      for (const commit of section.commits) {
        let commitText = `* ${commit.message}`;

        // Add PR reference if available
        if (commit.prNumber) {
          commitText += ` ([#${commit.prNumber}](${commit.prLink}))`;
        }

        // Add commit hash reference
        commitText += ` ([${commit.hash.substring(0, 7)}](${this.getRepoUrl()}/commit/${commit.hash}))`;

        markdown += `${commitText}\n`;
      }

      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Generates changelog for a specific version
   */
  public async generate(version: string, previousTag?: string): Promise<string> {
    const currentTag = `${this.tagPrefix}${version}`;

    // If previous tag not specified, try to find it
    if (!previousTag) {
      try {
        const { stdout } = await execa(
          'git',
          ['describe', '--tags', '--abbrev=0', `${currentTag}^`],
          { cwd: this.cwd },
        );
        previousTag = stdout.trim();
      } catch (error) {
        // If no previous tag, use the first commit
        previousTag = undefined;
      }
    }

    logger.info(`Generating changelog from ${previousTag || 'initial commit'} to ${currentTag}`);

    // Get commits between tags
    const commits = await this.getCommitsBetweenTags(previousTag, currentTag);

    // Generate changelog data using AI
    const changelogData = await this.generateChangelogWithAI(
      commits,
      version,
      previousTag,
      currentTag,
    );

    // Format changelog as Markdown
    return this.formatChangelogMarkdown(changelogData);
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

    // Read existing changelog if it exists
    if (existsSync(changelogPath)) {
      existingContent = readFileSync(changelogPath, 'utf-8');
    }

    // Create new changelog content
    let updatedContent = `# Changelog\n\n${newContent}`;

    // For incremental updates, append after the header
    if (existingContent) {
      const headerMatch = existingContent.match(/^# Changelog\n\n/);
      if (headerMatch) {
        updatedContent = existingContent.replace(headerMatch[0], `# Changelog\n\n${newContent}\n`);
      } else {
        updatedContent = `# Changelog\n\n${newContent}\n\n${existingContent}`;
      }
    }

    // Write updated changelog
    writeFileSync(changelogPath, updatedContent, 'utf-8');
    logger.success(`Updated changelog for version ${version}`);
  }
}
