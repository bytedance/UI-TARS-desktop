<!-- README.pt-BR.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md) | [한국어](./README.ko-KR.md) |  [Español](./README.es-ES.md) | [العربية](./README.ar-SA.md) | [Français](./README.fr-FR.md) | Português | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> é um Stack de Agente IA Multimodal, que traz o poder do GUI Agent e Visão para seu terminal, computador, navegador e produto. Atualmente, lançamos dois projetos: [Agent TARS](#agent-tars) e [UI-TARS-desktop](#ui-tars-desktop).


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

Agent TARS é um agente IA multimodal de código aberto que oferece integração perfeita com várias ferramentas do mundo real. Construído sobre as poderosas capacidades do [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), ele traz raciocínio multimodal e interação baseada em visão diretamente para seu terminal, navegador, computador e produto.

> [!IMPORTANT]  
> Como a capacidade do [UI-TARS-1.5](https://seed-tars.com/1.5) foi integrada pelo [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), você pode entender que o Agent TARS é nossa próxima exploração após o UI-TARS. Atualmente, está em estágio **Beta**, confira nosso [tweet de lançamento mais recente](https://x.com/_ulivz/status/1938009759413899384) para detalhes.


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


Para mais demonstrações, confira [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

<br>

### Key Features

- 🖱️ **CLI with One-Click Launch** - [Configuração e execução rápidas](https://agent-tars.com/guide/basic/cli.html) com configuração mínima
- 🎨 **GUI Agent** - Interação GUI baseada em visão com controle preciso
- 🌐 **Browser Integration** - Controle navegadores usando [DOM](https://agent-tars.com/guide/basic/browser.html#dom) ou [visual grounding](https://agent-tars.com/guide/basic/browser.html#visual-grounding)
- 🔄 **Event Stream Architecture** - Comunicação em tempo real entre todos os componentes para interações dinâmicas
- 🧰 **MCP Tools** - [Estenda a funcionalidade](https://agent-tars.com/guide/basic/mcp.html) com servidores mcp
- 🌐 **Protocol-Based Web UI** - [Interface interativa](https://agent-tars.com/guide/basic/web-ui.html) com respostas em streaming e suporte para modo escuro
- 🖥️ **Headless Server Support** - [Execute em segundo plano](https://agent-tars.com/guide/advanced/server.html) sem UI para tarefas de automação
- 📦 **Workspace Management** - [Organize sua configuração e arquivos](https://agent-tars.com/guide/basic/workspace.html) com workspaces globais
- 🔍 **Search & Command Tools** - Utilitários integrados para recuperação de informações e controle do sistema

<br>

### Quick Start

```bash
# Instale globalmente, requer Node.js >= 22
npm install @agent-tars/cli@latest -g

# Execute com seu provedor de modelo preferido
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Visite o guia abrangente [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) para instruções detalhadas de configuração.


### Documentation

- [Documentation](https://agent-tars.com)
- [Blog](https://agent-tars.com/beta) - Aprenda sobre a visão do Agent TARS e os recursos mais recentes
- [CLI Documentation](https://agent-tars.com/guide/basic/cli.html) - Domine todas as opções de linha de comando
- [Join Discord](https://discord.gg/HnKcSBgTVx) - Conecte-se com nossa comunidade
- [Follow Official Twitter](https://twitter.com/agent_tars) - Mantenha-se atualizado com as últimas notícias
- [Latest release twitter](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

Este projeto é uma aplicação GUI Agent baseada em [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) que permite controlar seu computador usando linguagem natural.

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

- 🤖 Controle de linguagem natural alimentado por Modelo Vision-Language
- 🖥️ Suporte para captura de tela e reconhecimento visual
- 🎯 Controle preciso de mouse e teclado
- 💻 Suporte multiplataforma (Windows/MacOS/Browser)
- 🔄 Feedback em tempo real e exibição de status
- 🔐 Privado e seguro - processamento totalmente local
- 🛠️ Configuração sem esforço e operadores remotos intuitivos

### Quick Start

Veja: [Quick Start](./docs/quick-start.md)

### Documentation

- [Deployment](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md).
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md).

## News

- **\[2025-06-25\]** Lançamos o Agent TARS Beta e Agent TARS CLI - [Introduzindo o Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), um agente IA multimodal que visa explorar uma forma de trabalho mais próxima à conclusão de tarefas humanas através de ricas capacidades multimodais (como GUI Agent, Vision) e integração perfeita com várias ferramentas do mundo real.
- **\[2025-06-12\]** - 🎁 Estamos entusiasmados em anunciar o lançamento do UI-TARS Desktop v0.2.0! Esta atualização introduz dois poderosos novos recursos: **Remote Computer Operator** e **Remote Browser Operator** — ambos completamente gratuitos. Nenhuma configuração necessária: simplesmente clique para controlar remotamente qualquer computador ou navegador, e experimente um novo nível de conveniência e inteligência.
- **\[2025-04-17\]** - 🎉 Estamos entusiasmados em anunciar o lançamento do novo aplicativo UI-TARS Desktop v0.1.0, com uma interface Agent redesenhada. O aplicativo melhora a experiência de uso do computador, introduz novos recursos de operação de navegador e suporta [o modelo avançado UI-TARS-1.5](https://seed-tars.com/1.5) para desempenho aprimorado e controle preciso.
- **\[2025-02-20\]** - 📦 Introduzido [UI TARS SDK](./docs/sdk.md), um poderoso toolkit multiplataforma para construir agentes de automação GUI.
- **\[2025-01-23\]** - 🚀 Atualizamos a seção **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** na versão chinesa: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) com novas informações relacionadas à plataforma ModelScope. Você agora pode usar a plataforma ModelScope para implantação.


## Licença

Este projeto está licenciado sob a Licença Apache 2.0.

## Citação

Se achar o nosso artigo e código úteis para a sua pesquisa, considere dar uma estrela :star: e uma citação :pencil:

```BibTeX
@article{qin2025ui,
title={UI-TARS: Interação Pioneira em Interface Gráfica Automatizada com Agentes Nativos},
author={Qin, Yujia e Ye, Yining e Fang, Junjie e Wang, Haoming e Liang, Shihao e Tian, ​​​​Shizuo e Zhang, Junda e Li, Jiahao e Li, Yunxin e Huang, Shijue e outros},
journal={arXiv preprint arXiv:2501.12326},
ano={2025}
}
```