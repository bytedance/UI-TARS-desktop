
<p align="center">
  <img alt="UI-TARS"  width="260" src="resources/icon.png">
</p>

# UI-TARS Desktop

UI-TARS Desktop is a GUI Agent application based on [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) that allows you to control your computer using natural language.


<p align="center">
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">Paper</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/bytedance-research/UI-TARS-7B-DPO">Hugging Face Models</a>&nbsp&nbsp
        |
<br>
🖥️ Desktop Application &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene (use in browser)</a>
</p>

## Showcases

| Instruction  | Video |
| :---:  | :---: |
| Get the current weather in SF using the web browser      |    <video src="https://github.com/user-attachments/assets/5235418c-ac61-4895-831d-68c1c749fc87" height="300" />    |
| Send a twitter with the content "hello world"   | <video src="https://github.com/user-attachments/assets/737ccc11-9124-4464-b4be-3514cbced85c" height="300" />        |

## Features

- 🤖 Natural language control powered by Vision-Language Model
- 🖥️ Screenshot and visual recognition support
- 🎯 Precise mouse and keyboard control
- 💻 Cross-platform support (Windows/MacOS)
- 🔄 Real-time feedback and status display

## Quick Start

### Download

You can download the [latest release](https://github.com/bytedance/UI-TARS-desktop/releases/latest) version of UI-TARS Desktop from our releases page.

### Install

#### MacOS

1. Drag **UI TARS** application into the **Applications** folder
  <img src="./images/mac_install.png" width="500px" />

> **Note**: If app broken, you can use `sudo xattr -dr com.apple.quarantine /Applications/UI\ TARS.app`  in Terminal to fix it.
>
> <img src="./images/mac_broken.png" width="400px" />

2. Enable the permission of **UI TARS** in MacOS:
  - System Settings -> Privacy & Security -> **Accessibility**
  - System Settings -> Privacy & Security -> **Screen Recording**
  <img src="./images/mac_permission.png" width="500px" />

3. Then open **UI TARS** application, you can see the following interface:
  <img src="./images/mac_app.png" width="500px" />


#### Windows

**Still to run** the application, you can see the following interface:

<img src="./images/windows_install.png" width="400px" />

### Settings

#### VLM (Vision-Language Model)

Support HuggingFace(Cloud) and Ollama(Local) deployment.

We recommend using HuggingFace Inference Endpoints for fast deployment. We provide two docs for users to refer:

[GUI Model Deployment Guide](https://juniper-switch-f10.notion.site/GUI-Model-Deployment-Guide-17b5350241e280058e98cea60317de71)


<img src="./images/settings_model.png" width="500px" />

If you use Ollama, you can use the following settings to start the server:

```yaml
VLM Provider: ollama
VLM Base Url: http://localhost:11434/v1
VLM API Key: api_key
VLM Model Name: ui-tars
```

> **Note**: VLM Base Url is OpenAI compatible API endpoints (see [OpenAI API protocol document](https://platform.openai.com/docs/guides/vision/uploading-base-64-encoded-images) for more details).

## Development

Just simple two steps to run the application:

```bash
pnpm install
pnpm run dev
```

## System Requirements

- Node.js >= 20
- Supported Operating Systems:
  - Windows 10/11
  - macOS 10.15+

## License

UI-TARS Desktop is licensed under the Apache License 2.0.

## Citation
If you find our paper and code useful in your research, please consider giving a star :star: and citation :pencil:

```BibTeX
@article{uitars2025,
  author    = {Yujia Qin, Yining Ye, Junjie Fang, Haoming Wang, Shihao Liang, Shizuo Tian, Junda Zhang, Jiahao Li, Yunxin Li, Shijue Huang, Wanjun Zhong, Kuanye Li, Jiale Yang, Yu Miao, Woyu Lin, Longxiang Liu, Xu Jiang, Qianli Ma, Jingyu Li, Xiaojun Xiao, Kai Cai, Chuang Li, Yaowei Zheng, Chaolin Jin, Chen Li, Xiao Zhou, Minchao Wang, Haoli Chen, Zhaojian Li, Haihua Yang, Haifeng Liu, Feng Lin, Tao Peng, Xin Liu, Guang Shi},
  title     = {UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  journal   = {arXiv preprint arXiv:2501.12326},
  url       = {https://github.com/bytedance/UI-TARS},
  year      = {2025}
}
```
