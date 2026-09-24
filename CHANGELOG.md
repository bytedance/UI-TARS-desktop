# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-10-10

### Added

#### Agent Kernel

**feat(agent-kernel): `onPrepareRequest` hook (#889) (#890)**
**feat(agent-kernel): streaming tool call (#881)**

- **feat(agent-kernel): introduce state-machine-based parser for kor (#884)**

#### Agent Tars

**feat(agent-tars): add welcome cards (#1685)**
**feat(agent-tars): disable contextual selector by default (#1621)**
**feat(agent-tars): support aio sandbox environment (#1573)**
222- **feat(agent-tars): add static webui config to core (#1266)**
**feat(agent-tars): search tool support connect to remote browser**

- **feat(agent-tars): strict-typed gui agent procotol (#1295)**
- **feat(agent-tars): support flexible system prompt override (#1151)**
- **feat(agent-tars): handle generated files sharing (#941)**
- **feat(agent-tars): enhance system instruction for reporter (#939)**
- **feat(agent-tars): enable stop_sequences for kor engine**
- **feat(agent-tars): clean up old planner (#889)**
- **feat(agent-tars): enhance file result display**
- **feat(agent-tars): enhance description for `browser_screenshot`**
- **feat(agent-tars): always create new navigation screenshot for gui agent (#805)**
- **feat(agent-tars): support recover browser (#804)**
- **feat(agent-tars): speed up `browser_navigate` (#803)**

#### Agent Tars Cli

**feat(agent-tars-cli): `read_file` supports preview markdown file (close: #814) (#849)**
**feat(agent-tars-cli): enhance `AGENT_TARS_BASE_URL` to support cloud serving**
**feat(agent-tars-cli): support `--browser.cdpEndpoint` to connect remote browser**

#### Agent Tars Server

**feat(agent-tars-server): session read optimization (close: #750) (#974)**
**feat(agent-tars-server): support oneshot api**
**feat(agent-tars-server): make agio request silent (#802)**

- **feat(agent-tars-server): serve generated file (#940)**
- **feat(agent-tars-server): generate short share slug (#919)**
- **feat(agent-tars-server): add `/api/v1/version` (#913)**

#### Agent Tars Web Ui

**feat(agent-tars-web-ui): enhance html file streaming render (#935)**
**feat(agent-tars-web-ui): render streaming tool call (#887)**
**feat(agent-tars-web-ui): more compact workspace (#931)**
**feat(agent-tars-web-ui): support tool call duration (close: #827) (#929)**
**feat(agent-tars-web-ui): initial support for mobile-side layout (#928)**
**feat(agent-tars-web-ui): display rendered HTML by default (#926)**
**feat(agent-tars-web-ui): new code file renderer (#874)**
**feat(agent-tars-web-ui): support full-screen markdown file rendering (#866)**
**feat(agent-tars-web-ui): enhance model info banner (#852)**
**feat(agent-tars-web-ui): optimize user message render**
**feat(agent-tars-web-ui): support preview output string containing image**
**feat(agent-tars-web-ui): enhance file result display**
**feat(agent-tars-web-ui): enhance message input and code block render (#806)**
**feat(agent-tars-web-ui): dark mode by default (#793) (#801)**

#### Llm Client

**feat(llm-client): support `openai-non-streaming` provider (#851)**

### FIX

#### Agent Kernel

**fix(agent-kernel): kor build wrong context (#932)**
**fix(agent-kernel): explicit json schema prompt for kor (#897)**
**fix(agent-kernel): native tool call engine should emit completion of tool calls**
**fix(agent-kernel): kor should handle braces and completion correctly (#886)**

#### Agent Server

**fix(agent-server): add safety check for agent.dispose in session cleanup (#1291)**

#### Agent Tars

**fix(agent-tars): correct webui property name to webuiConfig (#1267)**
**fix(agent-tars): move required deps from devDependencies to dependencies (#1255)**
**fix(agent-tars): `directory_tree` causes context overflow (close: #969) (#1055)**
**fix(agent-tars): parseAction compatible with irregular model output (#942)**
**fix(agent-tars): enable `enableStreamingToolCallEvents` by default**
**fix(agent-tars): `write_file` should respect workspace (close: #815) (#860)**
**fix(agent-tars): cannot custom mcp servers**

### Refactored

#### Agent Server

- **refactor(agent-server): refine session item info naming (#1183)**

#### Agent Tars

- **refactor(agent-tars): improve code architecture and docs (#1498)**
- **refactor(agent-tars): clean browser control info (#993)**
- **refactor(agent-tars): extract standalone module `MessageHistoryTrace`**
- **refactor(agent-tars): migrate to @gui-agent/operator-browser (#901)**

#### Agent Tars Cli

- **refactor(agent-tars-cli): clean unused dependencies (#1014)**

#### Agent Tars Docs

- **refactor(agent-tars-docs): enhance SEO for homepage (#924)**
- **refactor(agent-tars-docs): improve twitter SEO (#923)**
- **refactor(agent-tars-docs): improve SEO for dynamic routes (#922)**

#### Agent Tars Web Ui

- **refactor(agent-tars-web-ui): comments (#990)**
- **refactor(agent-tars-web-ui): impl (#925)**
- **refactor(agent-tars-web-ui): refine markdown renderer (#867)**
- **refactor(agent-tars-web-ui): reuse toggle switch (#864)**

#### All

- **refactor(all): refine project structures (#1012)**

### Documentation

#### Agent Tars

- **docs(agent-tars): fix the wrong tsconfig paths (#1710)**
- **docs(agent-tars): fix showcase not found (#1708)**
- **docs(agent-tars): ensure consistent background across all pages (#1589)**
- **docs(agent-tars): add blog index page (#1588)**
- **docs(agent-tars): agent api documentation (#1459)**
- **docs(agent-tars): agent hooks (#1277)**
- **docs(agent-tars): preserve tag filter state when navigating back (#1276)**
- **docs(agent-tars): update video introduction url (#1248)**
- **docs(agent-tars): fix dead feishu link (close: #1009) (#1010)**
- **docs(agent-tars): update showcase tags (#991)**
- **docs(agent-tars): make showcase public (#988)**
- **docs(agent-tars): add showcase redirects (#911)**
- **docs(agent-tars): add showcase page (#905)**
- **docs(agent-tars): fix feishu link (close: #861)**
- **docs(agent-tars): simplify video control (#857)**
- **docs(agent-tars): new home page (#841)**
- **docs(agent-tars): compress images (#837)**
- **docs(agent-tars): first release (#722)**
- **docs(agent-tars): update readme (#809)**

### Performance

- **perf(agent-tars-web-ui): using monaco editor for incremental rendering (#934)**
- **perf(agent-kernel): batch kor streaming chunk updates (#933)**
- **perf(agent-tars-server): do not cache all streaming events**

### Breaking Changes

Please refer to individual commit messages for specific breaking changes. Major architectural changes include:

- Migration from `agent-web-ui` to `agent-ui` package naming
- Removal of deprecated APIs and configurations
- Updates to agent configuration structures

### Migration Guide

For detailed migration instructions, please refer to the individual package documentation and commit messages for specific changes that may affect your implementation.
