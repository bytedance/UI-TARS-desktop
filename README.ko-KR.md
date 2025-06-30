<!-- README.ko-KR.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md) | 한국어 |  [Español](./README.es-ES.md) | [العربية](./README.ar-SA.md) | [Français](./README.fr-FR.md) | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b>는 멀티모달 AI Agent 스택으로, GUI Agent와 Vision의 강력한 기능을 터미널, 컴퓨터, 브라우저 및 제품에 제공합니다. 현재 우리는 두 가지 프로젝트를 출시했습니다: [Agent TARS](#agent-tars)와 [UI-TARS-desktop](#ui-tars-desktop)입니다.

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

Agent TARS는 다양한 실제 도구와의 원활한 통합을 제공하는 오픈소스 멀티모달 AI 에이전트입니다. [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL)의 강력한 기능을 기반으로, 멀티모달 추론과 시각 기반 상호작용을 터미널, 브라우저, 컴퓨터 및 제품에 바로 제공합니다.

> [!IMPORTANT]
> [UI-TARS-1.5](https://seed-tars.com/1.5)의 기능이 [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL)에 통합되었으므로, Agent TARS는 UI-TARS 이후의 다음 탐색이라고 이해할 수 있습니다. 현재는 **베타** 단계에 있으며, 자세한 내용은 [최신 릴리스 트위터](https://x.com/_ulivz/status/1938009759413899384)를 확인하세요.


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


더 많은 예시는 [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842)에서 확인할 수 있습니다.

<br>

### Key Features

- 🖱️ **원클릭으로 실행되는 CLI** - [빠른 설정 및 실행](https://agent-tars.com/guide/basic/cli.html)으로 최소한의 구성
- 🎨 **GUI Agent** - 정확한 제어가 가능한 비전 기반 GUI 상호작용
- 🌐 **브라우저 통합** - [DOM](https://agent-tars.com/guide/basic/browser.html#dom) 또는 [시각적 그라운딩](https://agent-tars.com/guide/basic/browser.html#visual-grounding)을 사용한 브라우저 제어
- 🔄 **이벤트 스트림 아키텍처** - 동적 상호작용을 위한 모든 컴포넌트 간의 실시간 통신
- 🧰 **MCP 도구** - mcp 서버로 [기능 확장](https://agent-tars.com/guide/basic/mcp.html)
- 🌐 **프로토콜 기반 웹 UI** - 스트리밍 응답과 다크 모드를 지원하는 [대화형 인터페이스](https://agent-tars.com/guide/basic/web-ui.html)
- 🖥️ **헤드리스 서버 지원** - 자동화 작업을 위한 UI 없이 [백그라운드에서 실행](https://agent-tars.com/guide/advanced/server.html)
- 📦 **워크스페이스 관리** - 글로벌 워크스페이스로 [구성 및 파일 정리](https://agent-tars.com/guide/basic/workspace.html)
- 🔍 **검색 및 명령 도구** - 정보 검색 및 시스템 제어를 위한 내장 유틸리티

<br>

### Quick Start

```bash
# 전역적으로 설치, Node.js >= 22 필요
npm install @agent-tars/cli@latest -g

# 선호하는 모델 제공자로 실행
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

자세한 설정 안내는 포괄적인 [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) 가이드를 참조하세요.


### Documentation

- [문서](https://agent-tars.com)
- [블로그](https://agent-tars.com/beta) - Agent TARS의 비전과 최신 기능에 대해 알아보기
- [CLI 문서](https://agent-tars.com/guide/basic/cli.html) - 모든 커맨드라인 옵션 마스터하기
- [Discord 참여](https://discord.gg/HnKcSBgTVx) - 커뮤니티와 연결하기
- [공식 Twitter 팔로우](https://twitter.com/agent_tars) - 최신 뉴스 받아보기
- [최신 릴리스 트위터](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

이 프로젝트는 [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS)를 기반으로 한 GUI Agent 애플리케이션으로, 자연어를 사용하여 컴퓨터를 제어할 수 있습니다.

<div align="center">
<p>
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">논문</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/ByteDance-Seed/UI-TARS-1.5-7B">Hugging Face 모델</a>&nbsp&nbsp
        | &nbsp&nbsp🫨 <a href="https://discord.gg/pTXwYVjfcs">Discord</a>&nbsp&nbsp
        | &nbsp&nbsp🤖 <a href="https://www.modelscope.cn/collections/UI-TARS-bccb56fa1ef640">ModelScope</a>&nbsp&nbsp
<br>
🖥️ 데스크톱 애플리케이션 &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene (브라우저에서 사용)</a> &nbsp&nbsp
| &nbsp&nbsp <a href="https://deepwiki.com/bytedance/UI-TARS-desktop">
    <img alt="Ask DeepWiki.com" src="https://devin.ai/assets/deepwiki-badge.png" style="height: 18px; vertical-align: middle;">
  </a>
</p>

</div>

### Showcase

|                                                          지시사항                                                           |                                                로컬 오퍼레이터                                                |                                               원격 오퍼레이터                                                |
| :----------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| VS Code의 자동 저장 기능을 열고 VS Code 설정에서 자동 저장 작업을 500밀리초 지연시키도록 도와주세요. | <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" /> | <video src="https://github.com/user-attachments/assets/01e49b69-7070-46c8-b3e3-2aaaaec71800" height="300" /> |
|                    GitHub에서 UI-TARS-Desktop 프로젝트의 최신 오픈 이슈를 확인해줄 수 있나요?                     | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" /> | <video src="https://github.com/user-attachments/assets/072fb72d-7394-4bfa-95f5-4736e29f7e58" height="300" /> |

### Features

- 🤖 Vision-Language Model이 제공하는 자연어 제어
- 🖥️ 스크린샷 및 시각적 인식 지원
- 🎯 정확한 마우스 및 키보드 제어
- 💻 크로스 플랫폼 지원(Windows/MacOS/브라우저)
- 🔄 실시간 피드백 및 상태 표시
- 🔐 개인 정보 보호 및 보안 - 완전한 로컬 처리
- 🛠️ 쉬운 설정 및 직관적인 원격 오퍼레이터

### Quick Start

참조: [Quick Start](./docs/quick-start.md)

### Documentation

- [배포](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md)
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## News

- **\[2025-06-25\]** Agent TARS Beta와 Agent TARS CLI를 출시했습니다 - [Agent TARS Beta 소개](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), 풍부한 멀티모달 기능(GUI Agent, Vision 등)과 다양한 실제 도구와의 원활한 통합을 통해 인간과 유사한 작업 완료에 더 가까운 작업 형태를 탐색하는 것을 목표로 하는 멀티모달 AI 에이전트입니다.
- **\[2025-06-12\]** - 🎁 UI-TARS Desktop v0.2.0 출시를 발표하게 되어 기쁩니다! 이 업데이트는 두 가지 강력한 새 기능을 도입합니다: **원격 컴퓨터 오퍼레이터**와 **원격 브라우저 오퍼레이터**—모두 완전히 무료입니다. 구성이 필요 없습니다: 간단히 클릭하여 원격으로 모든 컴퓨터나 브라우저를 제어하고, 새로운 편의성과 지능을 경험하세요.
- **\[2025-04-17\]** - 🎉 새로운 UI-TARS Desktop 애플리케이션 v0.1.0 출시를 발표하게 되어 기쁩니다. 재설계된 Agent UI를 특징으로 합니다. 이 애플리케이션은 컴퓨터 사용 경험을 향상시키고, 새로운 브라우저 작동 기능을 도입하며, 향상된 성능과 정밀 제어를 위해 [고급 UI-TARS-1.5 모델](https://seed-tars.com/1.5)을 지원합니다.
- **\[2025-02-20\]** - 📦 [UI TARS SDK](./docs/sdk.md)를 소개합니다. GUI 자동화 에이전트를 구축하기 위한 강력한 크로스 플랫폼 툴킷입니다.
- **\[2025-01-23\]** - 🚀 중국어 버전의 **[클라우드 배포](./docs/deployment.md#cloud-deployment)** 섹션을 ModelScope 플랫폼 관련 새 정보로 업데이트했습니다: [GUI모델배포튜토리얼](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb). 이제 배포를 위해 ModelScope 플랫폼을 사용할 수 있습니다.

## License

이 프로젝트는 Apache License 2.0에 따라 라이센스가 부여됩니다.

## Citation

우리의 논문과 코드가 여러분의 연구에 유용하다고 생각되면, 별표 :star:와 인용 :pencil:을 고려해 주세요:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
