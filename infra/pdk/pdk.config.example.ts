import { defineConfig } from 'pnpm-dev-kit';

export default defineConfig({
  // Common options shared across all commands
  common: {
    tagPrefix: 'v',
    dryRun: false,
    runInBand: false,
    ignoreScripts: false,
  },

  // AI-related options for changelog generation
  ai: {
    useAi: true,
    model: 'gpt-4o',
    provider: 'openai',
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  },

  // Filter options for changelog generation
  filter: {
    filterTypes: ['feat', 'fix', 'perf'],
    filterScopes: ['core', 'ui', 'api'],
  },

  // Development mode configuration
  dev: {
    exclude: ['@scope/package-to-exclude'],
    packages: ['@scope/package-to-start'],
  },

  // Release command configuration
  release: {
    changelog: true,
    pushTag: true,
    createGithubRelease: true,
    autoCreateReleaseBranch: false,
    build: true,
    canary: false,
  },

  // Changelog command configuration
  changelog: {
    beautify: true,
    commit: true,
    gitPush: false,
    attachAuthor: true,
    authorNameType: 'name',
  },

  // Patch command configuration
  patch: {
    runInBand: true,
    ignoreScripts: false,
  },

  // GitHub release command configuration
  githubRelease: {
    dryRun: false,
  },
});