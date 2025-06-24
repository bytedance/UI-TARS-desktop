# Changelog

## [0.2.0-beta.1](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.2.0-beta.0...@agent-tars@0.2.0-beta.1) (2025-06-23)

### Features

* **agent-tars-web-ui:** enhance session search ([#786](https://github.com/bytedance/UI-TARS-desktop/pull/786)) ([51cd8f8](https://github.com/bytedance/UI-TARS-desktop/commit/51cd8f8a)) [@ULIVZ](https://github.com/ULIVZ)

### Bug Fixes

* **agent:** streaming mode missing `agent_run_start` and `agent_run_end` event ([#789](https://github.com/bytedance/UI-TARS-desktop/pull/789)) ([82f28fb](https://github.com/bytedance/UI-TARS-desktop/commit/82f28fba)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** missing view final environment state entry ([d0da001](https://github.com/bytedance/UI-TARS-desktop/commit/d0da001a)) [@chenhaoli](https://github.com/chenhaoli)

## [0.2.0-beta.0](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.1.12-beta.5...@agent-tars@0.2.0-beta.0) (2025-06-23)

### Features

* **agent-tars-web-ui:** new assistant ui ([194e403](https://github.com/bytedance/UI-TARS-desktop/commit/194e4037)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** support run with `--debug` and `pipe` ([06a35f2](https://github.com/bytedance/UI-TARS-desktop/commit/06a35f2d)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** refine agent tars browser control api ([#782](https://github.com/bytedance/UI-TARS-desktop/pull/782)) ([7072142](https://github.com/bytedance/UI-TARS-desktop/commit/70721424)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** enhance message and markdown renderer ([#780](https://github.com/bytedance/UI-TARS-desktop/pull/780)) ([ce60268](https://github.com/bytedance/UI-TARS-desktop/commit/ce602689)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** bump `@agent-infra/mcp-server-*` to `1.1.10` ([#775](https://github.com/bytedance/UI-TARS-desktop/pull/775)) ([23ecc2d](https://github.com/bytedance/UI-TARS-desktop/commit/23ecc2dd)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** introduce new `run_command` ui ([#777](https://github.com/bytedance/UI-TARS-desktop/pull/777)) ([85a0f62](https://github.com/bytedance/UI-TARS-desktop/commit/85a0f62a)) [@ULIVZ](https://github.com/ULIVZ)

### Bug Fixes

* **agent-tars:** gui agent grounding check won't work when `browser.control` is not configured (close: #773) (close: [#773](https://github.com/bytedance/UI-TARS-desktop/issues/773)) ([#774](https://github.com/bytedance/UI-TARS-desktop/pull/774)) ([97446af](https://github.com/bytedance/UI-TARS-desktop/commit/97446af6)) [@ULIVZ](https://github.com/ULIVZ)
* **agent:** tool schema miss `properties` in native tool call (close: #769) (close: [#769](https://github.com/bytedance/UI-TARS-desktop/issues/769)) ([#770](https://github.com/bytedance/UI-TARS-desktop/pull/770)) ([ac810fe](https://github.com/bytedance/UI-TARS-desktop/commit/ac810fe3)) [@ULIVZ](https://github.com/ULIVZ)

## [0.1.12-beta.5](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.1.12-beta.4...@agent-tars@0.1.12-beta.5) (2025-06-21)

### Features

* **agent-tars:** refine snapshot public api ([#765](https://github.com/bytedance/UI-TARS-desktop/pull/765)) ([3f6e101](https://github.com/bytedance/UI-TARS-desktop/commit/3f6e1016)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** support multiple-line input in home ([#764](https://github.com/bytedance/UI-TARS-desktop/pull/764)) ([9b6f5be](https://github.com/bytedance/UI-TARS-desktop/commit/9b6f5bee)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** support load config from global workspce ([#763](https://github.com/bytedance/UI-TARS-desktop/pull/763)) ([e4006e9](https://github.com/bytedance/UI-TARS-desktop/commit/e4006e9f)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** add gui agent grounding check (close: #760) (close: [#760](https://github.com/bytedance/UI-TARS-desktop/issues/760)) ([#761](https://github.com/bytedance/UI-TARS-desktop/pull/761)) ([d418a20](https://github.com/bytedance/UI-TARS-desktop/commit/d418a20e)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** display current model info (close: #756) (close: [#756](https://github.com/bytedance/UI-TARS-desktop/issues/756)) ([#757](https://github.com/bytedance/UI-TARS-desktop/pull/757)) ([2fe407b](https://github.com/bytedance/UI-TARS-desktop/commit/2fe407b9)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** fine-grained global workspace control (close: #754) (close: [#754](https://github.com/bytedance/UI-TARS-desktop/issues/754)) ([#755](https://github.com/bytedance/UI-TARS-desktop/pull/755)) ([19aba6b](https://github.com/bytedance/UI-TARS-desktop/commit/19aba6b6)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** config `--workspace` shortcut (close: #752) (close: [#752](https://github.com/bytedance/UI-TARS-desktop/issues/752)) ([#753](https://github.com/bytedance/UI-TARS-desktop/pull/753)) ([37bcd7a](https://github.com/bytedance/UI-TARS-desktop/commit/37bcd7a0)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** enhance cli log ([0f44d03](https://github.com/bytedance/UI-TARS-desktop/commit/0f44d032)) [@chenhaoli](https://github.com/chenhaoli)

### Bug Fixes

* **agent-tars:** `browser_get_markdown` not found in `browser-use-only` mode ([#762](https://github.com/bytedance/UI-TARS-desktop/pull/762)) ([4a071d8](https://github.com/bytedance/UI-TARS-desktop/commit/4a071d89)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** set apiKey with env does not work ([#759](https://github.com/bytedance/UI-TARS-desktop/pull/759)) ([5612ab6](https://github.com/bytedance/UI-TARS-desktop/commit/5612ab6b)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** `write_file` does not display file content ([#758](https://github.com/bytedance/UI-TARS-desktop/pull/758)) ([0d0ecd3](https://github.com/bytedance/UI-TARS-desktop/commit/0d0ecd39)) [@ULIVZ](https://github.com/ULIVZ)

## [0.1.12-beta.4](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.1.12-beta.3...@agent-tars@0.1.12-beta.4) (2025-06-19)

### Features

* **agent-tars-cli:** bundle cli (close: #731) (close: [#731](https://github.com/bytedance/UI-TARS-desktop/issues/731)) ([#745](https://github.com/bytedance/UI-TARS-desktop/pull/745)) ([9a36ecb](https://github.com/bytedance/UI-TARS-desktop/commit/9a36ecbc)) [@ULIVZ](https://github.com/ULIVZ)

## [0.1.12-beta.3](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.1.12-beta.2...@agent-tars@0.1.12-beta.3) (2025-06-19)

### Features

* **agent-tars-cli:** `workspace` command ([#743](https://github.com/bytedance/UI-TARS-desktop/pull/743)) ([5e0a199](https://github.com/bytedance/UI-TARS-desktop/commit/5e0a1996)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** remove `agio` flag from cli ([#741](https://github.com/bytedance/UI-TARS-desktop/pull/741)) ([67b9e01](https://github.com/bytedance/UI-TARS-desktop/commit/67b9e011)) [@ULIVZ](https://github.com/ULIVZ)

## [0.1.12-beta.2](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.1.12-beta.1...@agent-tars@0.1.12-beta.2) (2025-06-19)

### Features

* **agent-tars-cli:** further optimize the installation size ([#731](https://github.com/bytedance/UI-TARS-desktop/pull/731)) ([ec042dc](https://github.com/bytedance/UI-TARS-desktop/commit/ec042dc7)) [@ULIVZ](https://github.com/ULIVZ)
