<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Introduction

English | [简体中文](./README.zh-CN.md)

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

<b>TARS<sup>\*</sup></b> is a Multimodal AI Agent stack, currently shipping two projects: [Agent TARS](#agent-tars) and [UI-TARS-desktop](#ui-tars-desktop):

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
        <b>Agent TARS</b> is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product.
        <br>
        <br>
        It primarily ships with a <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> and <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web UI</a> for usage.
        It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a> tools.
      </td>
      <td align="left">
        <b>UI-TARS Desktop</b> is a desktop application that provides a native GUI Agent based on the <a href="https://github.com/bytedance/UI-TARS" target="_blank">UI-TARS</a> model.
        <br>
        <br>
        It primarily ships a
        <a href="https://github.com/bytedance/UI-TARS-desktop/blob/main/docs/quick-start.md#get-model-and-run-local-operator" target="_blank">local</a> and 
        <a href="https://github.com/bytedance/UI-TARS-desktop/blob/main/docs/quick-start.md#run-remote-operator" target="_blank">remote</a> computer as well as browser operators.
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

- **\[2025-06-25\]** We released a Agent TARS Beta and Agent TARS CLI - [Introducing Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), a multimodal AI agent that aims to explore a work form that is closer to human-like task completion through rich multimodal capabilities (such as GUI Agent, Vision) and seamless integration with various real-world tools.
- **\[2025-06-12\]** - 🎁 We are thrilled to announce the release of UI-TARS Desktop v0.2.0! This update introduces two powerful new features: **Remote Computer Operator** and **Remote Browser Operator**—both completely free. No configuration required: simply click to remotely control any computer or browser, and experience a new level of convenience and intelligence.
- **\[2025-04-17\]** - 🎉 We're thrilled to announce the release of new UI-TARS Desktop application v0.1.0, featuring a redesigned Agent UI. The application enhances the computer using experience, introduces new browser operation features, and supports [the advanced UI-TARS-1.5 model](https://seed-tars.com/1.5) for improved performance and precise control.
- **\[2025-02-20\]** - 📦 Introduced [UI TARS SDK](./docs/sdk.md), is a powerful cross-platform toolkit for building GUI automation agents.
- **\[2025-01-23\]** - 🚀 We updated the **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** section in the 中文版: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) with new information related to the ModelScope platform. You can now use the ModelScope platform for deployment.

<br>

## Agent TARS

<p>
    <a href="https://npmjs.com/package/@agent-tars/cli?activeTab=readme"><img src="https://img.shields.io/npm/v/@agent-tars/cli?style=for-the-badge&colorA=1a1a2e&colorB=3B82F6&logo=npm&logoColor=white" alt="npm version" /></a>
    <a href="https://npmcharts.com/compare/@agent-tars/cli?minimal=true"><img src="https://img.shields.io/npm/dm/@agent-tars/cli.svg?style=for-the-badge&colorA=1a1a2e&colorB=0EA5E9&logo=npm&logoColor=white" alt="downloads" /></a>
    <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/@agent-tars/cli.svg?style=for-the-badge&colorA=1a1a2e&colorB=06B6D4&logo=node.js&logoColor=white" alt="node version"></a>
    <a href="https://discord.gg/HnKcSBgTVx"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord Community" /></a>
    <a href="https://twitter.com/agent_tars"><img src="https://img.shields.io/badge/Twitter-Follow%20%40agent__tars-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Official Twitter" /></a>
    <a href="https://applink.larkoffice.com/client/chat/chatter/add_by_link?link_token=279h3365-b0fa-407f-89f3-0f96f36cd4d8"><img src="https://img.shields.io/badge/飞书群-加入交流群-00D4AA?style=for-the-badge&logo=lark&logoColor=white" alt="飞书交流群" /></a>
    <a href="https://deepwiki.com/bytedance/UI-TARS-desktop"><img src="https://img.shields.io/badge/DeepWiki-Ask%20AI-8B5CF6?style=for-the-badge&logo=gitbook&logoColor=white" alt="Ask DeepWiki" /></a>
</p>

<b>Agent TARS</b> is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product. <br> <br>
It primarily ships with a <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> and <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web UI</a> for usage.
It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a> tools.


### Showcase

```
Please help me book the earliest flight from San Jose to New York on September 1st and the last return flight on September 6th on Priceline
```

https://github.com/user-attachments/assets/772b0eef-aef7-4ab9-8cb0-9611820539d8

<br>

<table>
  <thead>
    <tr>
      <th width="50%" align="center">Booking Hotel</th>
      <th width="50%" align="center">Generate Chart with extra MCP Servers</th>
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
        <b>Instruction:</b> <i>I am in Los Angeles from September 1st to September 6th, with a budget of $5,000. Please help me book a Ritz-Carlton hotel closest to the airport on booking.com and compile a transportation guide for me</i>
      </td>
      <td align="left">
        <b>Instruction:</b> <i>Draw me a chart of Hangzhou's weather for one month</i>
      </td>
    </tr>
  </tbody>
</table>

For more use cases, please check out [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

### Core Features

- 🖱️ **One-Click Out-of-the-box CLI** - Supports both **headful** [Web UI](https://agent-tars.com/guide/basic/web-ui.html) and **headless** [server](https://agent-tars.com/guide/advanced/server.html)) [execution](https://agent-tars.com/guide/basic/cli.html).
- 🌐 **Hybrid Browser Agent** - Control browsers using [GUI Agent](https://agent-tars.com/guide/basic/browser.html#visual-grounding), [DOM](https://agent-tars.com/guide/basic/browser.html#dom), or a hybrid strategy.
- 🔄 **Event Stream** - Protocol-driven Event Stream drives [Context Engineering](https://agent-tars.com/beta#context-engineering) and [Agent UI](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html#easy-to-build-applications).
- 🧰 **MCP Integration** - The kernel is built on MCP and also supports mounting [MCP Servers](https://agent-tars.com/guide/basic/mcp.html) to connect to real-world tools.

### Quick Start

<img alt="Agent TARS CLI" src="https://agent-tars.com/agent-tars-cli.png">

```bash
# Luanch with `npx`.
npx @agent-tars/cli@latest

# Install globally, required Node.js >= 22
npm install @agent-tars/cli@latest -g

# Run with your preferred model provider
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Visit the comprehensive [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) guide for detailed setup instructions.

### Documentation

> 🌟 **Explore Agent TARS Universe** 🌟

<table>
  <thead>
    <tr>
      <th width="20%" align="center">Category</th>
      <th width="30%" align="center">Resource Link</th>
      <th width="50%" align="left">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">🏠 <strong>Central Hub</strong></td>
      <td align="center">
        <a href="https://agent-tars.com">
          <img src="https://img.shields.io/badge/Visit-Website-4F46E5?style=for-the-badge&logo=globe&logoColor=white" alt="Website" />
        </a>
      </td>
      <td align="left">Your gateway to Agent TARS ecosystem</td>
    </tr>
      <tr>
      <td align="center">📚 <strong>Quick Start</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/guide/get-started/quick-start.html">
          <img src="https://img.shields.io/badge/Get-Started-06B6D4?style=for-the-badge&logo=rocket&logoColor=white" alt="Quick Start" />
        </a>
      </td>
      <td align="left">Zero to hero in 5 minutes</td>
    </tr>
    <tr>
      <td align="center">🚀 <strong>What's New</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/beta">
          <img src="https://img.shields.io/badge/Read-Blog-F59E0B?style=for-the-badge&logo=rss&logoColor=white" alt="Blog" />
        </a>
      </td>
      <td align="left">Discover cutting-edge features & vision</td>
    </tr>
    <tr>
      <td align="center">🛠️ <strong>Developer Zone</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/guide/get-started/introduction.html">
          <img src="https://img.shields.io/badge/View-Docs-10B981?style=for-the-badge&logo=gitbook&logoColor=white" alt="Docs" />
        </a>
      </td>
      <td align="left">Master every command & features</td>
    </tr>
    <tr>
      <td align="center">🎯 <strong>Showcase</strong></td>
      <td align="center">
        <a href="https://github.com/bytedance/UI-TARS-desktop/issues/842">
          <img src="https://img.shields.io/badge/View-Examples-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Examples" />
        </a>
      </td>
      <td align="left">View use cases built by the official and community</td>
    </tr>
    <tr>
      <td align="center">🔧 <strong>Reference</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/api/">
          <img src="https://img.shields.io/badge/API-Reference-EF4444?style=for-the-badge&logo=book&logoColor=white" alt="API" />
        </a>
      </td>
      <td align="left">Complete technical reference</td>
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

UI-TARS Desktop is a native GUI agent for your local computer, driven by [UI-TARS](https://github.com/bytedance/UI-TARS) and Seed-1.5-VL/1.6 series models.

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

### Quick Start

See [Quick Start](./docs/quick-start.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

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