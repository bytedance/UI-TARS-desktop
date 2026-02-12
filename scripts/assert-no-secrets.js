#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const rootDir = process.cwd();
const inputPaths = process.argv.slice(2);

const defaultScanRoots = [
  'apps/ui-tars/src',
  'packages/ui-tars/sdk/src',
  'docs',
];

const ignoredDirNames = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.turbo',
  '.next',
  '.cache',
]);

const allowedExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
]);

const secretChecks = [
  {
    id: 'openai-api-key',
    regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: 'bearer-token',
    regex: /Bearer\s+[A-Za-z0-9._~+/=-]{24,}/gi,
  },
  {
    id: 'oauth-token-json',
    regex: /"(?:access|refresh|id)_token"\s*:\s*"[A-Za-z0-9._~+/=-]{16,}"/gi,
  },
  {
    id: 'api-key-assignment',
    regex:
      /(?:"(?:api[_-]?key|authorization)"|(?:api[_-]?key|authorization))\s*[:=]\s*"[A-Za-z0-9._~+/=-]{20,}"/gi,
  },
];

const isLikelyPlaceholder = (value) => {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('example') ||
    normalized.includes('placeholder') ||
    normalized.includes('redacted') ||
    normalized.includes('mock') ||
    normalized.includes('dummy') ||
    normalized.includes('xxxx') ||
    normalized.includes('sample')
  );
};

const toLineNumber = (text, index) => {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === '\n') {
      line += 1;
    }
  }
  return line;
};

const walkFiles = async (entryPath, output) => {
  let stat;
  try {
    stat = await fs.stat(entryPath);
  } catch {
    return;
  }

  if (stat.isFile()) {
    if (allowedExtensions.has(path.extname(entryPath))) {
      output.push(entryPath);
    }
    return;
  }

  if (!stat.isDirectory()) {
    return;
  }

  const dirName = path.basename(entryPath);
  if (ignoredDirNames.has(dirName)) {
    return;
  }

  const entries = await fs.readdir(entryPath, { withFileTypes: true });
  for (const entry of entries) {
    await walkFiles(path.join(entryPath, entry.name), output);
  }
};

const scan = async () => {
  const targets = inputPaths.length ? inputPaths : defaultScanRoots;
  const files = [];

  for (const target of targets) {
    await walkFiles(path.resolve(rootDir, target), files);
  }

  const findings = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf-8');
    for (const check of secretChecks) {
      const matches = content.matchAll(check.regex);
      for (const match of matches) {
        const index = match.index ?? 0;
        const value = match[0];
        if (isLikelyPlaceholder(value)) {
          continue;
        }
        findings.push({
          filePath,
          line: toLineNumber(content, index),
          check: check.id,
          value,
        });
      }
    }
  }

  if (!findings.length) {
    console.log(
      `[assert-no-secrets] OK. Scanned ${files.length} files and found no suspicious secrets.`,
    );
    return;
  }

  console.error('[assert-no-secrets] Found possible secrets:');
  for (const finding of findings) {
    const relPath = path.relative(rootDir, finding.filePath).replace(/\\/g, '/');
    console.error(
      `- ${relPath}:${finding.line} [${finding.check}] ${finding.value.slice(0, 80)}`,
    );
  }
  process.exitCode = 1;
};

scan().catch((error) => {
  console.error('[assert-no-secrets] Unexpected error:', error);
  process.exitCode = 1;
});
