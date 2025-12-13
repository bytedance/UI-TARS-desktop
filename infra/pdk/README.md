<p align="center">
  <h1 align="center">pnpm-dev-kit</h1>
  <p align="center">
    <a href="https://www.npmjs.com/package/pnpm-dev-kit"><img src="https://img.shields.io/npm/v/pnpm-dev-kit.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/pnpm-dev-kit"><img src="https://img.shields.io/npm/dm/pnpm-dev-kit.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/license"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  </p>
  <p align="center">PDK - PNPM Dev Kit, An efficient PNPM workspace development and publishing tool.</p>
</p>

## Features

- 💻 **Dev Mode**: Quickly launch on-demand development builds for monorepo packages
- 🚀 **Release Management**: Automated version bumping and publishing
- 🔧 **Patch System**: Repair failed package publications
- 📝 **Changelog Generation**: Automatic, customizable changelog creation
- 🏷️ **GitHub Release**: Automatic GitHub release creation with changelog extraction

## Install

```bash
# Using npm
npm install --save-dev pnpm-dev-kit

# Using yarn
yarn add --dev pnpm-dev-kit

# Using pnpm
pnpm add -D pnpm-dev-kit
```

For global installation:

```bash
npm install -g pnpm-dev-kit
```

## Usage

### Development Mode

Quickly start development mode to build packages on demand when files change:

```bash
# Using the CLI
pdk dev

# Or with npm script
npm run dev
```

**Interactive Features:**

- Type `n` to select a package to build manually
- Type `ps` to list running processes
- Type package name to build a specific package

### Release Process

**Standard Release:**
```bash
# Complete release (recommended)
pdk release --push-tag --create-github-release

# Canary release for CI/CD
pdk release --canary
```

**Release Flow:**
1. Select version type (patch/minor/major/prerelease)
2. Choose NPM tag (latest/next/beta)
3. Update workspace dependencies
4. Publish packages to NPM
5. Create git tag and push to remote
6. Generate CHANGELOG.md
7. Create GitHub Release

**Failed Release Recovery:**
```bash
pdk patch --version 1.0.0 --tag latest
```

**Changelog Generation:**
```bash
# Standard changelog
pdk changelog --version 1.0.0 --beautify --commit --git-push

# AI-powered changelog
pdk changelog --version 1.0.0 --use-ai --provider openai --model gpt-4o
```

**GitHub Release:**
```bash
pdk github-release --version 1.0.0
pdk github-release --dry-run  # Preview
```

**Key Options:**
- `--dry-run`: Preview without changes
- `--run-in-band`: Publish packages in series
- `--build`: Custom build script before release
- `--ignore-scripts`: Skip npm scripts
- `--auto-create-release-branch`: Auto-create release branch
- `--filter-scopes`: Filter by scope (default: tars,agent,tarko,o-agent,tars-stack,browser,infra,mcp,all)
- `--filter-types`: Filter by commit type (default: feat,fix)

## Configuration

### Configuration File

PDK supports configuration files using the `defineConfig` function. Create a `pdk.config.ts` (or `.js`, `.mjs`, `.cjs`) file in your project root:

```typescript
import { defineConfig } from 'pnpm-dev-kit';

export default defineConfig({
  // Common options shared across all commands
  tagPrefix: 'v',
  dryRun: false,
  runInBand: false,
  ignoreScripts: false,
  
  // AI-related options for changelog generation
  useAi: true,
  model: 'gpt-4o',
  provider: 'openai',
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
  apiKey: process.env.OPENAI_API_KEY,
  
  // Filter options for changelog generation
  filterTypes: ['feat', 'fix', 'perf'],
  filterScopes: ['core', 'ui', 'api'],
  
  // Development mode configuration (dev command only)
  exclude: ['@scope/package-to-exclude'],
  packages: ['@scope/package-to-start'],
  
  // Release command configuration (release command only)
  changelog: true,
  pushTag: true,
  createGithubRelease: true,
  autoCreateReleaseBranch: false,
  
  // Changelog command configuration (changelog command only)
  beautify: true,
  commit: true,
  gitPush: false,
  attachAuthor: true,
});
```

### Configuration Options

**Common Options** (shared across all commands):
- `cwd`: Working directory (default: `process.cwd()`)
- `dryRun`: Preview mode without making changes (default: `false`)
- `runInBand`: Publish packages in series (default: `false`)
- `ignoreScripts`: Skip npm scripts (default: `false`)
- `tagPrefix`: Git tag prefix (default: `'v'`)

**AI Options** (for changelog generation):
- `useAi`: Enable AI-powered changelog (default: `false`)
- `model`: LLM model (default: `'gpt-4o'`)
- `provider`: LLM provider (default: `'openai'`)
- `apiKey`: API key for LLM service
- `baseURL`: Custom base URL for LLM API

**Filter Options** (for changelog generation):
- `filterTypes`: Commit types to include in changelog (default: `['feat', 'fix']`)
- `filterScopes`: Scopes to include in changelog (default: `[]`)

**Command-Specific Options**:
- `exclude`, `packages`: Development mode (dev command only)
- `changelog`, `pushTag`, `createGithubRelease`, `autoCreateReleaseBranch`, `build`, `canary`: Release options (release command only)
- `beautify`, `commit`, `gitPush`, `attachAuthor`, `authorNameType`: Changelog options (changelog command only)
- `tag`: Patch options (patch command only)
- `version`: Version options (changelog, patch, github-release commands)

### Configuration Philosophy

#### 🎯 What to Put in Config File

**Project-Level Settings:**
- `tagPrefix`: Your project's tag convention (`'v'`, `'release-'`)
- `filterTypes`: Standard commit types for your project (`['feat', 'fix', 'perf']`)
- `filterScopes`: Your project's scope organization (`['core', 'ui', 'api']`)
- `runInBand`: Resource constraints for your CI/CD environment
- `ignoreScripts`: Your team's build script preferences

**AI Configuration:**
- `useAi`: Team's preference for AI-powered changelogs
- `model`: Team's preferred LLM (`'gpt-4o'`, `'claude-3'`)
- `provider`: Your organization's AI provider (`'openai'`, `'anthropic'`)
- `baseURL`: Custom endpoints for enterprise AI setups

**Workflow Defaults:**
- `changelog`: Always generate changelog on releases
- `pushTag`: Auto-push git tags to remote
- `createGithubRelease`: Automatic GitHub release creation
- `autoCreateReleaseBranch`: Release workflow preferences

#### ⚡ What to Use CLI For

**Environment-Specific Options:**
- `dryRun`: Preview mode for testing (`--dry-run`)
- `cwd`: Different working directories (`--cwd /path/to/project`)
- `version`: Specific version overrides (`--version 1.2.3`)

**One-Time Operations:**
- `exclude`: Temporary package exclusions (`--exclude @scope/pkg`)
- `packages`: Specific package selection (`--packages @scope/pkg`)
- `build`: One-time build script overrides (`--build custom:build`)
- `canary`: Canary release decisions (`--canary`)

**Sensitive Data:**
- `apiKey`: Never commit API keys, use environment variables

#### 🏢 Why This Design?

**Config File Benefits:**
✅ **Team Consistency** - Everyone uses the same project settings
✅ **Living Documentation** - Config serves as project convention documentation
✅ **CI/CD Reproducibility** - Automated builds use exact same configuration
✅ **Team Onboarding** - New members understand project conventions instantly
✅ **Maintenance** - Single place to update project-wide settings

**CLI Benefits:**
✅ **Flexibility** - Override config for specific situations
✅ **Security** - Avoid committing sensitive data to version control
✅ **Experimentation** - Try different options without config file changes
✅ **Automation** - Script different workflows dynamically
✅ **Environment Adaptation** - Different settings for dev/staging/prod

#### 🚫 Anti-Patterns to Avoid

**In Config Files:**
❌ Sensitive credentials or API keys
❌ Environment-specific values (use env vars instead)
❌ Temporary experimental settings
❌ Overly restrictive defaults that hinder flexibility

**Best Practices:**
✅ Use config file for project conventions and team preferences
✅ Use CLI for environment-specific overrides and temporary changes
✅ Keep sensitive data in environment variables
✅ Document configuration decisions in team wiki
✅ Review config changes in pull requests

### Priority Order

Configuration is applied in the following priority order (highest to lowest):
1. CLI command-line arguments
2. Environment variables
3. Configuration file (`pdk.config.*`)
4. Default values

### Node.js API

You can also use PDK programmatically:

```typescript
import { loadPDKConfig, dev, release } from 'pnpm-dev-kit';

// Load configuration
const config = await loadPDKConfig({ cwd: './my-project' });

// Use configuration with commands (CLI, Node.js API, and Config API are isomorphic)
await dev(config.resolved);
await release(config.resolved);
```

**package.json Scripts:**
```json
{
  "scripts": {
    "dev": "pdk dev",
    "release": "pdk release --push-tag",
    "release:full": "pdk release --push-tag --create-github-release",
    "release:canary": "pdk release --canary",
    "github-release": "pdk github-release",
    "changelog": "pdk changelog",
    "patch": "pdk patch --version $(node -p \"require('./package.json').version\") --tag latest"
  }
}
```

**Workspace Setup:**
- Uses `pnpm-workspace.yaml` for package discovery
- Follows conventional commit standards
- Auto-updates internal workspace dependencies

**CI/CD Integration:**
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm run release:full
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Best Practices:**
- Always release from latest main branch
- Ensure clean working directory
- Run tests before release
- Use `--dry-run` for testing
- Canary format: `{version}-canary-{commitHash}-{timestamp}`
- Auto-rollback on publish failure

## License

This project is licensed under the Apache License 2.0.
