<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<p align="center">
  <a href="https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=UI-TARS-desktop">
    <img src="./images/atlas-cloud-logo.png" alt="Atlas Cloud" width="120">
  </a>
</p>

> 🎁 `atlascloud` provider 可以让 TARS 指向 [Atlas Cloud](https://www.atlascloud.ai/?utm_source=github&utm_medium=link&utm_campaign=UI-TARS-desktop) —— 一个全模态、OpenAI 兼容的推理平台，单个 API 即可访问 DeepSeek、Qwen、GLM、Kimi、MiniMax 等模型。像其它 OpenAI 兼容后端一样配置即可（`baseURL: https://api.atlascloud.ai/v1`，模型如 `deepseek-ai/deepseek-v4-pro`）。价格见 [coding plan](https://www.atlascloud.ai/console/coding-plan)。
>
> <details>
> <summary>Atlas Cloud 全部对话模型（59）</summary>
>
> - Anthropic (Claude): `anthropic/claude-haiku-4.5-20251001`, `anthropic/claude-opus-4.8`, `anthropic/claude-sonnet-4.6`
> - OpenAI (GPT): `openai/gpt-5.4`, `openai/gpt-5.5`
> - Google (Gemini): `google/gemini-3.1-flash-lite`, `google/gemini-3.1-pro-preview`, `google/gemini-3.5-flash`
> - 阿里 (Qwen): `qwen/qwen2.5-7b-instruct`, `Qwen/Qwen3-235B-A22B-Instruct-2507`, `qwen/qwen3-235b-a22b-thinking-2507`, `qwen/qwen3-30b-a3b`, `Qwen/Qwen3-30B-A3B-Instruct-2507`, `qwen/qwen3-30b-a3b-thinking-2507`, `qwen/qwen3-32b`, `qwen/qwen3-8b`, `Qwen/Qwen3-Coder`, `qwen/qwen3-coder-next`, `qwen/qwen3-max-2026-01-23`, `Qwen/Qwen3-Next-80B-A3B-Instruct`, `Qwen/Qwen3-Next-80B-A3B-Thinking`, `Qwen/Qwen3-VL-235B-A22B-Instruct`, `qwen/qwen3-vl-235b-a22b-thinking`, `qwen/qwen3-vl-30b-a3b-instruct`, `qwen/qwen3-vl-30b-a3b-thinking`, `qwen/qwen3-vl-8b-instruct`, `qwen/qwen3.5-122b-a10b`, `qwen/qwen3.5-27b`, `qwen/qwen3.5-35b-a3b`, `qwen/qwen3.5-397b-a17b`, `qwen/qwen3.6-35b-a3b`, `qwen/qwen3.6-plus`
> - DeepSeek: `deepseek-ai/deepseek-ocr`, `deepseek-ai/deepseek-r1-0528`, `deepseek-ai/DeepSeek-V3-0324`, `deepseek-ai/DeepSeek-V3.1`, `deepseek-ai/DeepSeek-V3.1-Terminus`, `deepseek-ai/deepseek-v3.2`, `deepseek-ai/DeepSeek-V3.2-Exp`, `deepseek-ai/deepseek-v4-flash`, `deepseek-ai/deepseek-v4-pro`
> - Moonshot (Kimi): `moonshotai/Kimi-K2-Instruct`, `moonshotai/Kimi-K2-Instruct-0905`, `moonshotai/Kimi-K2-Thinking`, `moonshotai/kimi-k2.5`, `moonshotai/kimi-k2.6`
> - 智谱 (GLM): `zai-org/GLM-4.6`, `zai-org/glm-4.7`, `zai-org/glm-5`, `zai-org/glm-5-turbo`, `zai-org/glm-5.1`, `zai-org/glm-5v-turbo`
> - MiniMax: `MiniMaxAI/MiniMax-M2`, `minimaxai/minimax-m2.1`, `minimaxai/minimax-m2.5`, `minimaxai/minimax-m2.7`
> - xAI: `xai/grok-4.3`
> - 快手 (KAT): `kwaipilot/kat-coder-pro-v2`
> - 其他: `owl`
>
> `deepseek-ai/deepseek-v4-pro` 是推理模型，请给足 `max_tokens`（>= 512）。
>
> </details>

## Introduction

[English](./README.md) | 简体中文

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

<b>TARS<sup>\*</sup></b> 是一个多模态 AI Agent Stack，目前包含两个项目：[Agent TARS](#agent-tars) 和 [UI-TARS-desktop](#ui-tars-desktop)：

<table>
  <thead>
    <tr>
      <th width="50%" align="center"><a href="#agent-tars">Agent TARS</a></th>
      <th width="50%" align="center"><a href="#ui-tars-desktop">UI-TARS-desktop</a></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <video src="https://github.com/user-attachments/assets/c9489936-afdc-4d12-adda-d4b90d2a869d" width="50%"></video>
      </td>
      <td align="center">
        <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" width="50%"></video>
      </td>
    </tr>
    <tr>
      <td align="left">
        <b>Agent TARS</b> 是一个通用的多模态 AI Agent Stack，它将 GUI Agent 和 Vision 的强大功能带入你的终端、计算机、浏览器和产品中。
        <br>
        <br>
        它主要提供 <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> 和 <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web UI</a> 供使用。
        旨在通过前沿的多模态 LLMs 和与各种现实世界 <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a> 工具的无缝集成，提供更接近人类任务完成方式的工作流程。
      </td>
      <td align="left">
        <b>UI-TARS Desktop</b> 是一个桌面应用程序，基于 <a href="https://github.com/bytedance/UI-TARS" target="_blank">UI-TARS</a> 模型提供原生的 GUI Agent。
        <br>
        <br>
        它主要提供
        <a href="https://github.com/bytedance/UI-TARS-desktop/blob/docs/new-readme/docs/quick-start.md#get-model-and-run" target="_blank">本地</a>计算机以及浏览器操作器。
      </td>
    </tr>
  </tbody>
</table>

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [News](#news)
- [Agent TARS](#agent-tars)
  - [Showcase](#showcase)
  - [Core Features](#core-features)
  - [Quick Start](#quick-start)
  - [Documentation](#documentation)
- [UI-TARS Desktop](#ui-tars-desktop)
  - [Showcase](#showcase-1)
  - [Features](#features)
  - [Quick Start](#quick-start-1)
- [Contributing](#contributing)
- [License](#license)
- [Citation](#citation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## News

- **\[2025-11-05\]** 🎉 我们很高兴地宣布 [Agent TARS CLI v0.3.0](https://github.com/bytedance/UI-TARS-desktop/releases/tag/v0.3.0) 正式发布！此版本新增了多种工具的流式调用支持（shell 命令、多文件结构化展示）、Runtime Setting 和耗时统计、Event Stream 可视化用于数据流追踪和调试，以及 AIO Sandbox 集成、支持隔离的执行环境。
- **\[2025-06-25\]** 我们发布了 Agent TARS Beta 和 Agent TARS CLI - [Introducing Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html)，这是一个多模态 AI agent，旨在通过丰富的多模态能力（如 GUI Agent、Vision）和与各种现实世界工具的无缝集成，探索更接近人类任务完成方式的工作形式。
- **\[2025-06-12\]** - 🎁 我们很高兴宣布发布 UI-TARS Desktop v0.2.0！此次更新引入了两个强大的新功能：**Remote Computer Operator** 和 **Remote Browser Operator**—— 完全免费。无需配置：只需点击即可远程控制任何计算机或浏览器，体验全新的便利和智能水平。
- **\[2025-04-17\]** - 🎉 我们很高兴宣布发布全新的 UI-TARS Desktop 应用程序 v0.1.0，具有重新设计的 Agent UI。该应用程序增强了计算机使用体验，引入了新的浏览器操作功能，并支持[先进的 UI-TARS-1.5 模型](https://seed-tars.com/1.5)以提供更好的性能和精确控制。
- **\[2025-02-20\]** - 📦 推出了 [UI TARS SDK](./docs/sdk.md)，这是一个强大的跨平台工具包，用于构建 GUI 自动化 agent。
- **\[2025-01-23\]** - 🚀 我们更新了**[Cloud Deployment](./docs/deployment.md#cloud-deployment)**部分的中文版：[GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcuNPlHL21gNb)，其中包含与 ModelScope 平台相关的新信息。你现在可以使用 ModelScope 平台进行部署。

<br>

## Agent TARS

<p>
    <a href="https://npmjs.com/package/@agent-tars/cli?activeTab=readme"><img src="https://img.shields.io/npm/v/@agent-tars/cli?style=for-the-badge&colorA=1a1a2e&colorB=3B82F6&logo=npm&logoColor=white" alt="npm version" /></a>
    <a href="https://npmcharts.com/compare/@agent-tars/cli?minimal=true"><img src="https://img.shields.io/npm/dm/@agent-tars/cli.svg?style=for-the-badge&colorA=1a1a2e&colorB=0EA5E9&logo=npm&logoColor=white" alt="downloads" /></a>
    <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@agent-tars/cli.svg?style=for-the-badge&colorA=1a1a2e&colorB=06B6D4&logo=node.js&logoColor=white" alt="node version"></a>
    <a href="https://discord.gg/HnKcSBgTVx"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Community" /></a>
    <a href="https://twitter.com/agent_tars"><img src="https://img.shields.io/badge/Twitter-Follow%20%40agent__tars-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Official Twitter" /></a>
    <a href="https://applink.larkoffice.com/client/chat/chatter/add_by_link?link_token=deen76f4-ea3c-4964-93a3-78f126f39651"><img src="https://img.shields.io/badge/飞书群-加入交流群-00D4AA?style=for-the-badge&logo=lark&logoColor=white" alt="飞书交流群" /></a>
    <a href="https://deepwiki.com/bytedance/UI-TARS-desktop"><img src="https://img.shields.io/badge/DeepWiki-Ask%20AI-8B5CF6?style=for-the-badge&logo=gitbook&logoColor=white" alt="Ask DeepWiki" /></a>
</p>

<b>Agent TARS</b> 是一个通用的多模态 AI Agent Stack，它将 GUI Agent 和 Vision 的强大功能带入你的终端、计算机、浏览器和产品中。 <br> <br>
它主要提供 <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> 和 <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web UI</a> 供使用。
旨在通过前沿的多模态 LLMs 和与各种现实世界 <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a> 工具的无缝集成，提供更接近人类任务完成方式的工作流程。

### Showcase

```
请帮我在 Priceline 上预订 9 月 1 日从圣何塞到纽约最早的航班，以及 9 月 6 日最晚的返程航班
```

https://github.com/user-attachments/assets/772b0eef-aef7-4ab9-8cb0-9611820539d8

<br>

<table>
  <thead>
    <tr>
      <th width="50%" align="center">预订酒店</th>
      <th width="50%" align="center">使用额外的 MCP Servers 生成图表</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <video src="https://github.com/user-attachments/assets/c9489936-afdc-4d12-adda-d4b90d2a869d" width="50%"></video>
      </td>
      <td align="center">
        <video src="https://github.com/user-attachments/assets/a9fd72d0-01bb-4233-aa27-ca95194bbce9" width="50%"></video>
      </td>
    </tr>
    <tr>
      <td align="left">
        <b>指令：</b> <i>我 9 月 1 日到 9 月 6 日在洛杉矶，预算 5000 美元。请帮我在 booking.com 上预订离机场最近的丽思卡尔顿酒店，并为我编制一份交通指南</i>
      </td>
      <td align="left">
        <b>指令：</b> <i>为我绘制杭州一个月的天气图表</i>
      </td>
    </tr>
  </tbody>
</table>

更多用例，请查看 [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842)。

### Core Features

- 🖱️ **一键开箱即用的 CLI** - 支持 **有界面** [Web UI](https://agent-tars.com/guide/basic/web-ui.html) 和 **无界面** [server](https://agent-tars.com/guide/advanced/server.html) [执行](https://agent-tars.com/guide/basic/cli.html)。
- 🌐 **混合 Browser Agent** - 使用 [GUI Agent](https://agent-tars.com/guide/basic/browser.html#visual-grounding)、[DOM](https://agent-tars.com/guide/basic/browser.html#dom) 或混合策略控制浏览器。
- 🔄 **Event Stream** - 协议驱动的 Event Stream 驱动 [Context Engineering](https://agent-tars.com/beta#context-engineering) 和 [Agent UI](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html#easy-to-build-applications)。
- 🧰 **MCP Integration** - 内核构建在 MCP 之上，同时支持挂载 [MCP Servers](https://agent-tars.com/guide/basic/mcp.html) 来连接现实世界的工具。

### Quick Start

<img alt="Agent TARS CLI" src="https://agent-tars.com/agent-tars-cli.png">

```bash
# 使用 `npx` 启动。
npx @agent-tars/cli@latest

# 全局安装，需要 Node.js >= 22
npm install @agent-tars/cli@latest -g

# 使用你喜欢的模型提供商运行
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

访问完整的 [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) 指南获取详细的设置说明。

### Documentation

> 🌟 **探索 Agent TARS Universe** 🌟

<table>
  <thead>
    <tr>
      <th width="20%" align="center">分类</th>
      <th width="30%" align="center">资源链接</th>
      <th width="50%" align="left">描述</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">🏠 <strong>核心枢纽</strong></td>
      <td align="center">
        <a href="https://agent-tars.com">
          <img src="https://img.shields.io/badge/Visit-Website-4F46E5?style=for-the-badge&logo=globe&logoColor=white" alt="Website" />
        </a>
      </td>
      <td align="left">进入 Agent TARS 生态系统的入口</td>
    </tr>
      <tr>
      <td align="center">📚 <strong>Quick Start</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/guide/get-started/quick-start.html">
          <img src="https://img.shields.io/badge/Get-Started-06B6D4?style=for-the-badge&logo=rocket&logoColor=white" alt="Quick Start" />
        </a>
      </td>
      <td align="left">5 分钟从零快速上手</td>
    </tr>
    <tr>
      <td align="center">🚀 <strong>最新动态</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/beta">
          <img src="https://img.shields.io/badge/Read-Blog-F59E0B?style=for-the-badge&logo=rss&logoColor=white" alt="Blog" />
        </a>
      </td>
      <td align="left">发现前沿功能和愿景</td>
    </tr>
    <tr>
      <td align="center">🛠️ <strong>开发者专区</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/guide/get-started/introduction.html">
          <img src="https://img.shields.io/badge/View-Docs-10B981?style=for-the-badge&logo=gitbook&logoColor=white" alt="Docs" />
        </a>
      </td>
      <td align="left">掌握每个命令和功能</td>
    </tr>
    <tr>
      <td align="center">🎯 <strong>Showcase</strong></td>
      <td align="center">
        <a href="https://github.com/bytedance/UI-TARS-desktop/issues/842">
          <img src="https://img.shields.io/badge/View-Examples-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Examples" />
        </a>
      </td>
      <td align="left">查看官方和社区构建的用例</td>
    </tr>
    <tr>
      <td align="center">🔧 <strong>参考文档</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/api/">
          <img src="https://img.shields.io/badge/API-Reference-EF4444?style=for-the-badge&logo=book&logoColor=white" alt="API" />
        </a>
      </td>
      <td align="left">完整的技术参考</td>
    </tr>
  </tbody>
</table>

<br/>
<br/>
<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

UI-TARS Desktop 是一个由 [UI-TARS](https://github.com/bytedance/UI-TARS) 和 Seed-1.5-VL/1.6 系列模型驱动的原生 GUI agent，可在你的本地计算机上使用。

<div align="center">
<p>
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">Paper</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/ByteDance-Seed/UI-TARS-1.5-7B">Hugging Face Models</a>&nbsp&nbsp
        | &nbsp&nbsp🫨 <a href="https://discord.gg/pTXwYVjfcs">Discord</a>&nbsp&nbsp
        | &nbsp&nbsp🤖 <a href="https://www.modelscope.cn/collections/UI-TARS-bccb56fa1ef640">ModelScope</a>&nbsp&nbsp
<br>
🖥️ Desktop Application &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene (use in browser)</a> &nbsp&nbsp
</p>

</div>

### Showcase

<!-- // FIXME: Choose only two demo, one local computer and one remote computer showcase. -->

|                                           指令                                            |                                                  本地操作器                                                  |                                                  远程操作器                                                  |
| :---------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| 请帮我在 VS Code 设置中打开 VS Code 的自动保存功能，并将自动保存操作延迟设置为 500 毫秒。 | <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" /> | <video src="https://github.com/user-attachments/assets/01e49b69-7070-46c8-b3e3-2aaaaec71800" height="300" /> |
|           你能帮我查看一下 GitHub 上 UI-TARS-Desktop 项目的最新 open issue 吗？           | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" /> | <video src="https://github.com/user-attachments/assets/072fb72d-7394-4bfa-95f5-4736e29f7e58" height="300" /> |

### Features

- 🤖 由 Vision-Language Model 驱动的自然语言控制
- 🖥️ 截图和视觉识别支持
- 🎯 精确的鼠标和键盘控制
- 💻 跨平台支持 (Windows/MacOS/Browser)
- 🔄 实时反馈和状态显示
- 🔐 私密且安全 - 完全本地处理

### Quick Start

参见 [Quick Start](./docs/quick-start.md)

## Contributing

参见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

本项目基于 Apache License 2.0 许可证。

## Citation

如果你觉得我们的论文和代码对你的研究有用，请考虑给个 star :star: 和引用 :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
