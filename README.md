<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

English | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md) | [한국어](./README.ko-KR.md) |  [Español](./README.es-ES.md) | [العربية](./README.ar-SA.md) | [Français](./README.fr-FR.md) | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> is a Multimodal AI Agent Stack, brings the power of GUI Agent and Vision into your terminal, computer, browser and product, currently, we have shipped two projects: [Agent TARS](#agent-tars) and [UI-TARS-desktop](#ui-tars-desktop).


## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Agent TARS](#agent-tars)
  - [Showcase](#showcase)
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

Agent TARS is an open-source multimodal AI agent offering seamless integration with various real-world tools. Built on the powerful capabilities of [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), it brings multimodal reasoning and vision-based interaction right to your terminal, browser, computer and product.

> [!IMPORTANT]
> Since the ability of [UI-TARS-1.5](https://seed-tars.com/1.5) have been integrated by [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), you can understand that Agent TARS is our next exploration after UI-TARS. Currently, it is in the **Beta** stage, check out our [latest release twitter](https://x.com/_ulivz/status/1938009759413899384) for the details.


### Showcase

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


For more showcase, please check out [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

<br>

### Key Features

- 🖱️ **CLI with One-Click Launch** - [Fast setup and execution](https://agent-tars.com/guide/basic/cli.html) with minimal configuration
- 🎨 **GUI Agent** - Vision-based GUI interaction with precise control
- 🌐 **Browser Integration** - Control browsers using [DOM](https://agent-tars.com/guide/basic/browser.html#dom) or [visual grounding](https://agent-tars.com/guide/basic/browser.html#visual-grounding)
- 🔄 **Event Stream Architecture** - Real-time communication between all components for dynamic interactions
- 🧰 **MCP Tools** - [Extend functionality](https://agent-tars.com/guide/basic/mcp.html) with mcp servers.
- 🌐 **Protocol-Based Web UI** - [Interactive interface](https://agent-tars.com/guide/basic/web-ui.html) with streaming responses and dark mode support
- 🖥️ **Headless Server Support** - [Run in background](https://agent-tars.com/guide/advanced/server.html) without UI for automation tasks
- 📦 **Workspace Management** - [Organize your config and files](https://agent-tars.com/guide/basic/workspace.html) with global workspaces
- 🔍 **Search & Command Tools** - Built-in utilities for information retrieval and system control

<br>

### Quick Start

```bash
# Install globally, required Node.js >= 22
npm install @agent-tars/cli@latest -g

# Run with your preferred model provider
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Visit the comprehensive [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) guide for detailed setup instructions.


### Documentation

- [Documentation](https://agent-tars.com)
- [Blog](https://agent-tars.com/beta) - Learn about Agent TARS vision and latest features
- [CLI Documentation](https://agent-tars.com/guide/basic/cli.html) - Master all command-line options
- [Join Discord](https://discord.gg/HnKcSBgTVx) - Connect with our community
- [Follow Official Twitter](https://twitter.com/agent_tars) - Stay updated with latest news
- [Latest release twitter](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

This proect is a GUI Agent application based on [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) that allows you to control your computer using natural language.

<div align="center">
<p>
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">Paper</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/ByteDance-Seed/UI-TARS-1.5-7B">Hugging Face Models</a>&nbsp&nbsp
        | &nbsp&nbsp🫨 <a href="https://discord.gg/pTXwYVjfcs">Discord</a>&nbsp&nbsp
        | &nbsp&nbsp🤖 <a href="https://www.modelscope.cn/collections/UI-TARS-bccb56fa1ef640">ModelScope</a>&nbsp&nbsp
<br>
🖥️ Desktop Application &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene (use in browser)</a> &nbsp&nbsp
| &nbsp&nbsp <a href="https://deepwiki.com/bytedance/UI-TARS-desktop">
    <img alt="Ask DeepWiki.com" src="https://devin.ai/assets/deepwiki-badge.png" style="height: 18px; vertical-align: middle;">
  </a>
</p>

</div>

### Showcase

|                                                          Instruction                                                           |                                                Local Operator                                                |                                               Remote Operator                                                |
| :----------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| Please help me open the autosave feature of VS Code and delay AutoSave operations for 500 milliseconds in the VS Code setting. | <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" /> | <video src="https://github.com/user-attachments/assets/01e49b69-7070-46c8-b3e3-2aaaaec71800" height="300" /> |
|                    Could you help me check the latest open issue of the UI-TARS-Desktop project on GitHub?                     | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" /> | <video src="https://github.com/user-attachments/assets/072fb72d-7394-4bfa-95f5-4736e29f7e58" height="300" /> |

### Features

- 🤖 Natural language control powered by Vision-Language Model
- 🖥️ Screenshot and visual recognition support
- 🎯 Precise mouse and keyboard control
- 💻 Cross-platform support (Windows/MacOS/Browser)
- 🔄 Real-time feedback and status display
- 🔐 Private and secure - fully local processing
- 🛠️ Effortless setup and intuitive remote operators

### Quick Start

See: [Quick Start](./docs/quick-start.md)

### Documentation

- [Deployment](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md).
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md).

## News

- **\[2025-06-25\]** We released a Agent TARS Beta and Agent TARS CLI - [Introducing Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), a multimodal AI agent that aims to explore a work form that is closer to human-like task completion through rich multimodal capabilities (such as GUI Agent, Vision) and seamless integration with various real-world tools.
- **\[2025-06-12\]** - 🎁 We are thrilled to announce the release of UI-TARS Desktop v0.2.0! This update introduces two powerful new features: **Remote Computer Operator** and **Remote Browser Operator**—both completely free. No configuration required: simply click to remotely control any computer or browser, and experience a new level of convenience and intelligence.
- **\[2025-04-17\]** - 🎉 We're thrilled to announce the release of new UI-TARS Desktop application v0.1.0, featuring a redesigned Agent UI. The application enhances the computer using experience, introduces new browser operation features, and supports [the advanced UI-TARS-1.5 model](https://seed-tars.com/1.5) for improved performance and precise control.
- **\[2025-02-20\]** - 📦 Introduced [UI TARS SDK](./docs/sdk.md), is a powerful cross-platform toolkit for building GUI automation agents.
- **\[2025-01-23\]** - 🚀 We updated the **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** section in the 中文版: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) with new information related to the ModelScope platform. You can now use the ModelScope platform for deployment.

## License

This project is licensed under the Apache License 2.0.

## Citation

If you find our paper and code useful in your research, please consider giving a star :star: and citation :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
