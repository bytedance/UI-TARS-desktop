import { promises as fs } from 'fs';
import { z } from 'zod';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

console.log('[ConfigMarkdown] Module loaded!');

const execAsync = promisify(exec);

export namespace ConfigMarkdown {
  export const FILE_REGEX = /(?<![\w`])@(\.?[^\s`,.]*(?:\.[^\s`,.]+)*)/g;
  export const SHELL_REGEX = /!`([^`]+)`/g;
  export const BASH_BLOCK_REGEX = /```bash\s*\n([\s\S]*?)\s*```/g;

  export function files(template: string) {
    return Array.from(template.matchAll(FILE_REGEX));
  }

  export function shell(template: string) {
    return Array.from(template.matchAll(SHELL_REGEX));
  }

  export function bashBlocks(template: string) {
    return Array.from(template.matchAll(BASH_BLOCK_REGEX));
  }

  export async function parse(filePath: string, processReferences = true) {
    const raw = await fs.readFile(filePath, 'utf8');
    const template = preprocessFrontmatter(raw);
    const baseDir = path.dirname(filePath);

    console.log(`[ConfigMarkdown] Parsing file: ${filePath}`);
    console.log(`[ConfigMarkdown] Base directory: ${baseDir}`);
    console.log(`[ConfigMarkdown] Process references: ${processReferences}`);
    console.log(`[ConfigMarkdown] Raw content length: ${raw.length}`);

    // Check if file contains any shell command patterns
    if (raw.includes('!`')) {
      console.log(`[ConfigMarkdown] File contains shell command patterns (!\`)`);
      // Find all matches
      const matches = raw.matchAll(SHELL_REGEX);
      for (const match of matches) {
        console.log(`[ConfigMarkdown] Found shell command: ${match[0]}`);
      }
    }

    try {
      const md = parseFrontmatter(template);

      console.log(`[ConfigMarkdown] Parsed frontmatter, content length: ${md.content.length}`);

      if (processReferences === true) {
        let processedContent = md.content;

        console.log(`[ConfigMarkdown] Starting to process references...`);
        console.log(`[ConfigMarkdown] Checking for file references...`);
        const fileMatches = files(processedContent);
        console.log(`[ConfigMarkdown] Found ${fileMatches.length} file references`);

        console.log(`[ConfigMarkdown] Checking for inline shell commands...`);
        const shellMatches = shell(processedContent);
        console.log(`[ConfigMarkdown] Found ${shellMatches.length} inline shell commands`);

        console.log(`[ConfigMarkdown] Checking for bash blocks...`);
        const bashBlockMatches = bashBlocks(processedContent);
        console.log(`[ConfigMarkdown] Found ${bashBlockMatches.length} bash blocks`);

        processedContent = await processFileReferences(processedContent, baseDir);
        console.log(`[ConfigMarkdown] File references processed`);

        return { data: md.data, content: processedContent };
      }

      console.log(`[ConfigMarkdown] Skipping reference processing`);
      return md;
    } catch (err) {
      throw new FrontmatterError({
        path: filePath,
        message: `${filePath}: Failed to parse YAML frontmatter: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  export function preprocessFrontmatter(content: string): string {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return content;

    const frontmatter = match[1];
    const lines = frontmatter.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith('#') || line.trim() === '') {
        result.push(line);
        continue;
      }

      if (line.match(/^\s+/)) {
        result.push(line);
        continue;
      }

      const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
      if (!kvMatch) {
        result.push(line);
        continue;
      }

      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (
        value === '' ||
        value === '>' ||
        value === '|' ||
        value.startsWith('"') ||
        value.startsWith("'")
      ) {
        result.push(line);
        continue;
      }

      if (value.includes(':')) {
        result.push(`${key}: |`);
        result.push(`  ${value}`);
        continue;
      }

      result.push(line);
    }

    const processed = result.join('\n');
    return content.replace(frontmatter, () => processed);
  }

  export class FrontmatterError extends Error {
    constructor(public data: { path: string; message: string }) {
      super(data.message);
      this.name = 'ConfigFrontmatterError';
    }
  }
}

async function processFileReferences(content: string, baseDir: string): Promise<string> {
  const fileMatches = ConfigMarkdown.files(content);
  let processedContent = content;

  console.log(`[ConfigMarkdown] Found ${fileMatches.length} file references in content`);

  for (const match of fileMatches) {
    const [fullMatch, filePath] = match;
    const fullPath = path.resolve(baseDir, filePath);

    console.log(`[ConfigMarkdown] Processing file reference: ${filePath} -> ${fullPath}`);

    try {
      const fileContent = await fs.readFile(fullPath, 'utf8');
      const extension = path.extname(filePath).toLowerCase();
      let formattedContent = fileContent;

      if (
        ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c'].includes(
          extension,
        )
      ) {
        formattedContent = `\`\`\`${extension.slice(1)}\n${fileContent}\n\`\`\``;
      } else if (['.json', '.yaml', '.yml', '.toml', '.xml'].includes(extension)) {
        formattedContent = `\`\`\`${extension.slice(1)}\n${fileContent}\n\`\`\``;
      } else if (['.md', '.txt', '.sh', '.bash'].includes(extension)) {
        formattedContent = `\`\`\`\n${fileContent}\n\`\`\``;
      }

      processedContent = processedContent.replace(fullMatch, formattedContent);
      console.log(`[ConfigMarkdown] Successfully replaced file reference: ${filePath}`);
    } catch (error) {
      console.error(`[ConfigMarkdown] Error reading file ${filePath}:`, error);
      processedContent = processedContent.replace(
        fullMatch,
        `[Error: Could not read file ${filePath}: ${error instanceof Error ? error.message : String(error)}]`,
      );
    }
  }

  return processedContent;
}

function parseFrontmatter(content: string): { data: Record<string, any>; content: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return { data: {}, content };
  }

  const frontmatter = match[1];
  const data: Record<string, any> = {};

  const lines = frontmatter.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('#') || line.trim() === '') {
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }

    const key = kvMatch[1];
    const value = kvMatch[2].trim();

    if (value.startsWith('|') || value.startsWith('>')) {
      const nextLineIndex = lines.indexOf(line) + 1;
      const blockContent: string[] = [];
      while (nextLineIndex < lines.length && lines[nextLineIndex].match(/^\s+/)) {
        blockContent.push(lines[nextLineIndex].trim());
        lines[nextLineIndex] = '';
      }
      data[key] = blockContent.join('\n');
    } else if (value.startsWith('"') || value.startsWith("'")) {
      data[key] = value.slice(1, -1);
    } else {
      data[key] = value;
    }
  }

  const contentBody = content.replace(/^---[\s\S]*?---\r?\n/, '');
  return { data, content: contentBody };
}
