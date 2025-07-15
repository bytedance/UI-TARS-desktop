# Contributing to UI-TARS Desktop

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

> And if you like the project, but just don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation, which we would also be very happy about:
> - Star the project
> - Tweet about it
> - Refer this project in your project's readme
> - Mention the project at local meetups and tell your friends/colleagues


## I Have a Question / Bug Report

> If you want to ask a question or report a bug, we assume that you have read the available Documentation.

Before you ask a question, it is best to search for existing [Issues](https://github.com/bytedance/ui-tars-desktop/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/bytedance/ui-tars-desktop/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

We will then take care of the issue as soon as possible.

## I Want To Contribute

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) >= 20
- [pnpm](https://pnpm.io/installation) >= 9

#### Technology Stack

This is a [Monorepo](https://pnpm.io/workspaces) project including the following technologies:

- Cross-platform framework: [Electron](https://www.electronjs.org/)
- Interface:
  - [React](https://react.dev/)
  - [Vite](https://vitejs.dev/)
- State management and communication:
  - [Zustand](https://zustand.docs.pmnd.rs/)
  - [@ui-tars/electron-ipc](https://github.com/bytedance/UI-TARS-desktop/tree/main/packages/ui-tars/electron-ipc)
- Automation framework/toolkit:
  - [nut.js](https://nutjs.dev/)
- Test framework
  - [Vitest](https://vitest.dev/)
  - [Playwright](https://playwright.dev/)

### Structure of the project

```bash
.
├── README.md
├── apps
│   └── ui-tars
│       └── src
│           ├── main
│           ├── preload
│           └── renderer
│ 
├── packages
│   ├── agent-infra
│   │   ├── browser
│   │   ├── browser-use
│   │   ├── logger
│   │   ├── mcp-client
│   │   ├── mcp-servers
│   │   ├── search
│   │   └── shared
│   ├── common
│   │   ├── configs
│   │   └── electron-build
│   └── ui-tars
│       ├── action-parser
│       ├── cli
│       ├── electron-ipc
│       ├── operators
│       ├── sdk
│       ├── shared
│       ├── tsconfig.node.json
│       ├── utio
│       └── visualizer
└── vitest.*.mts            # Unit test configuration
```

> **Note**: The `src` directory is located in the top-level directory instead of the `apps/{main,preload,renderer}` directories because Electron Forge previously did not support Pnpm's hoisting mechanism([electron/forge#2633](https://github.com/electron/forge/issues/2633)), requiring the `src` directory to be placed in the top-level directory.


#### Clone the repository

```bash
$ git clone https://github.com/bytedance/ui-tars-desktop.git
$ cd ui-tars-desktop
```

### Development

#### Install dependencies

```bash
$ pnpm install
```

#### Run the application

```bash
$ pnpm run dev:ui-tars    # Start UI-TARS Desktop
```

After the application starts, you can see the UI-TARS interface within the application.

> **Note**: On MacOS, you need to grant permissions to the app (e.g., iTerm2, Terminal) you are using to run commands.

#### Main process reload

By default, `pnpm run dev` only has frontend Hot Module Replacement (HMR) hot updates. If you need to simultaneously reload the main process during debugging, you can execute `pnpm run dev:w`.

```bash
$ pnpm run dev:w
```

#### Building

Run `pnpm run build` in current system, it will output into `out/*` directory.

To build the products of other systems, run:
- Mac x64: `pnpm run publish:mac-x64`
- Mac ARM: `pnpm run publish:mac-arm64`
- Windows x64: `pnpm run publish:win32`
- Windows ARM: `pnpm run publish:win32-arm64`

### Release

#### Desktop Application

The CI pipeline to execute is [.github/workflows/release.yml](.github/workflows/release.yml), only manual triggered by maintainers. If you're a maintainer, you can follow the steps below to release the application:

1. Edit the `version` in `package.json`
2. Git commit and push to the `release/${version}` branch, create a PR targeting `main` branch, titled `release(app): ${version}`
3. Trigger the release [workflow](https://github.com/bytedance/UI-TARS-desktop/actions/workflows/release.yml) manually after the PR is merged

Currently, the release workflow supports the following platforms:

- MacOS x64
- MacOS arm64
- Windows x64

#### Packages

##### Latest version

If you want to publish the `latest` version packages to the npm registry, you can run the following command:

1. `pnpm changeset` to specify the changelogs for the packages you want to publish
2. Git commit and push to the `release-pkgs/${version}` branch, create a PR targeting `main` branch, titled `release(pkgs): ${version}`
3. `pnpm run publish:packages` to publish the packages in latest `origin/main` branch after the PR is merged

##### Beta version

If you want to publish the `beta` version packages to the npm registry, you can run the following command:

1. `pnpm changeset` to specify the changelogs for the packages you want to publish
2. Git commit and push to the branch
3. `pnpm run publish-beta:packages` to publish the packages in current branch


### Documentation

The documents are placed in the `docs/*.md` directory, formatted in markdown.  There is currently no documentation site, but the `docs/*.md` directory will be converted into a documentation site in the future.

## Styleguides

### Pre-commit Hooks

We use [Husky](https://typicode.github.io/husky/#/) and [lint-staged](https://github.com/okonet/lint-staged) to enforce the pre-commit hooks. The hooks include:

- `prettier --write` to format the code
- `npm run typecheck` to strictly check the type

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) to standardize the commit messages.

### CI / Testing

Each PR or main branch push will trigger the CI pipeline to run the unit test and E2E test.

#### Unit test

```bash
pnpm run test
```

#### E2E test

```bash
pnpm run test:e2e
```

## Submitting Changes

* Push your changes to a feature branch in your fork of the repository.
* Submit a pull request to this repository
* Accept the CLA in your PR.
