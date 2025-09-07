<p align="center">
  <h1 align="center">@tarko/pnpm-toolkit</h1>
  <p align="center">
    <a href="https://www.npmjs.com/package/@tarko/pnpm-toolkit"><img src="https://img.shields.io/npm/v/@tarko/pnpm-toolkit.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@tarko/pnpm-toolkit"><img src="https://img.shields.io/npm/dm/@tarko/pnpm-toolkit.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/license"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  </p>
  <p align="center">PTK - PNPM Toolkit, An efficient PNPM workspace development and publishing tool designed for Agent TARS.</p>
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
npm install --save-dev @tarko/pnpm-toolkit

# Using yarn
yarn add --dev @tarko/pnpm-toolkit

# Using pnpm
pnpm add -D @tarko/pnpm-toolkit
```

For global installation:

```bash
npm install -g @tarko/pnpm-toolkit
```

## Usage

### Development Mode

Quickly start development mode to build packages on demand when files change:

```bash
# Using the CLI
ptk dev

# Or with npm script
npm run dev
```

**Interactive Features**:
- Type `n` to select a package to build manually
- Type `ps` to list running processes
- Type package name to build a specific package

### Releasing Packages

Release your packages with proper versioning:

```bash
ptk release
```

Options:
- `--changelog`: Generate changelog (default: true)
- `--dry-run`: Preview execution without making changes
- `--run-in-band`: Publish packages in series
- `--build`: Execute custom build script before release
- `--ignore-scripts`: Ignore npm scripts during release
- `--push-tag`: Automatically push git tag to remote
- `--create-github-release`: Create GitHub release after successful release

### Patching Failed Releases

Fix failed package publications:

```bash
ptk patch --version 1.0.0 --tag latest
```

### Generating Changelogs

Create customized changelogs:

```bash
ptk changelog --version 1.0.0 --beautify --commit
```

### Creating GitHub Releases

Create GitHub releases independently or as part of the release process:

```bash
# Create GitHub release independently
ptk github-release

# Create GitHub release for specific version
ptk github-release --version 1.0.0

# Preview what would be created (dry run)
ptk github-release --dry-run

# Create GitHub release during package release
ptk release --create-github-release

# Short alias
ptk gh-release --version 1.0.0
```

**Prerequisites**:
- GitHub CLI (`gh`) must be installed and authenticated
- Repository must be hosted on GitHub
- `CHANGELOG.md` file should exist with proper version sections

**Features**:
- Automatically extracts release notes from `CHANGELOG.md`
- Detects prerelease versions (containing `-`) and marks them appropriately
- Uses project's tag prefix (e.g., `@agent-tars@1.0.0`)
- Graceful failure - main release succeeds even if GitHub release fails

**Changelog Format Expected**:
```markdown
## [1.0.0](compare-link) (2025-01-01)

### Features

* **scope:** description ([#123](pr-link)) ([commit](commit-link)) [@author](author-link)

### Bug Fixes

* **scope:** fix description ([#124](pr-link)) ([commit](commit-link)) [@author](author-link)
```

## Advanced Guide

### Integration with package.json

Add these scripts to your root package.json:

```json
{
  "scripts": {
    "dev": "ptk dev",
    "release": "ptk release --push-tag",
    "release:full": "ptk release --push-tag --create-github-release",
    "release:dry": "ptk release --dry-run --create-github-release",
    "github-release": "ptk github-release",
    "changelog": "ptk changelog"
  }
}
```

### Configuration

PTK works with standard PNPM workspace configurations:

- Uses `pnpm-workspace.yaml` for workspace package discovery
- Respects `package.json` configurations
- Follows conventional commit standards for changelog generation

### Custom Builds during Release

Enable custom build processes during release:

```bash
ptk release --build "npm run custom-build"
```

### Separating NPM and GitHub Releases

For more control, you can separate npm publishing from GitHub release creation:

```bash
# Step 1: Release packages to npm
ptk release --push-tag

# Step 2: Create GitHub release independently
ptk github-release

# Or in CI/CD pipeline
npm run release        # Publishes to npm
npm run github-release # Creates GitHub release
```

This approach allows you to:
- Handle npm publishing failures independently
- Create GitHub releases from different environments
- Customize release timing and conditions
- Integrate with different CI/CD workflows

## License

MIT
