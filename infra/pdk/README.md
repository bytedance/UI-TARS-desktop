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
