<h1 align="center">ts-monorepo-starter</h1>

<p align="center">
  A hassle-free TypeScript monorepo template
</p>

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

## Table of Contents

- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Concepts](#concepts)
  - [Go to definition](#go-to-definition)
  - [Lock Dependency Version](#lock-dependency-version)
- [Integrations](#integrations)
- [Commands](#commands)
- [Prior Arts](#prior-arts)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Tech Stack

- Package Manager: [PNPM](https://pnpm.io/).
  - Version: 10
  - [strict-peer-dependencies=false](https://docs.npmjs.com/cli/v7/using-npm/config/#strict-peer-deps)
- Build: [Rslib](https://lib.rsbuild.dev/).
- Test: [Vitest](https://lib.rsbuild.dev/).
- Code Formatting: [Prettier](https://prettier.io/).

## Quick Start

1. Click "Use this template" at this repository.
2. Rename all `@default-scope/` to your npm package scope (e.g. `@foo/`):

<p align="center">
  <img src="./media/replace-npm-scope.png" width="300">
</p>

## Concepts

### Go to definition

See: [How to set up a TypeScript monorepo and make Go to definition work](https://medium.com/@NiGhTTraX/how-to-set-up-a-typescript-monorepo-with-lerna-c6acda7d4559).

### Lock Dependency Version

All NPM dependency requirements are locked.

## Integrations

| Package Manager | [pnpm](https://pnpm.io/) |
| --- | --- |
| Linter | [eslint](https://pnpm.io/) |
| Lint Preset | [eslint-config-typescript-library](https://github.com/default-scope/eslint-config-typescript-library) |

## Commands

```bash
npm run bootstrap # Install Dependencies
npm run docs      # Update TOC at README.md
npm run clean     # Clean all packages' build assets
npm run clean     # Clean all packages' build assets
```

## Prior Arts

- [ts-monorepo](https://github.com/NiGhTTraX/ts-monorepo)

## LICENSE

MIT License © [ULIVZ](https://github.com/ulivz)
