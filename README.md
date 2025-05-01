

> [!IMPORTANT]
> <a href="./apps/agent-tars/README.md">
>   <img src="./apps/agent-tars/static/hero.png">
> </a>
>
> **\[2025-03-18\]** We released a **technical preview** version of a new desktop app - [Agent TARS](./apps/agent-tars/README.md), a multimodal AI agent that leverages browser operations by visually interpreting web pages and seamlessly integrating with command lines and file systems.


<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

# UI-TARS Desktop

UI-TARS Desktop is a GUI Agent application based on [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) that allows you to control your computer using natural language.


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

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

</div>

## Showcases

| Instruction  | Video |
| :---:  | :---: |
| Please help me open the autosave feature of VS Code and delay AutoSave operations for 500 milliseconds in the VS Code setting.      |    <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" />    |
| Could you help me check the latest open issue of the UI-TARS-Desktop project on GitHub?   | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" />        |


## News

- **\[2025-04-17\]** - 🎉 We're thrilled to announce the release of new UI-TARS Desktop application v0.1.0, featuring a redesigned Agent UI. The application enhances the computer using experience, introduces new browser operation features, and supports [the advanced UI-TARS-1.5 model](https://seed-tars.com/1.5) for improved performance and precise control.
- **\[2025-02-20\]** - 📦 Introduced [UI TARS SDK](./docs/sdk.md), is a powerful cross-platform toolkit for building GUI automation agents.
- **\[2025-01-23\]** - 🚀 We updated the **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** section in the 中文版: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) with new information related to the ModelScope platform. You can now use the ModelScope platform for deployment.


## Features

- 🤖 Natural language control powered by Vision-Language Model
- 🖥️ Screenshot and visual recognition support
- 🎯 Precise mouse and keyboard control
- 💻 Cross-platform support (Windows/MacOS/Browser)
- 🔄 Real-time feedback and status display
- 🔐 Private and secure - fully local processing

## Quick Start

See [Quick Start](./docs/quick-start.md).

## Deployment

See [Deployment](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## SDK (Experimental)

See [@ui-tars/sdk](./docs/sdk.md)

## License

UI-TARS Desktop is licensed under the Apache License 2.0.

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
