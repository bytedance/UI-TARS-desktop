# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-10-10

This release includes **626 commits** from `7e50908b6cfdba3d09744869a1f3fd5c6489d3ee` to latest.

### Added

#### Agen Tars Cli
- **feat(agen-tars-cli): `serve` command should be headless**

#### Agent
- **feat(agent): move aio client to core package, add unit test for parser (#1113)**
- **feat(agent): add `dispose` api and `onDispose` hook (#997)**
- **feat(agent): add  `getTools` type (#996)**
- **feat(agent): support custom tool call engine constructor (#956)**

#### Agent Cli
- **feat(agent-cli): auto-detect available port to prevent conflicts (close: #1141) (#1142)**

#### Agent Kernel
- **feat(agent-kernel): remove system abort message (#948)**
- **feat(agent-kernel): handle dynamic tools (#892)**
- **feat(agent-kernel): `onPrepareRequest` hook (#889) (#890)**
- **feat(agent-kernel): remove `assistant_streaming_tool_call` support for `StructuredOutputsToolCallEngine`**
- **feat(agent-kernel): add `enableStreamingToolCallEvents` option (#885)**
- **feat(agent-kernel): introduce state-machine-based parser for kor (#884)**
- **feat(agent-kernel): streaming tool call (#881)**

#### Agent Server
- **feat(agent-server): support remote static html and add share for server-next (#1558)**
- **feat(agent-server): handle old workspace schema migration (#1030)**

#### Agent Tars
- **feat(agent-tars): add welcome cards (#1685)**
- **feat(agent-tars): disable contextual selector by default (#1621)**
- **feat(agent-tars): support aio sandbox environment (#1573)**
- **feat(agent-tars): emphasize python3 usage in system prompt (#1469)**
- **feat(agent-tars): strict-typed gui agent procotol (#1295)**
- **feat(agent-tars): add static webui config to core (#1266)**
- **feat(agent-tars): support flexible system prompt override (#1151)**
- **feat(agent-tars): custom agent**
- **feat(agent-tars): handle generated files sharing (#941)**
- **feat(agent-tars): enhance system instruction for reporter (#939)**
- **feat(agent-tars): enable stop_sequences for kor engine**
- **feat(agent-tars): clean up old planner (#889)**
- **feat(agent-tars): search tool support connect to remote browser**
- **feat(agent-tars): enhance file result display**
- **feat(agent-tars): enhance description for `browser_screenshot`**
- **feat(agent-tars): always create new navigation screenshot for gui agent (#805)**
- **feat(agent-tars): support recover browser (#804)**
- **feat(agent-tars): speed up `browser_navigate` (#803)**

#### Agent Tars Cli
- **feat(agent-tars-cli): `read_file` supports preview markdown file (close: #814) (#849)**
- **feat(agent-tars-cli): support `agent-tars run --cache` by default (#844)**
- **feat(agent-tars-cli): enable `--no-warnings` with safe `shebang` parsing (#845)**
- **feat(agent-tars-cli): enhance `AGENT_TARS_BASE_URL` to support cloud serving**
- **feat(agent-tars-cli): support `--browser.cdpEndpoint` to connect remote browser**
- **feat(agent-tars-cli): `workspace --init` should not remove existing files (#800)**

#### Agent Tars Desktop
- **feat(agent-tars-desktop): add deprecation warning (#839)**

#### Agent Tars Docs
- **feat(agent-tars-docs): add replay route page (#915)**

#### Agent Tars Server
- **feat(agent-tars-server): session read optimization (close: #750) (#974)**
- **feat(agent-tars-server): serve generated file (#940)**
- **feat(agent-tars-server): generate short share slug (#919)**
- **feat(agent-tars-server): add `/api/v1/version` (#913)**
- **feat(agent-tars-server): support oneshot api**
- **feat(agent-tars-server): make agio request silent (#802)**

#### Agent Tars Web Ui
- **feat(agent-tars-web-ui): simplify replay state (#989)**
- **feat(agent-tars-web-ui): move model info to about modal (#961)**
- **feat(agent-tars-web-ui): refine generated files entry (#953)**
- **feat(agent-tars-web-ui): normalize file path for privacy (#952)**
- **feat(agent-tars-web-ui): support share generate files (#951)**
- **feat(agent-tars-web-ui): refine share behavior (#950)**
- **feat(agent-tars-web-ui): enhance html file streaming render (#935)**
- **feat(agent-tars-web-ui): render streaming tool call (#887)**
- **feat(agent-tars-web-ui): more compact workspace (#931)**
- **feat(agent-tars-web-ui): support tool call duration (close: #827) (#929)**
- **feat(agent-tars-web-ui): initial support for mobile-side layout (#928)**
- **feat(agent-tars-web-ui): display rendered HTML by default (#926)**
- **feat(agent-tars-web-ui): add about entry to display version (#914)**
- **feat(agent-tars-web-ui): enhance share and replay experience (#910)**
- **feat(agent-tars-web-ui): new code file renderer (#874)**
- **feat(agent-tars-web-ui): using native scrollbar (#868)**
- **feat(agent-tars-web-ui): display rendered file result by default**
- **feat(agent-tars-web-ui): support full-screen markdown file rendering (#866)**
- **feat(agent-tars-web-ui): some visual enhancements (#864)**
- **feat(agent-tars-web-ui): add purple gradient text for provider (#852)**
- **feat(agent-tars-web-ui): enhance model info banner (#852)**
- **feat(agent-tars-web-ui): do not display JSON_DATA**
- **feat(agent-tars-web-ui): optimize user message render**
- **feat(agent-tars-web-ui): support preview output string containing image**
- **feat(agent-tars-web-ui): enhance file result display**
- **feat(agent-tars-web-ui): inline code render issue**
- **feat(agent-tars-web-ui): enhance message input and code block render (#806)**
- **feat(agent-tars-web-ui): dark mode by default (#793) (#801)**

#### Browser Operator
- **feat(browser-operator): use agent-infra's Hotkey to execute hotkeys (#1343)**

#### Browser Search
- **feat(browser-search): support cdpEndpoint to connect to remote browser**

#### Game Mode
- **feat(game-mode): improve game agent mode error handling and user experience (#1673)**

#### Gui Agent
- **feat(gui-agent): improve page visibility detection in AIOBrowser (#1431)**
- **feat(gui-agent): delay 1s before screenshot on aio hybried operator (#1388)**
- **feat(gui-agent): support remote browser operator and update web-ui feature for o-tars gui agent (#1136)**
- **feat(gui-agent): construct operator on demand (#1133)**
- **feat(gui-agent): add action parser for omni (#1065)**

#### Llm Client
- **feat(llm-client): support `openai-non-streaming` provider (#851)**

#### Mcp
- **feat(mcp): increase default timeout from 10s to 60s (#1139)**

#### Mcp Agent
- **feat(mcp-agent): upgrade mcp-client to 1.2.20 and set 180s timeout (#1271)**

#### Mcp Browser
- **feat(mcp-browser): add custom logger and addMiddleware (#813)**

#### Mcp Client
- **feat(mcp-client): add configurable timeout (#1176)**
- **feat(mcp-client): add tools and prompts filtering with comprehensive tests (#1155)**

#### Mcp Servers
- **feat(mcp-servers): support mcp offical registry (#1447)**

#### Model Provider
- **feat(model-provider): add automatic claude headers support (#1314)**

#### Navbar
- **feat(navbar): improve width control and model display (#1116)**

#### O Agent
- **feat(o-agent): update sandbox sdk and gui-agent operator (#1437)**
- **feat(o-agent): temp hack for model thinking (#1395)**
- **feat(o-agent): system prompt update (#1392)**
- **feat(o-agent): update time and proxy instruction in sp (#1384)**
- **feat(o-agent): native think (#1371)**
- **feat(o-agent): enable `enableStreamingToolCallEvents` (#1340)**
- **feat(o-agent): xml parser for agent model (#1330)**
- **feat(o-agent): add custom timeout for execute_bash tool; remove stop_sequences config (#1256)**
- **feat(o-agent): modify linkreader (#1216)**
- **feat(o-agent): modify env usage (#1213)**
- **feat(o-agent): migrate from omni-tars core to agent-infra sandbox (#1137)**
- **feat(o-agent): improve configuration and performance optimization (#1131)**

#### O Gui Agent
- **feat(o-gui-agent): set waiting time as 5s when initailize screenshot (#1671)**
- **feat(o-gui-agent): insert preset messages before real query from user (#1661)**
- **feat(o-gui-agent): support agent mode and game operator with enhanced error handling (#1656)**
- **feat(o-gui-agent): support ChromeUI gui operation on AIO sandbox (#1383)**
- **feat(o-gui-agent): temporary solution for getting metadata when screenshot (#1341)**
- **feat(o-gui-agent): support navigate action for new model (#1339)**

#### O Tars
- **feat(o-tars): using new icon (#1223)**
- **feat(o-tars): add code server entry (#1218)**

#### Omni Agent
- **feat(omni-agent): fix img compressor dependency issues (#1683)**
- **feat(omni-agent): zoom out game welcome card (#1672)**
- **feat(omni-agent): add functions prompt for game mode (#1668)**
- **feat(omni-agent): optimize agent game mode UI (#1665)**
- **feat(omni-agent): add default runtimeSettings (#1657)**
- **feat(omni-agent): agentMode structure update; add game mode support (#1649)**
- **feat(omni-agent): compress images for gui screenshot (#1647)**
- **feat(omni-agent): update agent mode config structure (#1642)**
- **feat(omni-agent): enable gui in omni agent (#1197)**

#### Omni Gui Agent
- **feat(omni-gui-agent): adapt tarko's screenshot rendering protocol (#1335)**
- **feat(omni-gui-agent): optimize system prompt to use navigate instead of type (#1230)**
- **feat(omni-gui-agent): disable streaming output of assistant message (#1212)**
- **feat(omni-gui-agent): add navigate and navigate_back action space (#1211)**
- **feat(omni-gui-agent): migrate from local browser to AIO sandbox browser (#1205)**
- **feat(omni-gui-agent): execute screenshot on demand on EachLoopEnd hook (#1195)**

#### Omni Tars
- **feat(omni-tars): migrate gui agent into omni tars (#1071)**
- **feat(omni-tars): refactor AgentPlugin architecture and enhance API integration (#1056)**
- **feat(omni-tars): implement omni-tars multi-agent system (#1047)**

#### Remote Browser
- **feat(remote-browser): support headful browser with VNC control (#898)**

#### Tarko
- **feat(tarko): add event stream viewer (#1374)**
- **feat(tarko): add runtime settings api in server-next (#1634)**
- **feat(tarko): sunsetting `model.providers` from agent kernel (#1483)**
- **feat(tarko): implement MongoDB provider for agent server (#1450)**
- **feat(tarko): `agui` cli for agent ui builder (#1446)**
- **feat(tarko): add navbar logo display options (#1443)**
- **feat(tarko): init `@tarko/agent-ui-builder` (#1436)**
- **feat(tarko): move workspace navItems from header to navbar (#1441)**
- **feat(tarko): add tabbed file viewer for `read_multiple_files` tool (#1438)**
- **feat(tarko): refine collected files (#1422)**
- **feat(tarko): add `guiAgent.renderBrowserShell` option (#1421)**
- **feat(tarko): limit welcome prompts to 3 with shuffle (#1416)**
- **feat(tarko): refine all empty state (#1408)**
- **feat(tarko): add user message auto-scroll in normal mode (#1412)**
- **feat(tarko): enhance slug generation with multilingual support (#1410)**
- **feat(tarko): auto-scroll for replay (#1407)**
- **feat(tarko): improve ChatInput UX with conditional help text and home variant (#1406)**
- **feat(tarko): refine thinking animation (#1404)**
- **feat(tarko): refine scroll-to-bottom indicator (#1402)**
- **feat(tarko): defaults background to white for html renderer (#1397)**
- **feat(tarko): refine LinkReaderRenderer (#1393)**
- **feat(tarko): auto-append `replay=1` to share URLs (#1394)**
- **feat(tarko): disable html rendering in markdown renderer (#1391)**
- **feat(tarko): refine behavior of `guiAgent.renderGUIAction` (#1386)**
- **feat(tarko): add multimodal clipboard paste support (#1379)**
- **feat(tarko): refactor chat panel ui (#1375)**
- **feat(tarko): reuse chat input in home page (#1313)**
- **feat(tarko): add model id tooltip to navbar (#1370)**
- **feat(tarko): implement session state isolation (#1357)**
- **feat(tarko): unify think rendering with markdown renderer (#1353)**
- **feat(tarko): remove independent environment input rendering in final state (#1346)**
- **feat(tarko): apply RTL only to file-related tools in tool blocks (#1337)**
- **feat(tarko): trim leading newlines from thinking message content (#1333)**
- **feat(tarko): only show MessageFooter on final assistant response (#1331)**
- **feat(tarko): add math formula rendering support to markdown renderer (#1329)**
- **feat(tarko): show `edit_file` path in tool call block (#1309)**
- **feat(tarko): add url field to screenshot metadata and display in browser shell (#1308)**
- **feat(tarko): one-click copy raw tool data (#1304)**
- **feat(tarko): add gui agent screenshot render strategy config (#1296)**
- **feat(tarko): switch gui agent to percentage coordinates (#1292)**
- **feat(tarko): improve abort button styling (#1290)**
- **feat(tarko): adjust maxIterations default to 1000 (#1289)**
- **feat(tarko): add codebase metadata to contextual references (#1274)**
- **feat(tarko): adapt devicePixelRatio from metadata in web ui (#1275)**
- **feat(tarko): add metadata field to EnvironmentInputEvent (#1272)**
- **feat(tarko): support TTFT and TTLT metric (#1232)**
- **feat(tarko): support top_p configuration for the model (#1247)**
- **feat(tarko): improve workspace header icons and raw mode spacing**
- **feat(tarko): temporary support for `str_replace_editor` `view` command (#1236)**
- **feat(tarko): refine `str_replace_editor` renderer (#1200)**
- **feat(tarko): add support for new LinkReader (#1226)**
- **feat(tarko): compatible with o-tars' tool call block (#1224)**
- **feat(tarko): using backward-only screenshot association (#1214)**
- **feat(tarko): add built-in agents support (#1208)**
- **feat(tarko): add webui workspace panels support (#1206)**
- **feat(tarko): add webUIConfig support to AgentConstructor (#1207)**
- **feat(tarko): add intelligent auto-scroll to chat UI (#1203)**
- **feat(tarko): decouple file renderers from GenericResultRenderer (#1201)**
- **feat(tarko): fully compatible with `str_replace_editor` (#1189)**
- **feat(tarko): initial support `model.displayName` (#1163)**
- **feat(tarko): add workspace raw mode display (#1167)**
- **feat(tarko): add loading states for session creation and switching (#1168)**
- **feat(tarko): improve JupyterCI tool rendering ui (#1166)**
- **feat(tarko): refine run command semantics (#1158)**
- **feat(tarko): add `.env` file support (#1156)**
- **feat(tarko): add agent config viewer (#1153)**
- **feat(tarko): add agent server exclusive mode support (#1149)**
- **feat(tarko): add workspace config support for instructions.md (#1145)**
- **feat(tarko): o tars adaptation (#1127)**
- **feat(tarko): refactor event processor architecture (#1119)**
- **feat(tarko): add raw events state (#1118)**
- **feat(tarko): display workspace path in workspace header (#1117)**
- **feat(tarko): move model selector from chat input to navbar (#1089)**
- **feat(tarko): `edit_file` renderer (#1107)**
- **feat(tarko): add LinkReader renderer support (#1099)**
- **feat(tarko): optimize time to first token experience (close: #1052) (#1082)**
- **feat(tarko): support switching model at runtime (close: #1057) (#1058)**
- **feat(tarko): add workspace display in navbar (close: #1039) (#1081)**
- **feat(tarko): improve search result relevance scoring (#1079)**
- **feat(tarko): optimize navbar space for agent and model display (close: #1076) (#1078)**
- **feat(tarko): remove auto scroll behavior from ChatPanel (#1049)**
- **feat(tarko): enhance thinking message ui (#1048)**
- **feat(tarko): mcpServer filter (close: #1045) (#1046)**
- **feat(tarko): tools filter (close: #1041) (#1042)**
- **feat(tarko): experimental contextual selector (#1032)**
- **feat(tarko): add `@tarko/interface` and `defineConfig` function (#1022)**
- **feat(tarko): agent resolver should respect workspace (#1021)**
- **feat(tarko): `webui` config and render dynamic ui metadata (#1017)**
- **feat(tarko): refine agent module path resolution (#1016)**
- **feat(tarko): display agent name in web ui (#1015)**
- **feat(tarko): refine package scope (#1013)**
- **feat(tarko): refine workspace resolution (#1011)**
- **feat(tarko): refine workspace design (#1008)**
- **feat(tarko): global directories (#1007)**

#### Tarko Agent
- **feat(tarko-agent): enhance runtime settings with enum labels and UI placement control (#1638)**
- **feat(tarko-agent): runtime settings  (#1561)**
- **feat(tarko-agent): remove engine-selector from agent kernel (#1576)**
- **feat(tarko-agent): restore events on agent session restore (#1548)**
- **feat(tarko-agent): thinking duration protocol and modernize thinking ui  (#1423)**
- **feat(tarko-agent): add messageId to thinking events for proper session correlation (#1282)**
- **feat(tarko-agent): refine contextual selector (#1134)**
- **feat(tarko-agent): add `onEachAgentLoopEnd` hook (#1111)**

#### Tarko Agent Agent, Agent Ui
- **feat(tarko-agent-agent, agent-ui): add `webui.base` support (#1623)**

#### Tarko Agent Cli
- **feat(tarko-agent-cli): add `--model.displayName` option support (#1605)**
- **feat(tarko-agent-cli): support unknown options passthrough (#1574)**

#### Tarko Agent Next
- **feat(tarko-agent-next): sync code from agent-server (#1663)**

#### Tarko Agent Server
- **feat(tarko-agent-server): add `server.models` support (#1488)**

#### Tarko Agent Server, Agent Ui
- **feat(tarko-agent-server, agent-ui): return initialization events from session create (#1662)**
- **feat(tarko-agent-server, agent-ui): refine arch of agent options and settings from home to session (#1645)**

#### Tarko Agent Server Next
- **feat(tarko-agent-server-next): support replacing server global logger (#1554)**
- **feat(tarko-agent-server-next): add initial events for agent when change model (#1552)**

#### Tarko Agent Ui
- **feat(tarko-agent-ui): add copy link option to share conversation modal (#1706)**
- **feat(tarko-agent-ui): improve raw mode renderer design (#1677)**
- **feat(tarko-agent-ui): add clickable url links in terminal renderer json output (#1655)**
- **feat(tarko-agent-ui): replace plus icon with lightning bolt for agent mode selector (#1674)**
- **feat(tarko-agent-ui): welcome cards (#1643)**
- **feat(tarko-agent-ui): replaced generic tool renderer with terminal-style renderer (#1594)**
- **feat(tarko-agent-ui): add `webui.layout.enableHome` config (#1629)**
- **feat(tarko-agent-ui): add `webui.layout.enableSidebar` config (#1624)**
- **feat(tarko-agent-ui): mobile ui bottom sheet (#1563)**
- **feat(tarko-agent-ui): new layout design (#1553)**
- **feat(tarko-agent-ui): disable model selector during agent run (#1520)**
- **feat(tarko-agent-ui): sunsetting plan functionality (#1521)**
- **feat(tarko-agent-ui): support line breaks in LinkReaderRenderer (#1482)**
- **feat(tarko-agent-ui): enhance agent ui config system (#1464)**
- **feat(tarko-agent-ui): display colored terminal output (#1476)**

#### Tarko Cli
- **feat(tarko-cli): load env file baesd on the workspace (#1170)**
- **feat(tarko-cli): add config logging reminders (close: #1063)**

#### Tarko Mcp Agent
- **feat(tarko-mcp-agent): remove deprecated `mcpClientVersion` support (#1510)**
- **feat(tarko-mcp-agent): adjust defaultConnectionTimeout from 180 to 60 seconds (#1505)**
- **feat(tarko-mcp-agent): `defaultConnectionTimeout` option (#1462)**

#### Tarko Server Next
- **feat(tarko-server-next): optimize parts of controller by avoiding go … (#1684)**

#### Tarko Web Ui
- **feat(tarko-web-ui): narrow chat mode (#1298)**
- **feat(tarko-web-ui): streaming thinking rendering support (#1284)**

#### Ui Tars
- **feat(ui-tars): sunset UI-TARS-desktop remote operator (#1135)**
- **feat(ui-tars): change vnc default width and height (#955)**
- **feat(ui-tars): update model check logic (#899)**
- **feat(ui-tars): update volcano engine faas url (#895)**
- **feat(ui-tars): add model availability check logic (#894)**
- **feat(ui-tars): update proxy server's endpoint (#811)**

#### Webui
- **feat(webui): add configurable about modal links (#1217)**

#### General Features
- **feat: TARS platform enhancements and compatibility fixes (#1680)**
- **feat: add `@tarko/agent-server-next` (#1551)**
- **feat: enhance streaming for o-agent with improved parsing and processing #1294 (#1294)**
- **feat: upgrade @agent-infra/sandbox package and add health check (#1188)**
- **feat: enhance o-agent with session state management and Jupyter CI support (#1186)**
- **feat: enhance code agent and model output adaptation (#1108)**
- **feat: add gui agent powered by tarko (#1031)**
- **feat: seed mcp agent (#1023)**
- **feat(agent-tars-server)!: add api version**

### Fixed

#### Agent Kernel
- **fix(agent-kernel): kor build wrong context (#932)**
- **fix(agent-kernel): explicit json schema prompt for kor (#897)**
- **fix(agent-kernel): native tool call engine should emit completion of tool calls**
- **fix(agent-kernel): kor should handle braces and completion correctly (#886)**

#### Agent Server
- **fix(agent-server): add safety check for agent.dispose in session cleanup (#1291)**

#### Agent Tars
- **fix(agent-tars): correct webui property name to webuiConfig (#1267)**
- **fix(agent-tars): move required deps from devDependencies to dependencies (#1255)**
- **fix(agent-tars): `directory_tree` causes context overflow (close: #969) (#1055)**
- **fix(agent-tars): all file and command tools should respect workspace (#949)**
- **fix(agent-tars): update regex to avoid exponential backtracking (#944)**
- **fix(agent-tars): parseAction compatible with irregular model output (#942)**
- **fix(agent-tars): enable `enableStreamingToolCallEvents` by default**
- **fix(agent-tars): `run_command` do not respect workspace (close: #817) (#862)**
- **fix(agent-tars): `write_file` should respect workspace (close: #815) (#860)**
- **fix(agent-tars): cannot custom mcp servers**

#### Agent Tars Cli
- **fix(agent-tars-cli): sqlite should consider backward compatibility (#1029)**
- **fix(agent-tars-cli): remove unused log (#959)**
- **fix(agent-tars-cli): `agent-tars run` does not leverage a different port (#859)**

#### Agent Tars Docs
- **fix(agent-tars-docs): do not ssg 404 (#918)**
- **fix(agent-tars-docs): ignore 404 rendering for dynamic routes (#917)**
- **fix(agent-tars-docs): replay flickering**

#### Agent Tars Interface
- **fix(agent-tars-interface): ESModulesLinkingError: export 'TConstructor' (#958)**

#### Agent Tars Web Ui
- **fix(agent-tars-web-ui): replay does not work (#981)**
- **fix(agent-tars-web-ui): safe files check (#964)**
- **fix(agent-tars-web-ui): some regression issues (#954)**
- **fix(agent-tars-web-ui): download html down not work (#947)**
- **fix(agent-tars-web-ui): message input should be hidden in replay report  (#946)**
- **fix(agent-tars-web-ui): duplicate abort message**
- **fix(agent-tars-web-ui): version info does not work at shared artifact (#930)**
- **fix(agent-tars-web-ui): do not render system error (#927)**
- **fix(agent-tars-web-ui): browser vision control display wrong status (#921)**
- **fix(agent-tars-web-ui): wrong initial position of draggable playhead (#920)**
- **fix(agent-tars-web-ui): cannot pause replay (#912)**
- **fix(agent-tars-web-ui): share provider does not work (#891)**
- **fix(agent-tars-web-ui): file result rendering (#847)**
- **fix(agent-tars-web-ui): build failed**
- **fix(agent-tars-web-ui): support copy agent response**
- **fix(agent-tars-web-ui): command line highlight issue**
- **fix(agent-tars-web-ui): short string effect in dark mode**

#### Aio Hybrid Operator
- **fix(aio-hybrid-operator): transform arrowDirecton key to direction key (#1641)**

#### Browser
- **fix(browser): server declares logging capability but doesn't implement method logging/setLevel (#1334)**
- **fix(browser): remove disable http2 (#936)**

#### Browser Operator
- **fix(browser-operator): goto URL wait no events (#810)**

#### Gui Agent
- **fix(gui-agent): return original result onAfterToolCall hook (#1681)**

#### Mcp Browser
- **fix(mcp-browser): browser mcp screenshot and refactor form_input_fill  (#957)**

#### Mcp Search
- **fix(mcp-search): replace node-fetch with native fetch for Node.js 22 (#1069)**

#### Mcp Server
- **fix(mcp-server): custom logger and middlewares timing issue (#848)**

#### Model Provider
- **fix(model-provider): native providers regression issue (#1503)**

#### Nut Js
- **fix(nut-js): rewrite drag/select (#909)**

#### Omni Tars
- **fix(omni-tars): add missing super.onAgentLoopEnd() call (#1066)**

#### Operator Browser
- **fix(operator-browser): scroll right does not work (close: #900) (#904)**

#### Tarko
- **fix(tarko): preserve logo param in session routing (#1471)**
- **fix(tarko): fetch actual remote config instead of local file (#1449)**
- **fix(tarko): external `@tarko/agent-ui-builder` in agent-cli build (#1445)**
- **fix(tarko): improve markdown inline code wrapping (#1439)**
- **fix(tarko): resolve react key spread warning and hooks render issue (#1435)**
- **fix(tarko): make thinking toggle default expanded without initial animation (#1432)**
- **fix(tarko): prevent frequent `api/v1/models` calls by memoizing callbacks (#1378)**
- **fix(tarko): improve scroll-to-bottom indicator edge case handling (#1429)**
- **fix(tarko): prevent duplicate session loading in SessionRouter (#1427)**
- **fix(tarko): prevent auto-scroll on refresh for historical user messages (#1415)**
- **fix(tarko): improve scroll-to-bottom indicator detection (#1411)**
- **fix(tarko): improve session UI state management (#1409)**
- **fix(tarko): scroll-to-bottom indicator session switching and edge cases (#1405)**
- **fix(tarko): improve markdown link parsing edge cases (#1398)**
- **fix(tarko): correct isProcessing state management during agent execution (#1387)**
- **fix(tarko): fix markdown link parsing with chinese text (#1358)**
- **fix(tarko): image data missing in workspace (#1373)**
- **fix(tarko): resolve infinite recursion in layoutModeAtom (#1356)**
- **fix(tarko): downgrade react-router-dom to v6 for compatibility (#1355)**
- **fix(tarko): fallback to beforeActionImage in afterAction strategy to prevent flickering (#1352)**
- **fix(tarko): hide workspace navigation items in replay mode (#1350)**
- **fix(tarko): persist agent web ui config in share (#1347)**
- **fix(tarko): browser shell url bar takes full width without spacing (#1327)**
- **fix(tarko): unexpected markdown render in generic renderer dark mode (#1324)**
- **fix(tarko): table dark mode styling (#1323)**
- **fix(tarko): move StrategySwitch after ScreenshotDisplay to prevent flicker (#1321)**
- **fix(tarko): model displayName regression issue (#1315)**
- **fix(tarko): replace hardcoded agent name with dynamic config in TerminalOutput (#1306)**
- **fix(tarko): handle open_computer action normalization (#1305)**
- **fix(tarko): resolve infinite re-render in BrowserControlRenderer hooks (#1303)**
- **fix(tarko): prevent unnecessary `environment_input` events without contextual references (#1301)**
- **fix(tarko): disable share button during agent execution (#1288)**
- **fix(tarko): improve script execution ui layout and styling (#1268)**
- **fix(tarko): optimize EditFile title path display (#1246)**
- **fix(tarko): enable line wrapping for command stdout/stderr (#1249)**
- **fix(tarko): update session title in correct metadata structure (#1233)**
- **fix(tarko): home page title is truncated (#1222)**
- **fix(tarko): allow workspace panel updates in replay mode (#1202)**
- **fix(tarko): replace hardcoded texts with configurable title (#1174)**
- **fix(tarko): display "Unknown Agent" at initial rendering (#1184)**
- **fix(tarko): persist agent name in session metadata (#1175)**
- **fix(tarko): handle CLI parameter order for agent argument (#1169)**
- **fix(tarko): add rollback error handling in sqlite migration (#1147)**
- **fix(tarko): inline code dark mode text color (#1143)**
- **fix(tarko): preserve events data during database migration (#1121)**
- **fix(tarko): use plain text rendering for user messages (closes #1103) (#1104)**
- **fix(tarko): improve omni tars search result rendering (close: #1094) (#1096)**
- **fix(tarko): enhance contextual selector with path support and validation (#1077)**
- **fix(tarko): validate session consistency before panel updates (#1072)**
- **fix(tarko): agent cli should pass directories config (#1024)**

#### Tarko Agent
- **fix(tarko-agent): prevent max-iter warning in test**
- **fix(tarko-agent): should track elapsed time for tool execution errors (#1474)**
- **fix(tarko-agent): wrong `agent_run_end` status (#1473)**
- **fix(tarko-agent): improve JSON parsing in PromptEngineeringToolCallEngine (close: #1360) (#1361)**

#### Tarko Agent Cli
- **fix(tarko-agent-cli): merged webui config in script injection (close: #1626) (#1627)**

#### Tarko Agent Server
- **fix(tarko-agent-server): remove redundant event logging (#1703)**
- **fix(tarko-agent-server): system setting api 404 issues (#1669)**
- **fix(tarko-agent-server): fix agent events problem (#1666)**
- **fix(tarko-agent-server): ensure agent initialize events are persisted (#1660)**

#### Tarko Agent Ui
- **fix(tarko-agent-ui): unexpected file renderer behaviors (#1705)**
- **fix(tarko-agent-ui): preserve multimodal content format when navigating from home page (#1704)**
- **fix(tarko-agent-ui): optimize health check polling to prevent unnecessary API calls (#1562)**
- **fix(tarko-agent-ui): ugly tooltip (#1648)**
- **fix(tarko-agent-ui): render error in tool raw mode renderer (#1659)**
- **fix(tarko-agent-ui): display environment input on session creation (#1667)**
- **fix(tarko-agent-ui): make welcome cards prompt optional (#1658)**
- **fix(tarko-agent-ui): remove ugly container from ImageRenderer (#1639)**
- **fix(tarko-agent-ui): code editor light mode highlighting (#1636)**
- **fix(tarko-agent-ui): restore container and navbar in replay mode (#1615)**
- **fix(tarko-agent-ui): restore fallback image upload when no runtime settings (#1619)**
- **fix(tarko-agent-ui): improve `read_multiple_files` renderer parsing and error handling (#1606)**
- **fix(tarko-agent-ui): remove duplicate url actions bar from browser renderer (#1584)**
- **fix(tarko-agent-ui): improve monaco editor line numbers spacing (#1571)**
- **fix(tarko-agent-ui): support all SSE line separators in streaming (#1568)**
- **fix(tarko-agent-ui): tailwind cannot transpile styles from `@tarko/ui` (#1545)**
- **fix(tarko-agent-ui): config issues (#1541)**
- **fix(tarko-agent-ui): navbar overlap on small screens (#1519)**
- **fix(tarko-agent-ui): prevent undefined extension in code editor header (#1472)**

#### Tarko Cli
- **fix(tarko-cli): `--thinking` does not work (#1283)**
- **fix(tarko-cli): prevent console interceptor recursion in debug mode (#1279)**

#### Tarko Server Next
- **fix(tarko-server-next): remove unexisted routes (#1650)**

#### Ui Tars
- **fix(ui-tars): action parser edge case action Chinese colon (#825)**
- **fix(ui-tars): clear time cache when time expired (#798)**

#### Ui Tars Sdk
- **fix(ui-tars-sdk): fix the format of history messages (#799)**

### Refactored

#### Agent
- **refactor(agent): sink workspace config to tarko (#998)**

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
- **refactor(agent-tars-web-ui): reuse toggle switch  (#864)**

#### All
- **refactor(all): refine project structures (#1012)**

#### Common
- **refactor(common): extract LoadingSpinner and unify modal styles (#1317)**

#### Gui Agent
- **refactor(gui-agent): refactor composable gui agent with improved stability and error handling (#1556)**
- **refactor(gui-agent): refactor SDK with new operators support and enhanced configuration (#1618)**
- **refactor(gui-agent): enhance action parser and add comprehensive utilities (#1617)**
- **refactor(gui-agent): refactor gui agent sdk: agent, action-parser and operator (#1550)**

#### Mcp Agent
- **refactor(mcp-agent): improve type safety and docs (#1511)**

#### Mcp Browser
- **refactor(mcp-browser): browser_get_markdown (#982)**
- **refactor(mcp-browser): expected object, received string, will ban callTool without arguments in the next minor version. (#880)**

#### Model Provider
- **refactor(model-provider): improve docs and add tests (#1489)**

#### Tarko
- **refactor(tarko): optimize agent-server-next dao level (#1620)**
- **refactor(tarko): sunsetting web socket (#1543)**
- **refactor(tarko): simplify chatpanel state logic (#1381)**
- **refactor(tarko): remove language badge from code renderer header (#1470)**
- **refactor(tarko): rename `SessionItemInfo` to `SessionInfo` (#1440)**
- **refactor(tarko): rename `agent-web-ui` to `agent-ui` (#1434)**
- **refactor(tarko): simplify code editor components (#1425)**
- **refactor(tarko): remove excessive dots from empty states (#1414)**
- **refactor(tarko): simplify screenshot display state management (#1390)**
- **refactor(tarko): remove unnecessary abstraction and redundant state updates (#1380)**
- **refactor(tarko): remove meaningless re-exports and restructure web-ui config (#1307)**
- **refactor(tarko): remove unused workspace utilities (#1238)**
- **refactor(tarko): extract shared terminal component (#1264)**
- **refactor(tarko): remove over-designed language support (#1263)**
- **refactor(tarko): remove redundant FileRenderer wrapper (#1260)**
- **refactor(tarko): merge EditFileRenderer into DiffRenderer (#1259)**
- **refactor(tarko): consolidate state atoms (#1237)**
- **refactor(tarko): gui agent renderer (#1220)**
- **refactor(tarko): flexible condition-based system for tool renderer (#1191)**
- **refactor(tarko): some enhancement for gui agent (#1198)**
- **refactor(tarko): remote complex mid-layers in workspace renderer (#1120)**
- **refactor(tarko): migrate to extensible JSON schema database design (#1122)**
- **refactor(tarko): improve agent storage implementation type system (#1025)**

#### Tarko Agent Cli
- **refactor(tarko-agent-cli): simplify setup ui logic (#1631)**

#### Tarko Agent Ui
- **refactor(tarko-agent-ui): show terminal ui for empty execute_bash results (#1676)**
- **refactor(tarko-agent-ui): consolidate file display mode type definitions (#1637)**
- **refactor(tarko-agent-ui): refine ui infrastructure (#1546)**
- **refactor(tarko-agent-ui): remove `final_answer` event handling (#1542)**
- **refactor(tarko-agent-ui): make core low-level components stable (#1540)**
- **refactor(tarko-agent-ui): remove `@headlessui/react` (#1539)**
- **refactor(tarko-agent-ui): migrate stable editor atomics to `@tarko/ui` (#1537)**
- **refactor(tarko-agent-ui): remove redundant motion animations (#1530)**
- **refactor(tarko-agent-ui): remove parrot comments (#1528)**
- **refactor(tarko-agent-ui): deduplicate muiTheme definitions (#1523)**
- **refactor(tarko-agent-ui): remove redundant code and simplify components (#1527)**
- **refactor(tarko-agent-ui): unify model display logic (#1525)**

#### Tarko Web Ui
- **refactor(tarko-web-ui): centralize markdown theme architecture (#1325)**
- **refactor(tarko-web-ui): extract tooltip props to shared config (#1300)**
- **refactor(tarko-web-ui): some enhancements (#1185)**

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

#### Tarko
- **docs(tarko): enhance agent api (#1689)**
- **docs(tarko): refactor agent hooks (#1688)**
- **docs(tarko): remove troubleshooting (#1702)**
- **docs(tarko): keep terminology untranslated in zh docs (#1695)**
- **docs(tarko): using semantic model id for code examples (#1687)**
- **docs(tarko): agent ui config api reference (#1653)**
- **docs(tarko): runtime settings api (#1654)**
- **docs(tarko): restructure cli documentation into separate sections (#1610)**
- **docs(tarko): fix agent options in examples (#1602)**
- **docs(tarko): agent api documentation improvements (#1601)**
- **docs(tarko): complete zh getting-started examples (#1603)**
- **docs(tarko): sync zh agent api docs with en version (#1600)**
- **docs(tarko): refactor agent options  (#1596)**
- **docs(tarko): fix duplicate links and inaccurate interface examples (#1595)**
- **docs(tarko): merge agent snapshot (#1591)**
- **docs(tarko): refine agent hooks (#1586)**
- **docs(tarko): migrate tool docs (#1585)**
- **docs(tarko): refactor tool documentation (#1579)**
- **docs(tarko): align zh introduction with en version (#1581)**
- **docs(tarko): add comprehensive event stream documentation (#1242)**
- **docs(tarko): enhance agent-server documentation (#1164)**
- **docs(tarko): improve agent-cli documentation (#1162)**

#### Tarko Agent
- **docs(tarko-agent): init documentation (#1502)**
- **docs(tarko-agent): init readme (#1179)**

#### Tarko Agent Cli
- **docs(tarko-agent-cli): optimize README.md (#1578)**

#### General Documentation
- **docs: remove duplicate header (#1559)**
- **docs: correct typo in mcp documentation (#1516)**
- **docs: refine `useCursor` implementation (#1501)**
- **docs: upgrade rspress to v2.0.0-beta.32 (#1495)**
- **docs: add `@tarko/mcp-agent` (#1458)**
- **docs: fix missing useI18n import in NotFoundLayout (#1265)**
- **docs: clarify instructions field behavior (#1059)**
- **docs: update redirects (#983)**
- **docs: add new redirects (#980)**
- **docs: quick-start.md add links for Volcano Engine's OS Agent (#972)**
- **docs: add rfcs**
- **docs: refine readme (#843)**
- **docs: fix mcp-servers/browser/README.md typo (#854)**

### Tests

- **test(agent-tars): update browser control snapshots (#1707)**
- **test(agent-kernel): improve tool call engine tests (#883)**
- **test(agent-kernel): fix wrong snapshot (#879)**

### CI/CD

#### Pnpm Toolkit
- **ci(pnpm-toolkit): add `--auto-create-release-branch` support (#1535)**
- **ci(pnpm-toolkit): add canary release support (#1534)**

#### Ptk
- **ci(ptk): extract github username from noreply email (#1456)**
- **ci(ptk): github release (#1428)**
- **ci(ptk): handle missing git tags in changelog generation (#1372)**

#### Tarko Agent Server
- **ci(tarko-agent-server): add missing `getOptions` method to fix tests (#1675)**

#### Tarko Pnpm Toolkit
- **ci(tarko-pnpm-toolkit): filter canary releases in release note generation (#1570)**

#### General CI/CD
- **ci: remove tag prefix from release scripts (#1451)**
- **ci: refine issue template**
- **ci: update feature request template**

### Maintenance

#### Agent
- **chore(agent): clean legacy examples (#1487)**
- **chore(agent): update default layout config (#1311)**

#### Agent Snapshot
- **chore(agent-snapshot): remove test env setup (#963)**

#### Agent Tars
- **chore(agent-tars): release 0.3.0-beta.7 (#1348)**
- **chore(agent-tars): release 0.3.0-beta.6 (#1257)**
- **chore(agent-tars): release 0.3.0-beta.5 (#1227)**
- **chore(agent-tars): release 0.3.0-beta.4 (#1215)**
- **chore(agent-tars): release 0.3.0-beta.0 (#943)**
- **chore(agent-tars): release 0.2.10 (#893)**
- **chore(agent-tars): release 0.2.9 (#870)**
- **chore(agent-tars): release 0.2.8 (#863)**
- **chore(agent-tars): release 0.2.7 (#853)**
- **chore(agent-tars): release 0.2.6**
- **chore(agent-tars): release 0.2.5**
- **chore(agent-tars): release 0.2.4 (#828)**
- **chore(agent-tars): release 0.2.3**
- **chore(agent-tars): release 0.2.2 (#812)**
- **chore(agent-tars): release 0.2.1 (#807)**
- **chore(agent-tars): release 0.2.0 (#795)**

#### Agent Tars Destkop
- **chore(agent-tars-destkop): release 1.0.0-alpha.10**

#### Agent Web Ui
- **chore(agent-web-ui): remove unused ModelSelector component (#1115)**

#### Agio
- **chore(agio): update `agio-schema.json` (#960)**

#### All
- **chore(all): fix changelog generation (#1420)**
- **chore(all): fix grammar typo (#1367)**
- **chore(all): unify naming case of webui config (#1269)**
- **chore(all): standardize the written terminology of Omni-TARS (#1235)**

#### Ci
- **chore(ci): add lint (#1002)**

#### Docs
- **chore(docs): correct workspace default path in English and Chinese guides (#1124)**

#### Gui Agent
- **chore(gui-agent): fix the missing final screenshot (#1190)**

#### Mcp Browser
- **chore(mcp-browser): _meta add screen coords & fix console in stdio mode (#984)**
- **chore(mcp-browser): deprecated browser_get_html (#797)**

#### Mcp Client
- **chore(mcp-client): release 1.2.20 (#1270)**

#### O Agent
- **chore(o-agent): update example prompts (#1417)**
- **chore(o-agent): disable gui agent screenshot switch and render (#1385)**
- **chore(o-agent): update display texts (#1351)**

#### O Gui Agent
- **chore(o-gui-agent): optimize agent game mode's processing (#1664)**

#### O Tars
- **chore(o-tars): using sync mode for `execute_bash` (#1228)**

#### Omni Agent
- **chore(omni-agent): update games (#1670)**

#### Omni Tars
- **chore(omni-tars): correct grammar in welcome prompt (#1454)**
- **chore(omni-tars): remove unused prompt (#1221)**
- **chore(omni-tars): fix dev:agent launch issue**

#### Ptk
- **chore(ptk): add `--no-verify` to release commits (#1369)**
- **chore(ptk): update release commit scope from agent-tars to tars-stack (#1368)**

#### Scripts
- **chore(scripts): add build:omni-tars script (#1067)**

#### Tarko
- **chore(tarko): enhance code block spacing (#1400)**
- **chore(tarko): remove codeblock action buttons (#1344)**
- **chore(tarko): improve gui agent screenshot ui layout and placeholder (#1302)**
- **chore(tarko): replace @ui-tars/operator-browser with local @gui-agent/operator-browser (#1278)**
- **chore(tarko): override strikethrough (del) to render as normal text (#1219)**
- **chore(tarko): fix which final environment is shown after non-screensh… (#1209)**
- **chore(tarko): remove fallback when no screenshot is available**

#### Tars Stack
- **chore(tars-stack): release 0.3.0-beta.12 (#1569)**
- **chore(tars-stack): release 0.3.0-beta.11 (#1453)**
- **chore(tars-stack): release 0.3.0-beta.10 (#1419)**
- **chore(tars-stack): release 0.3.0-beta.9 (#1396)**
- **chore(tars-stack): release 0.3.0-beta.8 (#1366)**

#### Ui Tars
- **chore(ui-tars): update release version (#977)**
- **chore(ui-tars): update release version (#907)**
- **chore(ui-tars): update release version (#824)**

#### General Maintenance
- **chore: fix typos across codebase (#643)**
- **chore: remove unused and outdated files (#1566)**
- **chore: fix expired lark link (close: #1564) (#1565)**
- **chore: disable `editor.formatOnSave` setting (#1486)**
- **chore: fix changelog filter scopes and restore missing entries (#1418)**
- **chore: only enable `route.exclude` in production build**
- **chore: fix link leading to local docs for local and remote operators (#1112)**
- **chore: rename `@agent-tars/server` to `@multimodal/agent-server` (#975)**
- **chore: sunsetting agent tars desktop (#840)**

### Performance

- **perf(agent-tars-web-ui): using monaco editor for incremental rendering (#934)**
- **perf(agent-kernel): batch kor streaming chunk updates (#933)**
- **perf(agent-tars-server): do not cache all streaming events**

### Releases

- **release(agent-tars): release 0.3.0-beta.3 (#1210)**
- **release(agent-tars): release 0.3.0-beta.1 (#965)**
- **release: publish packages**
- **release(mcp): publish packages (#796)**

### Other Changes

- **Revert "feat(webui): add configurable about modal links (#1217)" (#1225)**
- **tweak: mcp browser browser_vision_screen_capture use webp and optimizeForSpeed (#908)**


---

## Summary

This release includes **626 commits** from `7e50908b6cfdba3d09744869a1f3fd5c6489d3ee` to latest, covering:

- **281 new features** across all packages and modules
- **135 bug fixes** improving stability and user experience
- **63 refactoring efforts** for better code maintainability and architecture
- **57 documentation improvements** enhancing developer experience
- **3 testing improvements** for better code quality
- **10 CI/CD enhancements** for better development workflow
- **68 maintenance tasks** including releases, cleanups, and optimizations
- **3 performance optimizations** for better system performance
- **4 release commits** for version management
- **2 other commits** including miscellaneous improvements

### Key Highlights

1. **Comprehensive Feature Development**: 281 new features across the entire Tarko ecosystem
2. **Stability Improvements**: 135 bug fixes ensuring robust operation
3. **Code Quality**: 63 refactoring efforts maintaining clean architecture
4. **Documentation Excellence**: 57 documentation updates for better developer experience
5. **Development Workflow**: Enhanced CI/CD and testing infrastructure

### Breaking Changes

Please refer to individual commit messages for specific breaking changes. Major architectural changes include:
- Migration from `agent-web-ui` to `agent-ui` package naming
- Removal of deprecated APIs and configurations
- Updates to agent configuration structures

### Migration Guide

For detailed migration instructions, please refer to the individual package documentation and commit messages for specific changes that may affect your implementation.
