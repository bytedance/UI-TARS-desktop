<!-- README.es-ES.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md) | [한국어](./README.ko-KR.md) | Español | [العربية](./README.ar-SA.md) | [Français](./README.fr-FR.md) | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> es un Stack de Agentes de IA Multimodal, que lleva el poder de los Agentes GUI y la Visión a tu terminal, ordenador, navegador y producto. Actualmente, hemos lanzado dos proyectos: [Agent TARS](#agent-tars) y [UI-TARS-desktop](#ui-tars-desktop).

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

Agent TARS es un agente de IA multimodal de código abierto que ofrece una integración perfecta con diversas herramientas del mundo real. Construido sobre las potentes capacidades de [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), lleva el razonamiento multimodal y la interacción basada en visión directamente a tu terminal, navegador, ordenador y productos.

> [!IMPORTANT]  
> Dado que la capacidad de [UI-TARS-1.5](https://seed-tars.com/1.5) ha sido integrada por [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), puedes entender que Agent TARS es nuestra siguiente exploración después de UI-TARS. Actualmente, se encuentra en fase **Beta**, consulta nuestro [último tweet de lanzamiento](https://x.com/_ulivz/status/1938009759413899384) para más detalles.

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

Para más ejemplos, consulta [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

<br>

### Key Features

- 🖱️ **CLI con lanzamiento en un clic** - [Configuración y ejecución rápidas](https://agent-tars.com/guide/basic/cli.html) con mínima configuración
- 🎨 **Agente GUI** - Interacción GUI basada en visión con control preciso
- 🌐 **Integración con navegador** - Controla navegadores usando [DOM](https://agent-tars.com/guide/basic/browser.html#dom) o [visual grounding](https://agent-tars.com/guide/basic/browser.html#visual-grounding)
- 🔄 **Arquitectura de flujo de eventos** - Comunicación en tiempo real entre todos los componentes para interacciones dinámicas
- 🧰 **Herramientas MCP** - [Amplía la funcionalidad](https://agent-tars.com/guide/basic/mcp.html) con servidores mcp
- 🌐 **UI Web basada en protocolos** - [Interfaz interactiva](https://agent-tars.com/guide/basic/web-ui.html) con respuestas en streaming y soporte para modo oscuro
- 🖥️ **Soporte para servidor headless** - [Ejecuta en segundo plano](https://agent-tars.com/guide/advanced/server.html) sin UI para tareas de automatización
- 📦 **Gestión de espacios de trabajo** - [Organiza tu configuración y archivos](https://agent-tars.com/guide/basic/workspace.html) con espacios de trabajo globales
- 🔍 **Herramientas de búsqueda y comandos** - Utilidades integradas para recuperación de información y control del sistema

<br>

### Quick Start

```bash
# Instala globalmente, requiere Node.js >= 22
npm install @agent-tars/cli@latest -g

# Ejecuta con tu proveedor de modelos preferido
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Visita la completa guía [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) para instrucciones detalladas de configuración.

### Resources

- [Documentación](https://agent-tars.com)
- [Blog](https://agent-tars.com/beta) - Conoce la visión de Agent TARS y sus últimas características
- [Documentación CLI](https://agent-tars.com/guide/basic/cli.html) - Domina todas las opciones de línea de comandos
- [Únete a Discord](https://discord.gg/HnKcSBgTVx) - Conecta con nuestra comunidad
- [Sigue Twitter oficial](https://twitter.com/agent_tars) - Mantente actualizado con las últimas noticias
- [Último tweet de lanzamiento](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

Este proyecto es una aplicación de Agente GUI basada en [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) que te permite controlar tu ordenador usando lenguaje natural.

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

- 🤖 Control por lenguaje natural impulsado por modelos Vision-Language
- 🖥️ Soporte para capturas de pantalla y reconocimiento visual
- 🎯 Control preciso de ratón y teclado
- 💻 Soporte multiplataforma (Windows/MacOS/Browser)
- 🔄 Retroalimentación en tiempo real y visualización de estado
- 🔐 Privado y seguro - procesamiento completamente local
- 🛠️ Configuración sencilla y operadores remotos intuitivos

### Quick Start

Ver: [Quick Start](./docs/quick-start.md)

### Documentation

- [Deployment](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md).
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md).

## News

- **\[2025-06-25\]** Lanzamos Agent TARS Beta y Agent TARS CLI - [Introducing Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), un agente de IA multimodal que busca explorar una forma de trabajo más cercana a la realización de tareas humanas mediante ricas capacidades multimodales (como Agente GUI, Visión) e integración perfecta con diversas herramientas del mundo real.
- **\[2025-06-12\]** - 🎁 ¡Nos complace anunciar el lanzamiento de UI-TARS Desktop v0.2.0! Esta actualización introduce dos potentes nuevas características: **Operador de Ordenador Remoto** y **Operador de Navegador Remoto**—ambos completamente gratuitos. Sin configuración necesaria: simplemente haz clic para controlar remotamente cualquier ordenador o navegador, y experimenta un nuevo nivel de comodidad e inteligencia.
- **\[2025-04-17\]** - 🎉 Nos complace anunciar el lanzamiento de la nueva aplicación UI-TARS Desktop v0.1.0, con una interfaz de Agente rediseñada. La aplicación mejora la experiencia de uso del ordenador, introduce nuevas características de operación en navegador, y soporta [el avanzado modelo UI-TARS-1.5](https://seed-tars.com/1.5) para un rendimiento mejorado y control preciso.
- **\[2025-02-20\]** - 📦 Presentamos [UI TARS SDK](./docs/sdk.md), un potente kit de herramientas multiplataforma para construir agentes de automatización GUI.
- **\[2025-01-23\]** - 🚀 Actualizamos la sección de **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** en la versión china: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) con nueva información relacionada con la plataforma ModelScope. Ahora puedes usar la plataforma ModelScope para el despliegue.

## License

Este proyecto está licenciado bajo Apache License 2.0.

## Citation

Si encuentras útiles nuestro paper y código en tu investigación, considera dar una estrella :star: y citar :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
