<!-- README.zh-CN.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | 简体中文 | [日本語](./README.ja-JP.md) | [한국어](./README.ko-KR.md) |  [Español](./README.es-ES.md) | [العربية](./README.ar-SA.md) | [Français](./README.fr-FR.md) | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> 是一个多模态AI Agent技术栈，将GUI Agent和视觉能力带入你的终端、电脑、浏览器和产品中。目前，我们已发布了两个项目：[Agent TARS](#agent-tars) 和 [UI-TARS-desktop](#ui-tars-desktop)。


## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Agent TARS](#agent-tars)
  - [Showcae](#showcae)
  - [Key Features](#key-features)
  - [Quick Start](#quick-start)
  - [Resources](#resources)
- [UI-TARS Desktop](#ui-tars-desktop)
  - [Showcase](#showcase)
  - [Features](#features)
  - [Quick Start](#quick-start-1)
  - [Documentation](#documentation)
- [News](#news)
- [License](#license)
- [Citation](#citation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


## Agent TARS

<p>
  <a href="https://discord.gg/HnKcSBgTVx"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat-square&logo=discord&colorA=1a1a2e&colorB=ff00ff" alt="discord channel" /></a>
  <a href="https://npmjs.com/package/@agent-tars/cli?activeTab=readme"><img src="https://img.shields.io/npm/v/@agent-tars/cli?style=flat-square&colorA=1a1a2e&colorB=00BFFF" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@agent-tars/cli?minimal=true"><img src="https://img.shields.io/npm/dm/@agent-tars/cli.svg?style=flat-square&colorA=1a1a2e&colorB=39FF14" alt="downloads" /></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@agent-tars/cli.svg?style=flat-square&colorA=1a1a2e&colorB=FFFF00" alt="node version"></a>
  <a href="https://twitter.com/agent_tars"><img src="https://img.shields.io/badge/follow-%40agent__tars-1DA1F2?style=flat-square&logo=twitter&colorA=1a1a2e&colorB=1da1f2" alt="Official Twitter" /></a>
</p>

Agent TARS 是一个开源的多模态AI Agent，可无缝集成各种现实世界工具。基于强大的 [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL) 能力构建，它将多模态推理和基于视觉的交互直接带入你的终端、浏览器、电脑和产品中。

> [!IMPORTANT]  
> 由于 [UI-TARS-1.5](https://seed-tars.com/1.5) 的能力已被 [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL) 整合，你可以理解 Agent TARS 是我们在 UI-TARS 之后的下一次探索。目前，它处于 **Beta** 阶段，查看我们的[最新发布推文](https://x.com/_ulivz/status/1938009759413899384)了解详情。


### Showcae

```
Tell me the top 10 for Humanity's Last Exam
```

https://github.com/user-attachments/assets/043429c1-2820-47ac-a583-dc12682d1adb

<br>

```
Draw me a chart of Hangzhou's weather for one month
```

https://github.com/user-attachments/assets/a9fd72d0-01bb-4233-aa27-ca95194bbce9

<br>

```
Please book me the earliest flight from Hangzhou to Shenzhen on 10.1
```

https://github.com/user-attachments/assets/fd5d1283-e312-4690-bf1d-85cd2fd4fae4


更多展示，请查看 [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842)。

<br>

### Key Features

- 🖱️ **一键启动 CLI** - [快速设置和执行](https://agent-tars.com/guide/basic/cli.html)，配置极简
- 🎨 **GUI Agent** - 基于视觉的GUI交互，精确控制
- 🌐 **浏览器集成** - 使用 [DOM](https://agent-tars.com/guide/basic/browser.html#dom) 或 [视觉定位](https://agent-tars.com/guide/basic/browser.html#visual-grounding) 控制浏览器
- 🔄 **事件流架构** - 所有组件间实时通信，实现动态交互
- 🧰 **MCP 工具** - 通过 mcp servers [扩展功能](https://agent-tars.com/guide/basic/mcp.html)
- 🌐 **基于协议的 Web UI** - [交互界面](https://agent-tars.com/guide/basic/web-ui.html)，支持流式响应和暗黑模式
- 🖥️ **无头服务器支持** - [在后台运行](https://agent-tars.com/guide/advanced/server.html)，无需UI即可执行自动化任务
- 📦 **工作空间管理** - 通过全局工作空间[组织你的配置和文件](https://agent-tars.com/guide/basic/workspace.html)
- 🔍 **搜索和命令工具** - 内置信息检索和系统控制工具

<br>

### Quick Start

```bash
# 全局安装，需要 Node.js >= 22
npm install @agent-tars/cli@latest -g

# 使用你偏好的模型提供商运行
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

访问全面的[快速开始](https://agent-tars.com/guide/get-started/quick-start.html)指南，获取详细安装说明。


### Resources

- [文档](https://agent-tars.com)
- [博客](https://agent-tars.com/beta) - 了解 Agent TARS 愿景和最新功能
- [CLI 文档](https://agent-tars.com/guide/basic/cli.html) - 掌握所有命令行选项
- [加入 Discord](https://discord.gg/HnKcSBgTVx) - 加入我们的社区
- [关注官方 Twitter](https://twitter.com/agent_tars) - 获取最新动态
- [最新发布推文](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

这个项目是一个基于 [UI-TARS (视觉-语言模型)](https://github.com/bytedance/UI-TARS) 的 GUI Agent 应用，允许你使用自然语言控制电脑。

<div align="center">
<p>
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">论文</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/ByteDance-Seed/UI-TARS-1.5-7B">Hugging Face 模型</a>&nbsp&nbsp
        | &nbsp&nbsp🫨 <a href="https://discord.gg/pTXwYVjfcs">Discord</a>&nbsp&nbsp
        | &nbsp&nbsp🤖 <a href="https://www.modelscope.cn/collections/UI-TARS-bccb56fa1ef640">ModelScope</a>&nbsp&nbsp
<br>
🖥️ 桌面应用程序 &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene (在浏览器中使用)</a> &nbsp&nbsp
| &nbsp&nbsp <a href="https://deepwiki.com/bytedance/UI-TARS-desktop">
    <img alt="Ask DeepWiki.com" src="https://devin.ai/assets/deepwiki-badge.png" style="height: 18px; vertical-align: middle;">
  </a>
</p>

</div>

### Showcase

|                                                          指令                                                           |                                                本地操作器                                                |                                                远程操作器                                                |
| :----------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| 请帮我开启 VS Code 的自动保存功能，并将自动保存操作延迟设置为 500 毫秒。 | <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" /> | <video src="https://github.com/user-attachments/assets/01e49b69-7070-46c8-b3e3-2aaaaec71800" height="300" /> |
|                    能否帮我查看 UI-TARS-Desktop 项目在 GitHub 上的最新开放 issue？                     | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" /> | <video src="https://github.com/user-attachments/assets/072fb72d-7394-4bfa-95f5-4736e29f7e58" height="300" /> |

### Features

- 🤖 由视觉-语言模型驱动的自然语言控制
- 🖥️ 支持截图和视觉识别
- 🎯 精确的鼠标和键盘控制
- 💻 跨平台支持 (Windows/MacOS/Browser)
- 🔄 实时反馈和状态显示
- 🔐 私密且安全 - 完全本地处理
- 🛠️ 简便的设置和直观的远程操作器

### Quick Start

参见：[快速开始](./docs/quick-start.md)

### Documentation

- [部署](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md)
- [@ui-tars/sdk](./docs/sdk.md)
- [贡献指南](./CONTRIBUTING.md)

## News

- **\[2025-06-25\]** 我们发布了 Agent TARS Beta 和 Agent TARS CLI - [介绍 Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html)，这是一个多模态 AI Agent，旨在通过丰富的多模态能力（如 GUI Agent、视觉）和与各种现实世界工具的无缝集成，探索更接近人类完成任务方式的工作形态。
- **\[2025-06-12\]** - 🎁 我们很高兴宣布 UI-TARS Desktop v0.2.0 发布！此更新引入了两个强大的新功能：**远程电脑操作器**和**远程浏览器操作器**—完全免费。无需配置：只需点击即可远程控制任何电脑或浏览器，体验全新水平的便捷和智能。
- **\[2025-04-17\]** - 🎉 我们很高兴宣布发布全新的 UI-TARS Desktop 应用程序 v0.1.0，具有重新设计的 Agent UI。该应用提升了电脑使用体验，引入了新的浏览器操作功能，并支持[先进的 UI-TARS-1.5 模型](https://seed-tars.com/1.5)，以提高性能和精确控制。
- **\[2025-02-20\]** - 📦 推出 [UI TARS SDK](./docs/sdk.md)，这是一个强大的跨平台工具包，用于构建 GUI 自动化 Agent。
- **\[2025-01-23\]** - 🚀 我们更新了**[云部署](./docs/deployment.md#cloud-deployment)**部分，中文版：[GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb)，添加了与 ModelScope 平台相关的新信息。你现在可以使用 ModelScope 平台进行部署。

## License

本项目采用 Apache License 2.0 许可证。

## Citation

如果你发现我们的论文和代码对你的研究有用，请考虑给我们一个星标 :star: 和引用 :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
