# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-10-10

### Added

#### Tarko Agent UI
- **feat(tarko-agent-ui)**: add copy link option to share conversation modal (#1706)
- **feat(tarko-agent-ui)**: improve raw mode renderer design (#1677)
- **feat(tarko-agent-ui)**: add clickable url links in terminal renderer json output (#1655)
- **feat(tarko-agent-ui)**: replace plus icon with lightning bolt for agent mode selector (#1674)
- **feat(tarko-agent-ui)**: welcome cards (#1643)
- **feat(tarko-agent-ui)**: add `webui.layout.enableHome` config (#1629)
- **feat(tarko-agent-ui)**: add `webui.layout.enableSidebar` config (#1624)
- **feat(tarko-agent-ui)**: mobile ui bottom sheet (#1563)
- **feat(tarko-agent-ui)**: new layout design (#1553)
- **feat(tarko-agent-ui)**: replaced generic tool renderer with terminal-style renderer (#1594)
- **feat(tarko-agent-ui)**: support line breaks in LinkReaderRenderer (#1482)
- **feat(tarko-agent-ui)**: enhance agent ui config system (#1464)
- **feat(tarko-agent-ui)**: display colored terminal output (#1476)
- **feat(tarko-agent-ui)**: disable model selector during agent run (#1520)
- **feat(tarko-agent-ui)**: sunsetting plan functionality (#1521)

#### Tarko Agent
- **feat(tarko-agent)**: enhance runtime settings with enum labels and UI placement control (#1638)
- **feat(tarko-agent)**: runtime settings (#1561)
- **feat(tarko-agent)**: remove engine-selector from agent kernel (#1576)
- **feat(tarko-agent)**: restore events on agent session restore (#1548)
- **feat(tarko-agent)**: thinking duration protocol and modernize thinking ui (#1423)
- **feat(tarko-agent)**: add messageId to thinking events for proper session correlation (#1282)
- **feat(tarko-agent)**: refine contextual selector (#1134)
- **feat(tarko-agent)**: add `onEachAgentLoopEnd` hook (#1111)

#### Tarko Agent Server
- **feat(tarko-agent-server)**: add `server.models` support (#1488)
- **feat(tarko-agent-server, agent-ui)**: return initialization events from session create (#1662)
- **feat(tarko-agent-server, agent-ui)**: refine arch of agent options and settings from home to session (#1645)
- **feat(tarko-agent-server-next)**: support replacing server global logger (#1554)
- **feat(tarko-agent-server-next)**: add initial events for agent when change model (#1552)

#### Tarko Agent CLI
- **feat(tarko-agent-cli)**: add `--model.displayName` option support (#1605)
- **feat(tarko-agent-cli)**: support unknown options passthrough (#1574)

#### Tarko Core
- **feat(tarko)**: add event stream viewer (#1374)
- **feat(tarko)**: implement MongoDB provider for agent server (#1450)
- **feat(tarko)**: `agui` cli for agent ui builder (#1446)
- **feat(tarko)**: init `@tarko/agent-ui-builder` (#1436)
- **feat(tarko)**: add navbar logo display options (#1443)
- **feat(tarko)**: move workspace navItems from header to navbar (#1441)
- **feat(tarko)**: add tabbed file viewer for `read_multiple_files` tool (#1438)
- **feat(tarko)**: add runtime settings api in server-next (#1634)
- **feat(tarko)**: add built-in agents support (#1208)
- **feat(tarko)**: add webui workspace panels support (#1206)
- **feat(tarko)**: add webUIConfig support to AgentConstructor (#1207)
- **feat(tarko)**: add intelligent auto-scroll to chat UI (#1203)

#### Agent TARS
- **feat(agent-tars)**: add welcome cards (#1685)
- **feat(agent-tars)**: support aio sandbox environment (#1573)
- **feat(agent-tars)**: disable contextual selector by default (#1621)
- **feat(agent-tars)**: emphasize python3 usage in system prompt (#1469)
- **feat(agent-tars)**: add static webui config to core (#1266)
- **feat(agent-tars)**: strict-typed gui agent procotol (#1295)

#### Omni Agent
- **feat(omni-agent)**: fix img compressor dependency issues (#1683)
- **feat(omni-agent)**: zoom out game welcome card (#1672)
- **feat(omni-agent)**: add functions prompt for game mode (#1668)
- **feat(omni-agent)**: optimize agent game mode UI (#1665)
- **feat(omni-agent)**: add default runtimeSettings (#1657)
- **feat(omni-agent)**: agentMode structure update; add game mode support (#1649)
- **feat(omni-agent)**: compress images for gui screenshot (#1647)
- **feat(omni-agent)**: update agent mode config structure (#1642)

#### GUI Agent
- **feat(o-gui-agent)**: set waiting time as 5s when initailize screenshot (#1671)
- **feat(o-gui-agent)**: support agent mode and game operator with enhanced error handling (#1656)
- **feat(o-gui-agent)**: insert preset messages before real query from user (#1661)
- **feat(o-gui-agent)**: support ChromeUI gui operation on AIO sandbox (#1383)
- **feat(o-gui-agent)**: support navigate action for new model (#1339)
- **feat(o-gui-agent)**: temporary solution for getting metadata when screenshot (#1341)

#### Game Mode
- **feat(game-mode)**: improve game agent mode error handling and user experience (#1673)

#### Model Provider
- **feat(model-provider)**: add automatic claude headers support (#1314)

#### MCP Agent
- **feat(tarko-mcp-agent)**: remove deprecated `mcpClientVersion` support (#1510)
- **feat(tarko-mcp-agent)**: adjust defaultConnectionTimeout from 180 to 60 seconds (#1505)
- **feat(tarko-mcp-agent)**: `defaultConnectionTimeout` option (#1462)

#### MCP Servers
- **feat(mcp-servers)**: support mcp offical registry (#1447)

#### Build & CI
- **feat: add `@tarko/agent-server-next`** (#1551)
- **feat(tarko-server-next)**: optimize parts of controller by avoiding go … (#1684)
- **feat(tarko-agent-next)**: sync code from agent-server (#1663)

### Fixed

#### Tarko Agent UI
- **fix(tarko-agent-ui)**: unexpected file renderer behaviors (#1705)
- **fix(tarko-agent-ui)**: preserve multimodal content format when navigating from home page (#1704)
- **fix(tarko-agent-ui)**: optimize health check polling to prevent unnecessary API calls (#1562)
- **fix(tarko-agent-ui)**: render error in tool raw mode renderer (#1659)
- **fix(tarko-agent-ui)**: display environment input on session creation (#1667)
- **fix(tarko-agent-ui)**: make welcome cards prompt optional (#1658)
- **fix(tarko-agent-ui)**: remove ugly container from ImageRenderer (#1639)
- **fix(tarko-agent-ui)**: code editor light mode highlighting (#1636)
- **fix(tarko-agent-ui)**: restore container and navbar in replay mode (#1615)
- **fix(tarko-agent-ui)**: restore fallback image upload when no runtime settings (#1619)
- **fix(tarko-agent-ui)**: improve `read_multiple_files` renderer parsing and error handling (#1606)
- **fix(tarko-agent-ui)**: tailwind cannot transpile styles from `@tarko/ui` (#1545)
- **fix(tarko-agent-ui)**: config issues (#1541)
- **fix(tarko-agent-ui)**: ugly tooltip (#1648)
- **fix(tarko-agent-ui)**: prevent undefined extension in code editor header (#1472)
- **fix(tarko-agent-ui)**: improve monaco editor line numbers spacing (#1571)
- **fix(tarko-agent-ui)**: support all SSE line separators in streaming (#1568)
- **fix(tarko-agent-ui)**: navbar overlap on small screens (#1519)

#### Tarko Agent Server
- **fix(tarko-agent-server)**: remove redundant event logging (#1703)
- **fix(tarko-agent-server)**: system setting api 404 issues (#1669)
- **fix(tarko-agent-server)**: fix agent events problem (#1666)
- **fix(tarko-agent-server)**: ensure agent initialize events are persisted (#1660)

#### Tarko Agent CLI
- **fix(tarko-agent-cli)**: merged webui config in script injection (close: #1626) (#1627)

#### Tarko Core
- **fix(tarko)**: preserve logo param in session routing (#1471)
- **fix(tarko)**: fetch actual remote config instead of local file (#1449)
- **fix(tarko)**: external `@tarko/agent-ui-builder` in agent-cli build (#1445)
- **fix(tarko)**: improve markdown inline code wrapping (#1439)
- **fix(tarko)**: resolve react key spread warning and hooks render issue (#1435)
- **fix(tarko)**: make thinking toggle default expanded without initial animation (#1432)
- **fix(tarko)**: prevent frequent `api/v1/models` calls by memoizing callbacks (#1378)
- **fix(tarko)**: improve scroll-to-bottom indicator edge case handling (#1429)
- **fix(tarko)**: prevent duplicate session loading in SessionRouter (#1427)
- **fix(tarko)**: add rollback error handling in sqlite migration (#1147)
- **fix(tarko)**: inline code dark mode text color (#1143)
- **fix(tarko)**: downgrade react-router-dom to v6 for compatibility (#1355)
- **fix(tarko)**: resolve infinite recursion in layoutModeAtom (#1356)
- **fix(tarko)**: fallback to beforeActionImage in afterAction strategy to prevent flickering (#1352)
- **fix(tarko)**: hide workspace navigation items in replay mode (#1350)
- **fix(tarko)**: persist agent web ui config in share (#1347)

#### Tarko Agent
- **fix(tarko-agent)**: prevent max-iter warning in test
- **fix(tarko-agent)**: should track elapsed time for tool execution errors (#1474)
- **fix(tarko-agent)**: wrong `agent_run_end` status (#1473)
- **fix(tarko-agent)**: improve JSON parsing in PromptEngineeringToolCallEngine (close: #1360) (#1361)

#### GUI Agent
- **fix(gui-agent)**: return original result onAfterToolCall hook (#1681)

#### AIO Hybrid Operator
- **fix(aio-hybrid-operator)**: transform arrowDirecton key to direction key (#1641)

#### Server Next
- **fix(tarko-server-next)**: remove unexisted routes (#1650)

#### Model Provider
- **fix(model-provider)**: native providers regression issue (#1503)

#### Browser
- **fix(browser)**: server declares logging capability but doesn't implement method logging/setLevel (#1334)

### Refactored

#### Tarko Agent UI
- **refactor(tarko-agent-ui)**: consolidate file display mode type definitions (#1637)
- **refactor(tarko-agent-ui)**: show terminal ui for empty execute_bash results (#1676)
- **refactor(tarko-agent-ui)**: refine ui infrastructure (#1546)
- **refactor(tarko-agent-ui)**: remove `final_answer` event handling (#1542)
- **refactor(tarko-agent-ui)**: make core low-level components stable (#1540)
- **refactor(tarko-agent-ui)**: remove `@headlessui/react` (#1539)
- **refactor(tarko-agent-ui)**: migrate stable editor atomics to `@tarko/ui` (#1537)
- **refactor(tarko-agent-ui)**: remove redundant motion animations (#1530)
- **refactor(tarko-agent-ui)**: remove parrot comments (#1528)
- **refactor(tarko-agent-ui)**: deduplicate muiTheme definitions (#1523)
- **refactor(tarko-agent-ui)**: remove redundant code and simplify components (#1527)
- **refactor(tarko-agent-ui)**: unify model display logic (#1525)

#### Tarko Agent CLI
- **refactor(tarko-agent-cli)**: simplify setup ui logic (#1631)

#### Tarko Core
- **refactor(tarko)**: optimize agent-server-next dao level (#1620)
- **refactor(tarko)**: sunsetting web socket (#1543)
- **refactor(tarko)**: rename `agent-web-ui` to `agent-ui` (#1434)
- **refactor(tarko)**: simplify code editor components (#1425)
- **refactor(tarko)**: remove excessive dots from empty states (#1414)
- **refactor(tarko)**: simplify chatpanel state logic (#1381)
- **refactor(tarko)**: remove language badge from code renderer header (#1470)
- **refactor(tarko)**: remove unnecessary abstraction and redundant state updates (#1380)
- **refactor(tarko)**: rename `SessionItemInfo` to `SessionInfo` (#1440)
- **refactor(tarko)**: simplify screenshot display state management (#1390)
- **refactor(tarko-web-ui)**: centralize markdown theme architecture (#1325)
- **refactor(common)**: extract LoadingSpinner and unify modal styles (#1317)
- **refactor(tarko)**: remove unused workspace utilities (#1238)
- **refactor(tarko)**: extract shared terminal component (#1264)
- **refactor(tarko)**: remove over-designed language support (#1263)
- **refactor(tarko)**: remove redundant FileRenderer wrapper (#1260)
- **refactor(tarko)**: merge EditFileRenderer into DiffRenderer (#1259)
- **refactor(tarko)**: consolidate state atoms (#1237)
- **refactor(tarko-web-ui)**: extract tooltip props to shared config (#1300)

#### GUI Agent
- **refactor(gui-agent)**: refactor composable gui agent with improved stability and error handling (#1556)
- **refactor(gui-agent)**: refactor SDK with new operators support and enhanced configuration (#1618)
- **refactor(gui-agent)**: enhance action parser and add comprehensive utilities (#1617)
- **refactor(gui-agent)**: refactor gui agent sdk: agent, action-parser and operator (#1550)

#### MCP Agent
- **refactor(mcp-agent)**: improve type safety and docs (#1511)

#### Agent TARS
- **refactor(agent-tars)**: improve code architecture and docs (#1498)

#### Model Provider
- **refactor(model-provider)**: improve docs and add tests (#1489)

### Documentation

#### Tarko
- **docs(tarko)**: enhance agent api (#1689)
- **docs(tarko)**: refactor agent hooks (#1688)
- **docs(tarko)**: remove troubleshooting (#1702)
- **docs(tarko)**: keep terminology untranslated in zh docs (#1695)
- **docs(tarko)**: using semantic model id for code examples (#1687)
- **docs(tarko)**: agent ui config api reference (#1653)
- **docs(tarko)**: runtime settings api (#1654)
- **docs(tarko)**: restructure cli documentation into separate sections (#1610)
- **docs(tarko)**: fix agent options in examples (#1602)
- **docs(tarko)**: agent api documentation improvements (#1601)
- **docs(tarko)**: complete zh getting-started examples (#1603)
- **docs(tarko)**: sync zh agent api docs with en version (#1600)
- **docs(tarko)**: refactor agent options (#1596)
- **docs(tarko)**: fix duplicate links and inaccurate interface examples (#1595)
- **docs(tarko)**: merge agent snapshot (#1591)
- **docs(tarko)**: refine agent hooks (#1586)
- **docs(tarko)**: migrate tool docs (#1585)
- **docs(tarko)**: refactor tool documentation (#1579)
- **docs(tarko)**: align zh introduction with en version (#1581)
- **docs(tarko-agent-cli)**: optimize README.md (#1578)
- **docs(tarko-agent)**: init documentation (#1502)
- **docs(tarko)**: enhance agent-server documentation (#1164)
- **docs(tarko)**: improve agent-cli documentation (#1162)
- **docs(tarko)**: add comprehensive event stream documentation (#1242)

#### Agent TARS
- **docs(agent-tars)**: fix the wrong tsconfig paths (#1710)
- **docs(agent-tars)**: fix showcase not found (#1708)
- **docs(agent-tars)**: ensure consistent background across all pages (#1589)
- **docs(agent-tars)**: add blog index page (#1588)
- **docs(agent-tars)**: agent api documentation (#1459)
- **docs(agent-tars)**: update video introduction url (#1248)
- **docs(agent-tars)**: agent hooks (#1277)

#### General
- **docs**: correct typo in mcp documentation (#1516)
- **docs**: refine `useCursor` implementation (#1501)
- **docs**: upgrade rspress to v2.0.0-beta.32 (#1495)
- **docs**: add `@tarko/mcp-agent` (#1458)
- **docs**: remove duplicate header (#1559)
- **docs**: clarify instructions field behavior (#1059)
- **docs**: fix missing useI18n import in NotFoundLayout (#1265)

### Tests

#### Agent TARS
- **test(agent-tars)**: update browser control snapshots (#1707)

### CI/CD

#### Tarko Agent Server
- **ci(tarko-agent-server)**: add missing `getOptions` method to fix tests (#1675)

#### PNPM Toolkit
- **ci(tarko-pnpm-toolkit)**: filter canary releases in release note generation (#1570)
- **ci(pnpm-toolkit)**: add `--auto-create-release-branch` support (#1535)
- **ci(pnpm-toolkit)**: add canary release support (#1534)
- **ci(ptk)**: github release (#1428)
- **ci(ptk)**: extract github username from noreply email (#1456)
- **ci(ptk)**: handle missing git tags in changelog generation (#1372)
- **ci(ptk)**: add `--no-verify` to release commits (#1369)
- **ci(ptk)**: update release commit scope from agent-tars to tars-stack (#1368)

### Chores

#### Omni Agent
- **chore(omni-agent)**: update games (#1670)
- **chore(o-gui-agent)**: optimize agent game mode's processing (#1664)
- **chore(o-agent)**: disable gui agent screenshot switch and render (#1385)
- **chore(o-agent)**: update display texts (#1351)
- **chore(o-agent)**: update example prompts (#1417)
- **chore(omni-tars)**: correct grammar in welcome prompt (#1454)
- **chore(omni-tars)**: remove unused prompt (#1221)
- **chore(omni-tars)**: fix dev:agent launch issue

#### Tarko
- **chore(tarko)**: remove codeblock action buttons (#1344)
- **chore(tarko)**: improve gui agent screenshot ui layout and placeholder (#1302)
- **chore(tarko)**: enhance code block spacing (#1400)
- **chore(tarko)**: override strikethrough (del) to render as normal text (#1219)
- **chore(tarko)**: replace @ui-tars/operator-browser with local @gui-agent/operator-browser (#1278)
- **chore(tarko)**: fix which final environment is shown after non-screensh… (#1209)
- **chore(tarko)**: remove fallback when no screenshot is available

#### Agent
- **chore(agent)**: clean legacy examples (#1487)
- **chore(agent)**: update default layout config (#1311)

#### All
- **chore(all)**: fix changelog generation (#1420)
- **chore(all)**: fix changelog filter scopes and restore missing entries (#1418)
- **chore(all)**: fix grammar typo (#1367)
- **chore(all)**: unify naming case of webui config (#1269)
- **chore(all)**: standardize the written terminology of Omni-TARS (#1235)

#### General
- **chore**: fix typos across codebase (#643)
- **chore**: remove unused and outdated files (#1566)
- **chore**: fix expired lark link (close: #1564) (#1565)
- **chore**: disable `editor.formatOnSave` setting (#1486)
- **chore**: only enable `route.exclude` in production build

#### Releases
- **chore(tars-stack)**: release 0.3.0-beta.12 (#1569)
- **chore(tars-stack)**: release 0.3.0-beta.11 (#1453)
- **chore(tars-stack)**: release 0.3.0-beta.10 (#1419)
- **chore(tars-stack)**: release 0.3.0-beta.9 (#1396)
- **chore(tars-stack)**: release 0.3.0-beta.8 (#1366)
- **chore(agent-tars)**: release 0.3.0-beta.7 (#1348)
- **chore(agent-tars)**: release 0.3.0-beta.6 (#1257)
- **chore(agent-tars)**: release 0.3.0-beta.5 (#1227)
- **chore(agent-tars)**: release 0.3.0-beta.4 (#1215)

### Platform Enhancements

- **feat**: TARS platform enhancements and compatibility fixes (#1680)
- **feat**: enhance streaming for o-agent with improved parsing and processing (#1294)
- **feat**: enhance o-agent with session state management and Jupyter CI support (#1186)
- **feat**: upgrade @agent-infra/sandbox package and add health check (#1188)
- **feat**: enhance code agent and model output adaptation (#1108)
- **feat**: add gui agent powered by tarko (#1031)

---

## Summary

This release includes **294 commits** from `7e50908b6cfdba3d09744869a1f3fd5c6489d3ee` to latest, covering:

- **115 new features** across Tarko Agent UI, Tarko Agent, Agent TARS, Omni Agent, GUI Agent, and core infrastructure
- **47 bug fixes** improving stability and user experience
- **31 refactoring efforts** for better code maintainability and architecture
- **35 documentation improvements** enhancing developer experience
- **16 CI/CD enhancements** for better development workflow
- **50 maintenance tasks** including releases, cleanups, and optimizations

### Key Highlights

1. **Major UI/UX Improvements**: New layout design, mobile support, enhanced renderers, and better user interactions
2. **Runtime Settings System**: Comprehensive runtime configuration support across the platform
3. **Enhanced Agent Capabilities**: Better tool handling, streaming support, and error management
4. **GUI Agent Integration**: Full integration of GUI agent capabilities with improved stability
5. **Documentation Overhaul**: Comprehensive documentation improvements across all packages
6. **Architecture Refinements**: Significant refactoring efforts for better maintainability
7. **Platform Compatibility**: Enhanced support for various deployment scenarios and configurations

### Breaking Changes

- Migration from `agent-web-ui` to `agent-ui` package naming
- Removal of deprecated `mcpClientVersion` support in MCP Agent
- Sunsetting of WebSocket support in favor of SSE
- Changes to agent configuration structure for better consistency

### Migration Guide

Please refer to the individual package documentation for specific migration instructions when upgrading from previous versions.