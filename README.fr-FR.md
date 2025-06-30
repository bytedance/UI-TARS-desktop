<!-- README.fr-FR.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md) | [한국어](./README.ko-KR.md) |  [Español](./README.es-ES.md) | [العربية](./README.ar-SA.md) | Français | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> est une pile d'Agent IA Multimodal, qui apporte la puissance de GUI Agent et de Vision dans votre terminal, ordinateur, navigateur et produit. Actuellement, nous avons lancé deux projets : [Agent TARS](#agent-tars) et [UI-TARS-desktop](#ui-tars-desktop).


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

Agent TARS est un agent IA multimodal open-source offrant une intégration transparente avec divers outils du monde réel. Construit sur les puissantes capacités de [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), il apporte le raisonnement multimodal et l'interaction basée sur la vision directement à ton terminal, navigateur, ordinateur et produit.

> [!IMPORTANT]  
> Depuis que les capacités de [UI-TARS-1.5](https://seed-tars.com/1.5) ont été intégrées par [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL), tu peux comprendre qu'Agent TARS est notre prochaine exploration après UI-TARS. Actuellement, il est en phase **Beta**, consulte notre [dernier tweet de sortie](https://x.com/_ulivz/status/1938009759413899384) pour plus de détails.


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


Pour plus de démonstrations, consulte [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

<br>

### Key Features

- 🖱️ **CLI with One-Click Launch** - [Configuration et exécution rapides](https://agent-tars.com/guide/basic/cli.html) avec une configuration minimale
- 🎨 **GUI Agent** - Interaction GUI basée sur la vision avec un contrôle précis
- 🌐 **Browser Integration** - Contrôle des navigateurs en utilisant [DOM](https://agent-tars.com/guide/basic/browser.html#dom) ou [visual grounding](https://agent-tars.com/guide/basic/browser.html#visual-grounding)
- 🔄 **Event Stream Architecture** - Communication en temps réel entre tous les composants pour des interactions dynamiques
- 🧰 **MCP Tools** - [Extension des fonctionnalités](https://agent-tars.com/guide/basic/mcp.html) avec des serveurs mcp
- 🌐 **Protocol-Based Web UI** - [Interface interactive](https://agent-tars.com/guide/basic/web-ui.html) avec réponses en streaming et support du mode sombre
- 🖥️ **Headless Server Support** - [Exécution en arrière-plan](https://agent-tars.com/guide/advanced/server.html) sans UI pour les tâches d'automatisation
- 📦 **Workspace Management** - [Organisation de ta configuration et tes fichiers](https://agent-tars.com/guide/basic/workspace.html) avec des espaces de travail globaux
- 🔍 **Search & Command Tools** - Outils intégrés pour la récupération d'informations et le contrôle du système

<br>

### Quick Start

```bash
# Installation globale, nécessite Node.js >= 22
npm install @agent-tars/cli@latest -g

# Exécution avec ton fournisseur de modèle préféré
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Consulte le guide complet [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) pour des instructions détaillées de configuration.


### Documentation

- [Documentation](https://agent-tars.com)
- [Blog](https://agent-tars.com/beta) - Découvre la vision d'Agent TARS et ses dernières fonctionnalités
- [CLI Documentation](https://agent-tars.com/guide/basic/cli.html) - Maîtrise toutes les options de ligne de commande
- [Join Discord](https://discord.gg/HnKcSBgTVx) - Connecte-toi avec notre communauté
- [Follow Official Twitter](https://twitter.com/agent_tars) - Reste informé des dernières nouvelles
- [Latest release twitter](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

Ce projet est une application GUI Agent basée sur [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) qui te permet de contrôler ton ordinateur en utilisant le langage naturel.

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

- 🤖 Contrôle en langage naturel alimenté par le modèle Vision-Language
- 🖥️ Support de capture d'écran et reconnaissance visuelle
- 🎯 Contrôle précis de la souris et du clavier
- 💻 Support multiplateforme (Windows/MacOS/Browser)
- 🔄 Retour en temps réel et affichage d'état
- 🔐 Privé et sécurisé - traitement entièrement local
- 🛠️ Configuration sans effort et opérateurs distants intuitifs

### Quick Start

Voir: [Quick Start](./docs/quick-start.md)

### Documentation

- [Deployment](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md).
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md).

## News

- **\[2025-06-25\]** Nous avons lancé Agent TARS Beta et Agent TARS CLI - [Introduction à Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), un agent IA multimodal qui vise à explorer une forme de travail plus proche de la réalisation de tâches humaines grâce à de riches capacités multimodales (comme GUI Agent, Vision) et une intégration transparente avec divers outils du monde réel.
- **\[2025-06-12\]** - 🎁 Nous sommes ravis d'annoncer la sortie d'UI-TARS Desktop v0.2.0 ! Cette mise à jour introduit deux nouvelles fonctionnalités puissantes : **Remote Computer Operator** et **Remote Browser Operator** — toutes deux entièrement gratuites. Aucune configuration requise : clique simplement pour contrôler à distance n'importe quel ordinateur ou navigateur, et expérimente un nouveau niveau de commodité et d'intelligence.
- **\[2025-04-17\]** - 🎉 Nous sommes ravis d'annoncer la sortie de la nouvelle application UI-TARS Desktop v0.1.0, avec une interface Agent redessinée. L'application améliore l'expérience d'utilisation de l'ordinateur, introduit de nouvelles fonctionnalités d'opération de navigateur, et prend en charge [le modèle avancé UI-TARS-1.5](https://seed-tars.com/1.5) pour des performances améliorées et un contrôle précis.
- **\[2025-02-20\]** - 📦 Introduction du [UI TARS SDK](./docs/sdk.md), un puissant toolkit multiplateforme pour construire des agents d'automatisation GUI.
- **\[2025-01-23\]** - 🚀 Nous avons mis à jour la section **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** dans la version chinoise: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) avec de nouvelles informations relatives à la plateforme ModelScope. Tu peux maintenant utiliser la plateforme ModelScope pour le déploiement.

## License

Ce projet est sous licence Apache License 2.0.

## Citation

Si tu trouves notre article et notre code utiles dans ta recherche, n'hésite pas à donner une étoile :star: et à citer :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
