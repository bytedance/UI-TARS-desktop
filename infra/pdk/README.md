<p align="center">
  <h1 align="center">pnpm-dev-kit</h1>
  <p align="center">
    <a href="https://www.npmjs.com/package/pnpm-dev-kit"><img src="https://img.shields.io/npm/v/pnpm-dev-kit.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/pnpm-dev-kit"><img src="https://img.shields.io/npm/dm/pnpm-dev-kit.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/license"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  </p>
  <p align="center">Efficient PNPM workspace development and publishing toolkit</p>
</p>

## Features

- **Dev Mode**: On-demand builds with file watching
- **Release**: Automated versioning and publishing
- **Patch**: Targeted fixes for failed releases
- **Changelog**: AI-powered or conventional changelog generation
- **GitHub Release**: Automatic GitHub releases with changelog

## Quick Start

```bash
npm install -D pnpm-dev-kit
```

### Basic Usage

```bash
# Development mode
pdk dev

# Release with changelog and GitHub release
pdk release --push-tag --create-github-release

# Generate changelog
pdk changelog --use-ai --provider openai --model gpt-4o

# Fix failed release
pdk patch --version 1.0.0 --tag latest
```

## Configuration

Create `pdk.config.ts` in your project root:

```typescript
import { defineConfig } from 'pnpm-dev-kit';

export default defineConfig({
  // Core options
  tagPrefix: 'v',
  dryRun: false,
  runInBand: false,
  ignoreScripts: false,
  
  // AI changelog
  useAi: true,
  model: 'gpt-4o',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  
  // Changelog filters
  filterTypes: ['feat', 'fix', 'perf'],
  filterScopes: ['core', 'ui', 'api'],
  
  // Release defaults
  changelog: true,
  pushTag: true,
  createGithubRelease: true,
  autoCreateReleaseBranch: false,
  
  // Dev mode
  exclude: ['@scope/package-to-exclude'],
  packages: ['@scope/package-to-start'],
});
```

### Configuration Options

#### Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cwd` | `string` | `process.cwd()` | Working directory |
| `dryRun` | `boolean` | `false` | Preview mode without changes |
| `runInBand` | `boolean` | `false` | Publish packages sequentially |
| `ignoreScripts` | `boolean` | `false` | Skip npm scripts |
| `tagPrefix` | `string` | `'v'` | Git tag prefix |

#### AI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useAi` | `boolean` | `false` | Enable AI changelog generation |
| `model` | `string` | `'gpt-4o'` | LLM model |
| `provider` | `string` | `'openai'` | LLM provider |
| `apiKey` | `string` | - | API key (use env var) |
| `baseURL` | `string` | - | Custom API endpoint |

#### Filter Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `filterTypes` | `string[]` | `['feat', 'fix']` | Commit types to include |
| `filterScopes` | `string[]` | `[]` | Scopes to include (empty = all) |

#### Command-Specific Options

**Development (`dev`)**:
- `exclude`: Packages to exclude from startup
- `packages`: Packages to start by default

**Release (`release`)**:
- `changelog`: Generate changelog (default: `true`)
- `build`: Build before publishing (`false` or script name)
- `pushTag`: Push git tags (default: `false`)
- `canary`: Canary release (default: `false`)
- `createGithubRelease`: Create GitHub release (default: `false`)
- `autoCreateReleaseBranch`: Auto-create release branch (default: `false`)

**Changelog (`changelog`)**:
- `version`: Target version
- `beautify`: Format markdown (default: `false`)
- `commit`: Git commit changelog (default: `false`)
- `gitPush`: Push commit (default: `false`)
- `attachAuthor`: Include author info (default: `false`)
- `authorNameType`: Author format (`'name'` or `'email'`, default: `'name'`)

**Patch (`patch`)**:
- `version`: Version to patch
- `tag`: Distribution tag

**GitHub Release (`github-release`)**:
- `version`: Release version

## Configuration vs CLI

### Use Config File For

- **Project conventions**: `tagPrefix`, `filterTypes`, `filterScopes`
- **Team preferences**: `useAi`, `model`, `provider`, `runInBand`
- **Workflow defaults**: `changelog`, `pushTag`, `createGithubRelease`

### Use CLI For

- **Environment-specific**: `dryRun`, `cwd`, `version`
- **One-time operations**: `exclude`, `packages`, `build`, `canary`
- **Sensitive data**: `apiKey` (use environment variables)

### Priority Order

1. CLI arguments
2. Environment variables  
3. Configuration file
4. Default values

## API Usage

```typescript
import { loadPDKConfig, dev, release } from 'pnpm-dev-kit';

// Load configuration
const config = await loadPDKConfig({ cwd: './my-project' });

// Use with commands
await dev(config.resolved);
await release(config.resolved);
```

## package.json Scripts

```json
{
  "scripts": {
    "dev": "pdk dev",
    "release": "pdk release",
    "release:full": "pdk release --push-tag --create-github-release",
    "release:canary": "pdk release --canary",
    "changelog": "pdk changelog",
    "patch": "pdk patch --version $(node -p \"require('./package.json').version\") --tag latest"
  }
}
```

## CI/CD Integration

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

## Best Practices

- Always release from clean `main` branch
- Use `--dry-run` for testing
- Canary format: `{version}-canary-{commitHash}-{timestamp}`
- Keep sensitive data in environment variables
- Review config changes in pull requests

## License

Apache License 2.0