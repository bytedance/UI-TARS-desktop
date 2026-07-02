<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Einleitung

[English](./README.md) | [简体中文](./README.zh-CN.md) | Deutsch

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

<b>TARS<sup>\*</sup></b> ist ein multimodaler KI-Agent-Stack und liefert aktuell zwei Projekte aus: [Agent TARS](#agent-tars) und [UI-TARS-desktop](#ui-tars-desktop):

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
        <b>Agent TARS</b> ist ein universeller multimodaler KI-Agent-Stack. Er bringt die Stärken von GUI-Agent und Vision in dein Terminal, deinen Computer, deinen Browser und dein Produkt.
        <br>
        <br>
        Ausgeliefert wird er primär als <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> und <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web-UI</a>.
        Ziel ist ein Workflow, der dank moderner multimodaler LLMs und nahtloser Anbindung an reale <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a>-Tools näher an menschliche Aufgaben-Erledigung heranreicht.
      </td>
      <td align="left">
        <b>UI-TARS Desktop</b> ist eine Desktop-Anwendung, die einen nativen GUI-Agenten auf Basis des <a href="https://github.com/bytedance/UI-TARS" target="_blank">UI-TARS</a>-Modells bereitstellt.
        <br>
        <br>
        Sie liefert
        <a href="https://github.com/bytedance/UI-TARS-desktop/blob/main/docs/quick-start.md#get-model-and-run-local-operator" target="_blank">lokale</a> und
        <a href="https://github.com/bytedance/UI-TARS-desktop/blob/main/docs/quick-start.md#run-remote-operator" target="_blank">Remote</a>-Operator-Modi für Computer und Browser.
      </td>
    </tr>
  </tbody>
</table>

## Inhaltsverzeichnis

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [News](#news)
- [Agent TARS](#agent-tars)
  - [Showcase](#showcase)
  - [Kernfunktionen](#kernfunktionen)
  - [Schnellstart](#schnellstart)
  - [Dokumentation](#dokumentation)
- [UI-TARS Desktop](#ui-tars-desktop)
  - [Showcase](#showcase-1)
  - [Funktionen](#funktionen)
  - [Schnellstart](#schnellstart-1)
- [Mitwirken](#mitwirken)
- [Lizenz](#lizenz)
- [Zitation](#zitation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## News

- **\[2025-11-05\]** 🎉 Wir freuen uns, das Release von [Agent TARS CLI v0.3.0](https://github.com/bytedance/UI-TARS-desktop/releases/tag/v0.3.0) anzukündigen! Diese Version bringt Streaming-Support für mehrere Tools (Shell-Befehle, mehrdateien-strukturierte Anzeige), Laufzeit-Einstellungen mit Zeitstatistiken für Tool-Aufrufe und Deep Thinking sowie einen Event-Stream-Viewer für Datenflusstracking und Debugging. Zusätzlich gibt es exklusiven Support für die [AIO Agent Sandbox](https://github.com/agent-infra/sandbox) als isolierte All-in-One-Tool-Ausführungsumgebung.
- **\[2025-06-25\]** Wir haben Agent TARS Beta und Agent TARS CLI veröffentlicht — [Introducing Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html), ein multimodaler KI-Agent, der eine Arbeitsweise erkundet, die menschlicher Aufgaben-Erledigung näher kommt — durch breite multimodale Fähigkeiten (z. B. GUI Agent, Vision) und nahtlose Anbindung an reale Tools.
- **\[2025-06-12\]** - 🎁 Wir freuen uns, UI-TARS Desktop v0.2.0 vorzustellen! Dieses Update bringt zwei mächtige neue Features: **Remote Computer Operator** und **Remote Browser Operator** — beide komplett kostenlos. Ohne Konfiguration: einfach klicken, um jeden Computer oder Browser fernzusteuern und ein neues Maß an Komfort und Intelligenz zu erleben.
- **\[2025-04-17\]** - 🎉 Wir freuen uns, das Release der neuen UI-TARS-Desktop-Anwendung v0.1.0 mit überarbeiteter Agent-UI anzukündigen. Die Anwendung verbessert das Computer-Nutzungserlebnis, führt neue Browser-Operationen ein und unterstützt das [erweiterte UI-TARS-1.5-Modell](https://seed-tars.com/1.5) für bessere Performance und präzise Steuerung.
- **\[2025-02-20\]** - 📦 Vorstellung des [UI TARS SDK](./docs/sdk.md), eines plattformübergreifenden Toolkits zum Bau von GUI-Automatisierungs-Agenten.
- **\[2025-01-23\]** - 🚀 Wir haben den **[Cloud Deployment](./docs/deployment.md#cloud-deployment)**-Abschnitt in der 中文版-Doku aktualisiert: [GUI-Modell-Deployment-Tutorial](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) — mit neuen Informationen zur ModelScope-Plattform. Du kannst die ModelScope-Plattform jetzt fürs Deployment nutzen.

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

<b>Agent TARS</b> ist ein universeller multimodaler KI-Agent-Stack. Er bringt die Stärken von GUI-Agent und Vision in dein Terminal, deinen Computer, deinen Browser und dein Produkt. <br> <br>
Ausgeliefert wird er primär als <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> und <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web-UI</a>.
Ziel ist ein Workflow, der dank moderner multimodaler LLMs und nahtloser Anbindung an reale <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a>-Tools näher an menschliche Aufgaben-Erledigung heranreicht.

### Showcase

```
Bitte buche mir den frühesten Flug von San Jose nach New York am 1. September und den letzten Rückflug am 6. September auf Priceline
```

https://github.com/user-attachments/assets/772b0eef-aef7-4ab9-8cb0-9611820539d8

<br>

<table>
  <thead>
    <tr>
      <th width="50%" align="center">Hotelbuchung</th>
      <th width="50%" align="center">Diagramm mit zusätzlichen MCP-Servern erzeugen</th>
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
        <b>Anweisung:</b> <i>Ich bin vom 1. bis 6. September in Los Angeles, Budget 5.000 USD. Buche mir bitte auf booking.com ein Ritz-Carlton-Hotel möglichst nah am Flughafen und stell mir einen Transport-Guide zusammen</i>
      </td>
      <td align="left">
        <b>Anweisung:</b> <i>Zeichne mir ein Diagramm des Wetters in Hangzhou über einen Monat</i>
      </td>
    </tr>
  </tbody>
</table>

Weitere Anwendungsfälle in [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

### Kernfunktionen

- 🖱️ **Out-of-the-box-CLI mit einem Klick** — unterstützt sowohl **headful** [Web-UI](https://agent-tars.com/guide/basic/web-ui.html) als auch **headless** [Server-](https://agent-tars.com/guide/advanced/server.html)[Ausführung](https://agent-tars.com/guide/basic/cli.html).
- 🌐 **Hybrid-Browser-Agent** — steuere den Browser per [GUI Agent](https://agent-tars.com/guide/basic/browser.html#visual-grounding), [DOM](https://agent-tars.com/guide/basic/browser.html#dom) oder einer hybriden Strategie.
- 🔄 **Event Stream** — ein protokoll-getriebener Event Stream treibt [Context Engineering](https://agent-tars.com/beta#context-engineering) und die [Agent-UI](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html#easy-to-build-applications) an.
- 🧰 **MCP-Integration** — der Kern basiert auf MCP und kann zusätzlich [MCP-Server](https://agent-tars.com/guide/basic/mcp.html) einbinden, um echte Tools anzubinden.

### Schnellstart

<img alt="Agent TARS CLI" src="https://agent-tars.com/agent-tars-cli.png">

```bash
# Mit `npx` starten
npx @agent-tars/cli@latest

# Global installieren, benötigt Node.js >= 22
npm install @agent-tars/cli@latest -g

# Mit dem bevorzugten Model-Provider starten
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Im ausführlichen [Quick-Start-Guide](https://agent-tars.com/guide/get-started/quick-start.html) findest du detaillierte Setup-Anweisungen.

### Dokumentation

> 🌟 **Erkunde das Agent-TARS-Universum** 🌟

<table>
  <thead>
    <tr>
      <th width="20%" align="center">Kategorie</th>
      <th width="30%" align="center">Ressource</th>
      <th width="50%" align="left">Beschreibung</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">🏠 <strong>Zentrales Hub</strong></td>
      <td align="center">
        <a href="https://agent-tars.com">
          <img src="https://img.shields.io/badge/Visit-Website-4F46E5?style=for-the-badge&logo=globe&logoColor=white" alt="Website" />
        </a>
      </td>
      <td align="left">Dein Tor ins Agent-TARS-Ökosystem</td>
    </tr>
      <tr>
      <td align="center">📚 <strong>Schnellstart</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/guide/get-started/quick-start.html">
          <img src="https://img.shields.io/badge/Get-Started-06B6D4?style=for-the-badge&logo=rocket&logoColor=white" alt="Quick Start" />
        </a>
      </td>
      <td align="left">In 5 Minuten von Null auf Held</td>
    </tr>
    <tr>
      <td align="center">🚀 <strong>Was ist neu</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/beta">
          <img src="https://img.shields.io/badge/Read-Blog-F59E0B?style=for-the-badge&logo=rss&logoColor=white" alt="Blog" />
        </a>
      </td>
      <td align="left">Frische Features & Vision entdecken</td>
    </tr>
    <tr>
      <td align="center">🛠️ <strong>Entwickler-Zone</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/guide/get-started/introduction.html">
          <img src="https://img.shields.io/badge/View-Docs-10B981?style=for-the-badge&logo=gitbook&logoColor=white" alt="Docs" />
        </a>
      </td>
      <td align="left">Jeden Befehl und jedes Feature meistern</td>
    </tr>
    <tr>
      <td align="center">🎯 <strong>Showcase</strong></td>
      <td align="center">
        <a href="https://github.com/bytedance/UI-TARS-desktop/issues/842">
          <img src="https://img.shields.io/badge/View-Examples-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Examples" />
        </a>
      </td>
      <td align="left">Anwendungsfälle aus dem offiziellen Team und der Community</td>
    </tr>
    <tr>
      <td align="center">🔧 <strong>Referenz</strong></td>
      <td align="center">
        <a href="https://agent-tars.com/api/">
          <img src="https://img.shields.io/badge/API-Reference-EF4444?style=for-the-badge&logo=book&logoColor=white" alt="API" />
        </a>
      </td>
      <td align="left">Vollständige technische Referenz</td>
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

UI-TARS Desktop ist ein nativer GUI-Agent für deinen lokalen Computer, angetrieben von [UI-TARS](https://github.com/bytedance/UI-TARS) sowie den Modellen der Reihen Seed-1.5-VL/1.6.

<div align="center">
<p>
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">Paper</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/ByteDance-Seed/UI-TARS-1.5-7B">Hugging-Face-Modelle</a>&nbsp&nbsp
        | &nbsp&nbsp🫨 <a href="https://discord.gg/pTXwYVjfcs">Discord</a>&nbsp&nbsp
        | &nbsp&nbsp🤖 <a href="https://www.modelscope.cn/collections/UI-TARS-bccb56fa1ef640">ModelScope</a>&nbsp&nbsp
<br>
🖥️ Desktop-Anwendung &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene (Browser-Nutzung)</a> &nbsp&nbsp
</p>

</div>

### Showcase

<!-- // FIXME: Choose only two demo, one local computer and one remote computer showcase. -->

|                                                          Anweisung                                                           |                                                Local Operator                                                |                                               Remote Operator                                                |
| :----------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| Bitte aktiviere in den VS-Code-Einstellungen das Auto-Save-Feature und verzögere AutoSave-Aktionen um 500 Millisekunden. | <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" /> | <video src="https://github.com/user-attachments/assets/01e49b69-7070-46c8-b3e3-2aaaaec71800" height="300" /> |
|                    Könntest du das neueste offene Issue im UI-TARS-Desktop-Projekt auf GitHub für mich prüfen?                     | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" /> | <video src="https://github.com/user-attachments/assets/072fb72d-7394-4bfa-95f5-4736e29f7e58" height="300" /> |

### Funktionen

- 🤖 Steuerung in natürlicher Sprache, getrieben von einem Vision-Language-Modell
- 🖥️ Screenshot- und visuelle Erkennung
- 🎯 Präzise Maus- und Tastatursteuerung
- 💻 Plattformübergreifend (Windows/macOS/Browser)
- 🔄 Echtzeit-Feedback und Statusanzeige
- 🔐 Privat und sicher — vollständig lokale Verarbeitung

### Schnellstart

Siehe [Schnellstart](./docs/quick-start.md)

## Mitwirken

Siehe [CONTRIBUTING.md](./CONTRIBUTING.md).

## Lizenz

Dieses Projekt steht unter der Apache License 2.0.

## Zitation

Wenn unser Paper und Code für deine Forschung nützlich sind, freuen wir uns über einen Star :star: und eine Zitation :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
