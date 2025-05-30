<p align="center">
  <h1 align="center">@multimodal/pnpm-toolkit</h1>
  <p align="center">
    <a href="https://www.npmjs.com/package/@multimodal/pnpm-toolkit"><img src="https://img.shields.io/npm/v/@multimodal/pnpm-toolkit.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@multimodal/pnpm-toolkit"><img src="https://img.shields.io/npm/dm/@multimodal/pnpm-toolkit.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/license"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license"></a>
  </p>
  <p align="center">PTK - PNPM Toolkit, An efficient PNPM workspace development and publishing tool designed for Agent TARS.</p>
</p>

## Features

- 💻 **Dev Mode**: Quickly launch on-demand development builds for monorepo packages
- 🚀 **Release Management**: Automated version bumping and publishing
- 🔧 **Patch System**: Repair failed package publications
- 📝 **Changelog Generation**: Automatic, customizable changelog creation

## Install

```bash
# Using npm
npm install --save-dev @multimodal/pnpm-toolkit

# Using yarn
yarn add --dev @multimodal/pnpm-toolkit

# Using pnpm
pnpm add -D @multimodal/pnpm-toolkit
```

For global installation:

```bash
npm install -g @multimodal/pnpm-toolkit
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

## Advanced Guide

### Integration with package.json

Add these scripts to your root package.json:

```json
{
  "scripts": {
    "dev": "ptk dev",
    "release": "ptk release",
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

## License

MIT
