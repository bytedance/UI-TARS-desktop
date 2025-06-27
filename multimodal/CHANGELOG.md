# Changelog

## [0.2.3](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.2.2...@agent-tars@0.2.3) (2025-06-25)

### Features

* **agent-tars:** enhance file result display ([dfb3417](https://github.com/bytedance/UI-TARS-desktop/commit/dfb34173)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** do not display JSON_DATA ([9f6b638](https://github.com/bytedance/UI-TARS-desktop/commit/9f6b6387)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** optimize user message render ([8ced4cd](https://github.com/bytedance/UI-TARS-desktop/commit/8ced4cda)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** support preview output string containing image ([09bf91a](https://github.com/bytedance/UI-TARS-desktop/commit/09bf91a3)) [@chenhaoli](https://github.com/chenhaoli)

### Bug Fixes

* **agent-tars:** cannot custom mcp servers ([544504b](https://github.com/bytedance/UI-TARS-desktop/commit/544504b4)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** support copy agent response ([f05f6c9](https://github.com/bytedance/UI-TARS-desktop/commit/f05f6c95)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** command line highlight issue ([1f267d0](https://github.com/bytedance/UI-TARS-desktop/commit/1f267d0d)) [@chenhaoli](https://github.com/chenhaoli)

## [0.2.2](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.2.1...@agent-tars@0.2.2) (2025-06-25)

### Features

* **agent-tars:** enhance description for `browser_screenshot` ([51d2eb4](https://github.com/bytedance/UI-TARS-desktop/commit/51d2eb46)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance file result display ([0a6b9b9](https://github.com/bytedance/UI-TARS-desktop/commit/0a6b9b92)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** inline code render issue ([24b442b](https://github.com/bytedance/UI-TARS-desktop/commit/24b442b7)) [@chenhaoli](https://github.com/chenhaoli)

### Bug Fixes

* **agent-tars-web-ui:** short string effect in dark mode ([e429888](https://github.com/bytedance/UI-TARS-desktop/commit/e429888c)) [@chenhaoli](https://github.com/chenhaoli)

## [0.2.1](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.2.0...@agent-tars@0.2.1) (2025-06-24)

### Features

* **agent-tars:** always create new navigation screenshot for gui agent ([#805](https://github.com/bytedance/UI-TARS-desktop/pull/805)) ([5d720b4](https://github.com/bytedance/UI-TARS-desktop/commit/5d720b4a)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** support recover browser ([#804](https://github.com/bytedance/UI-TARS-desktop/pull/804)) ([428f6d9](https://github.com/bytedance/UI-TARS-desktop/commit/428f6d90)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** speed up `browser_navigate` ([#803](https://github.com/bytedance/UI-TARS-desktop/pull/803)) ([ae0b480](https://github.com/bytedance/UI-TARS-desktop/commit/ae0b4807)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** `workspace --init` should not remove existing files ([#800](https://github.com/bytedance/UI-TARS-desktop/pull/800)) ([1701e9e](https://github.com/bytedance/UI-TARS-desktop/commit/1701e9eb)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-server:** make agio request silent ([#802](https://github.com/bytedance/UI-TARS-desktop/pull/802)) ([5bbccb0](https://github.com/bytedance/UI-TARS-desktop/commit/5bbccb09)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** enhance message input and code block render ([#806](https://github.com/bytedance/UI-TARS-desktop/pull/806)) ([aa78525](https://github.com/bytedance/UI-TARS-desktop/commit/aa785252)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** dark mode by default ([#793](https://github.com/bytedance/UI-TARS-desktop/pull/793)) ([c418b19](https://github.com/bytedance/UI-TARS-desktop/commit/c418b19d)) [@ULIVZ](https://github.com/ULIVZ)

## [0.2.0](https://github.com/bytedance/UI-TARS-desktop/compare/@agent-tars@0.1.11...@agent-tars@0.2.0) (2025-06-24)

### Features

* **agent:** support `onRetrieveTools` hook (close: #711) (close: [#711](https://github.com/bytedance/UI-TARS-desktop/issues/711)) ([#713](https://github.com/bytedance/UI-TARS-desktop/pull/713)) ([76fa76f](https://github.com/bytedance/UI-TARS-desktop/commit/76fa76fb)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** support `browser_screenshot` tool for DOM-based control ([#794](https://github.com/bytedance/UI-TARS-desktop/pull/794)) ([7e50908](https://github.com/bytedance/UI-TARS-desktop/commit/7e50908b)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** support display image of `browser_navigate` ([#792](https://github.com/bytedance/UI-TARS-desktop/pull/792)) ([8970638](https://github.com/bytedance/UI-TARS-desktop/commit/89706386)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** refine agent tars browser control api ([#782](https://github.com/bytedance/UI-TARS-desktop/pull/782)) ([7072142](https://github.com/bytedance/UI-TARS-desktop/commit/70721424)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** bump `@agent-infra/mcp-server-*` to `1.1.10` ([#775](https://github.com/bytedance/UI-TARS-desktop/pull/775)) ([23ecc2d](https://github.com/bytedance/UI-TARS-desktop/commit/23ecc2dd)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** refine snapshot public api ([#765](https://github.com/bytedance/UI-TARS-desktop/pull/765)) ([3f6e101](https://github.com/bytedance/UI-TARS-desktop/commit/3f6e1016)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** add gui agent grounding check (close: #760) (close: [#760](https://github.com/bytedance/UI-TARS-desktop/issues/760)) ([#761](https://github.com/bytedance/UI-TARS-desktop/pull/761)) ([d418a20](https://github.com/bytedance/UI-TARS-desktop/commit/d418a20e)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** init docs ([#715](https://github.com/bytedance/UI-TARS-desktop/pull/715)) ([690e520](https://github.com/bytedance/UI-TARS-desktop/commit/690e520a)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** optimize search keyword decisions (close: #698) (close: [#698](https://github.com/bytedance/UI-TARS-desktop/issues/698)) ([#700](https://github.com/bytedance/UI-TARS-desktop/pull/700)) ([a66df06](https://github.com/bytedance/UI-TARS-desktop/commit/a66df06d)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** first stable version ([#678](https://github.com/bytedance/UI-TARS-desktop/pull/678)) ([bb8ea44](https://github.com/bytedance/UI-TARS-desktop/commit/bb8ea44e)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** enhance loaidng ([6def285](https://github.com/bytedance/UI-TARS-desktop/commit/6def285d)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** enhance image zoom ([2ed79f1](https://github.com/bytedance/UI-TARS-desktop/commit/2ed79f1a)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** enhance sp for multimodal_understanding ([db562e5](https://github.com/bytedance/UI-TARS-desktop/commit/db562e59)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** add prompt about BROWSER ERROR RECOVERY" ([94791e3](https://github.com/bytedance/UI-TARS-desktop/commit/94791e33)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** add prompt about BROWSER ERROR RECOVERY ([b5a846e](https://github.com/bytedance/UI-TARS-desktop/commit/b5a846eb)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** close browser pages after agent run finished ([27132e7](https://github.com/bytedance/UI-TARS-desktop/commit/27132e78)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** enhance environment input display ([66f5bbe](https://github.com/bytedance/UI-TARS-desktop/commit/66f5bbe0)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** support image impress ([2fc48cb](https://github.com/bytedance/UI-TARS-desktop/commit/2fc48cb3)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** using fatest speed for browser navigation ([c807880](https://github.com/bytedance/UI-TARS-desktop/commit/c807880e)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** support run with `--debug` and `pipe` ([30828d9](https://github.com/bytedance/UI-TARS-desktop/commit/30828d9c)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** support load config from global workspce ([#763](https://github.com/bytedance/UI-TARS-desktop/pull/763)) ([e4006e9](https://github.com/bytedance/UI-TARS-desktop/commit/e4006e9f)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** display current model info (close: #756) (close: [#756](https://github.com/bytedance/UI-TARS-desktop/issues/756)) ([#757](https://github.com/bytedance/UI-TARS-desktop/pull/757)) ([2fe407b](https://github.com/bytedance/UI-TARS-desktop/commit/2fe407b9)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** fine-grained global workspace control (close: #754) (close: [#754](https://github.com/bytedance/UI-TARS-desktop/issues/754)) ([#755](https://github.com/bytedance/UI-TARS-desktop/pull/755)) ([19aba6b](https://github.com/bytedance/UI-TARS-desktop/commit/19aba6b6)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** config `--workspace` shortcut (close: #752) (close: [#752](https://github.com/bytedance/UI-TARS-desktop/issues/752)) ([#753](https://github.com/bytedance/UI-TARS-desktop/pull/753)) ([37bcd7a](https://github.com/bytedance/UI-TARS-desktop/commit/37bcd7a0)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** enhance cli log ([0f44d03](https://github.com/bytedance/UI-TARS-desktop/commit/0f44d032)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** bundle cli (close: #731) (close: [#731](https://github.com/bytedance/UI-TARS-desktop/issues/731)) ([#745](https://github.com/bytedance/UI-TARS-desktop/pull/745)) ([9a36ecb](https://github.com/bytedance/UI-TARS-desktop/commit/9a36ecbc)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** `workspace` command ([#743](https://github.com/bytedance/UI-TARS-desktop/pull/743)) ([5e0a199](https://github.com/bytedance/UI-TARS-desktop/commit/5e0a1996)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** remove `agio` flag from cli ([#741](https://github.com/bytedance/UI-TARS-desktop/pull/741)) ([67b9e01](https://github.com/bytedance/UI-TARS-desktop/commit/67b9e011)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** further optimize the installation size ([#731](https://github.com/bytedance/UI-TARS-desktop/pull/731)) ([ec042dc](https://github.com/bytedance/UI-TARS-desktop/commit/ec042dc7)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** remove deprecation warning ([#721](https://github.com/bytedance/UI-TARS-desktop/pull/721)) ([01439cd](https://github.com/bytedance/UI-TARS-desktop/commit/01439cd3)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** support `agent-tars run` (close: #689) (close: [#689](https://github.com/bytedance/UI-TARS-desktop/issues/689)) ([#690](https://github.com/bytedance/UI-TARS-desktop/pull/690)) ([98fd167](https://github.com/bytedance/UI-TARS-desktop/commit/98fd1679)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** some enhancements ([#676](https://github.com/bytedance/UI-TARS-desktop/pull/676)) ([34534f6](https://github.com/bytedance/UI-TARS-desktop/commit/34534f64)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** support `--open` flag ([9c08f2d](https://github.com/bytedance/UI-TARS-desktop/commit/9c08f2da)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** refine bin name ([df3681e](https://github.com/bytedance/UI-TARS-desktop/commit/df3681ee)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** support config version ([9dcf277](https://github.com/bytedance/UI-TARS-desktop/commit/9dcf2775)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** better cli log ([ca1d3f6](https://github.com/bytedance/UI-TARS-desktop/commit/ca1d3f6a)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-server:** `GET api/sessions/events/latest` (close: #691) (close: [#691](https://github.com/bytedance/UI-TARS-desktop/issues/691)) ([#692](https://github.com/bytedance/UI-TARS-desktop/pull/692)) ([d2dfc14](https://github.com/bytedance/UI-TARS-desktop/commit/d2dfc14c)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-server:** build failed ([dcb6099](https://github.com/bytedance/UI-TARS-desktop/commit/dcb6099a)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-server:** empty workspace state ([93b9488](https://github.com/bytedance/UI-TARS-desktop/commit/93b9488e)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-server:** compress user input image ([3c770ce](https://github.com/bytedance/UI-TARS-desktop/commit/3c770ce6)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance replay effect ([#793](https://github.com/bytedance/UI-TARS-desktop/pull/793)) ([c975e80](https://github.com/bytedance/UI-TARS-desktop/commit/c975e808)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** enhance session search ([#786](https://github.com/bytedance/UI-TARS-desktop/pull/786)) ([51cd8f8](https://github.com/bytedance/UI-TARS-desktop/commit/51cd8f8a)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** new assistant ui ([dee2650](https://github.com/bytedance/UI-TARS-desktop/commit/dee26501)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance message and markdown renderer ([#780](https://github.com/bytedance/UI-TARS-desktop/pull/780)) ([ce60268](https://github.com/bytedance/UI-TARS-desktop/commit/ce602689)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** introduce new `run_command` ui ([#777](https://github.com/bytedance/UI-TARS-desktop/pull/777)) ([85a0f62](https://github.com/bytedance/UI-TARS-desktop/commit/85a0f62a)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** support multiple-line input in home ([#764](https://github.com/bytedance/UI-TARS-desktop/pull/764)) ([9b6f5be](https://github.com/bytedance/UI-TARS-desktop/commit/9b6f5bee)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** move markdown render to sdk ([219ecb2](https://github.com/bytedance/UI-TARS-desktop/commit/219ecb20)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance loading indicator ([f9c6980](https://github.com/bytedance/UI-TARS-desktop/commit/f9c6980a)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** add deliverable renderer ([d01f76d](https://github.com/bytedance/UI-TARS-desktop/commit/d01f76dd)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** clean browser when new session is created ([2a96381](https://github.com/bytedance/UI-TARS-desktop/commit/2a963813)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance markdown render ([92e4c4b](https://github.com/bytedance/UI-TARS-desktop/commit/92e4c4b4)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance result render ([322d301](https://github.com/bytedance/UI-TARS-desktop/commit/322d3015)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance generic result renderer ([484dfe2](https://github.com/bytedance/UI-TARS-desktop/commit/484dfe21)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** support replay button after replay finished ([c82c6bc](https://github.com/bytedance/UI-TARS-desktop/commit/c82c6bcc)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance delete session ui ([f37df62](https://github.com/bytedance/UI-TARS-desktop/commit/f37df62e)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** support write_file tool call display ([f5e5e3a](https://github.com/bytedance/UI-TARS-desktop/commit/f5e5e3a4)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** environment input should only attach to the last assistant message ([79a3aba](https://github.com/bytedance/UI-TARS-desktop/commit/79a3aba0)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance tool bar button ([a629869](https://github.com/bytedance/UI-TARS-desktop/commit/a6298694)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance event processor" ([90a9f33](https://github.com/bytedance/UI-TARS-desktop/commit/90a9f33d)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance event processor ([a4cf87d](https://github.com/bytedance/UI-TARS-desktop/commit/a4cf87df)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance image preview ([78352bf](https://github.com/bytedance/UI-TARS-desktop/commit/78352bf9)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** click assistant message to last Environment ([3ffc128](https://github.com/bytedance/UI-TARS-desktop/commit/3ffc1284)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** image upload ([f3b880b](https://github.com/bytedance/UI-TARS-desktop/commit/f3b880b0)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** do not render browser snapshot ([7cabdbc](https://github.com/bytedance/UI-TARS-desktop/commit/7cabdbce)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** remove unused ui and update tool block ([0972e84](https://github.com/bytedance/UI-TARS-desktop/commit/0972e84f)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** display last environment in `handleAssistantMessage` ([a676cef](https://github.com/bytedance/UI-TARS-desktop/commit/a676cef9)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** enhance panel image render ([de3472c](https://github.com/bytedance/UI-TARS-desktop/commit/de3472c6)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** support image paste ([dad7fb9](https://github.com/bytedance/UI-TARS-desktop/commit/dad7fb9c)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** re-design the welcome page ([cf245cc](https://github.com/bytedance/UI-TARS-desktop/commit/cf245cce)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** refactor browser_navigate display ([dd319db](https://github.com/bytedance/UI-TARS-desktop/commit/dd319db6)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** hide sidebar by default ([22b238c](https://github.com/bytedance/UI-TARS-desktop/commit/22b238c9)) [@chenhaoli](https://github.com/chenhaoli)

### Bug Fixes

* **agent:** streaming mode missing `agent_run_start` and `agent_run_end` event ([#789](https://github.com/bytedance/UI-TARS-desktop/pull/789)) ([82f28fb](https://github.com/bytedance/UI-TARS-desktop/commit/82f28fba)) [@ULIVZ](https://github.com/ULIVZ)
* **agent:** tool schema miss `properties` in native tool call (close: #769) (close: [#769](https://github.com/bytedance/UI-TARS-desktop/issues/769)) ([#770](https://github.com/bytedance/UI-TARS-desktop/pull/770)) ([ac810fe](https://github.com/bytedance/UI-TARS-desktop/commit/ac810fe3)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-core:** context limit should not exit the process (close: #684) (close: [#684](https://github.com/bytedance/UI-TARS-desktop/issues/684)) ([#686](https://github.com/bytedance/UI-TARS-desktop/pull/686)) ([ae387ed](https://github.com/bytedance/UI-TARS-desktop/commit/ae387ed0)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** display wrong model info after switch model ([#790](https://github.com/bytedance/UI-TARS-desktop/pull/790)) ([c7440ff](https://github.com/bytedance/UI-TARS-desktop/commit/c7440ff7)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** gui agent grounding check won't work when `browser.control` is not configured (close: #773) (close: [#773](https://github.com/bytedance/UI-TARS-desktop/issues/773)) ([#774](https://github.com/bytedance/UI-TARS-desktop/pull/774)) ([97446af](https://github.com/bytedance/UI-TARS-desktop/commit/97446af6)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** `browser_get_markdown` not found in `browser-use-only` mode ([#762](https://github.com/bytedance/UI-TARS-desktop/pull/762)) ([4a071d8](https://github.com/bytedance/UI-TARS-desktop/commit/4a071d89)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars:** support new `browser_screenshot` tool to save screenshot ([a6e5f36](https://github.com/bytedance/UI-TARS-desktop/commit/a6e5f369)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** remove default language prompt ([2e8ac46](https://github.com/bytedance/UI-TARS-desktop/commit/2e8ac467)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars:** close browser pages does not work ([38263f5](https://github.com/bytedance/UI-TARS-desktop/commit/38263f50)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-cli:** set apiKey with env does not work ([#759](https://github.com/bytedance/UI-TARS-desktop/pull/759)) ([5612ab6](https://github.com/bytedance/UI-TARS-desktop/commit/5612ab6b)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** web ui should be dev dependency (related to: #731) (close: [#731](https://github.com/bytedance/UI-TARS-desktop/issues/731)) ([#732](https://github.com/bytedance/UI-TARS-desktop/pull/732)) ([e9606a6](https://github.com/bytedance/UI-TARS-desktop/commit/e9606a67)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-cli:** displays old version (close: #729) (close: [#729](https://github.com/bytedance/UI-TARS-desktop/issues/729)) ([#730](https://github.com/bytedance/UI-TARS-desktop/pull/730)) ([248fa0e](https://github.com/bytedance/UI-TARS-desktop/commit/248fa0eb)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-server:** `workingDirectory` error when snapshot is enabled (close: #724) (close: [#724](https://github.com/bytedance/UI-TARS-desktop/issues/724)) ([#725](https://github.com/bytedance/UI-TARS-desktop/pull/725)) ([953f6c6](https://github.com/bytedance/UI-TARS-desktop/commit/953f6c6b)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-server:** share slug ([45910ae](https://github.com/bytedance/UI-TARS-desktop/commit/45910aeb)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-server:** do not exit process even if agent run failed ([caa5a72](https://github.com/bytedance/UI-TARS-desktop/commit/caa5a723)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-server:** wrong output when tool call contains html ([c9ad331](https://github.com/bytedance/UI-TARS-desktop/commit/c9ad331c)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-server:** TypeError: Cannot read properties of undefined (reading 'provider') ([e865780](https://github.com/bytedance/UI-TARS-desktop/commit/e8657809)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** missing view final environment state entry ([d0da001](https://github.com/bytedance/UI-TARS-desktop/commit/d0da001a)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** `write_file` does not display file content ([#758](https://github.com/bytedance/UI-TARS-desktop/pull/758)) ([0d0ecd3](https://github.com/bytedance/UI-TARS-desktop/commit/0d0ecd39)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** resolve panel UI flicker (close: #696) (close: [#696](https://github.com/bytedance/UI-TARS-desktop/issues/696)) ([#697](https://github.com/bytedance/UI-TARS-desktop/pull/697)) ([752fb77](https://github.com/bytedance/UI-TARS-desktop/commit/752fb778)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** workspace should render `read_file` (close: #693) (close: [#693](https://github.com/bytedance/UI-TARS-desktop/issues/693)) ([#694](https://github.com/bytedance/UI-TARS-desktop/pull/694)) ([4da9ab0](https://github.com/bytedance/UI-TARS-desktop/commit/4da9ab0b)) [@ULIVZ](https://github.com/ULIVZ)
* **agent-tars-web-ui:** enhance workspace ui ([e79f52a](https://github.com/bytedance/UI-TARS-desktop/commit/e79f52a0)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** refine browser tool result display ([67cd30e](https://github.com/bytedance/UI-TARS-desktop/commit/67cd30ee)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** smart tool result render ([93edf25](https://github.com/bytedance/UI-TARS-desktop/commit/93edf251)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** do not go to home after session is deleted ([42a05cd](https://github.com/bytedance/UI-TARS-desktop/commit/42a05cd6)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** copy link button position 2 ([a4a6a20](https://github.com/bytedance/UI-TARS-desktop/commit/a4a6a201)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** copy link button position ([93c550b](https://github.com/bytedance/UI-TARS-desktop/commit/93c550b4)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** user message render ([8eeb1b8](https://github.com/bytedance/UI-TARS-desktop/commit/8eeb1b89)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** message style ([f366845](https://github.com/bytedance/UI-TARS-desktop/commit/f366845a)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** delay state of chat event ([df13de8](https://github.com/bytedance/UI-TARS-desktop/commit/df13de88)) [@chenhaoli](https://github.com/chenhaoli)
* **agent-tars-web-ui:** sse parser cannot parse long chunk ([4fda1e7](https://github.com/bytedance/UI-TARS-desktop/commit/4fda1e77)) [@chenhaoli](https://github.com/chenhaoli)

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
