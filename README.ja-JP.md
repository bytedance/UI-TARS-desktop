<!-- README.ja-JP.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | [简体中文](./README.zh-CN.md) | 日本語 | [한국어](./README.ko-KR.md) |  [Español](./README.es-ES.md) | [العربية](./README.ar-SA.md) | [Français](./README.fr-FR.md) | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> はマルチモーダルAI Agentスタックであり、GUI AgentとVisionの力をターミナル、コンピュータ、ブラウザ、製品に提供します。現在、[Agent TARS](#agent-tars)と[UI-TARS-desktop](#ui-tars-desktop)の2つのプロジェクトをリリースしています。


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

Agent TARSは、さまざまな実世界のツールとシームレスに統合するオープンソースのマルチモーダルAI Agentです。強力な[Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL)の機能を基に構築され、マルチモーダル推論と視覚ベースの対話をターミナル、ブラウザ、コンピュータ、製品に直接提供します。

> [!IMPORTANT]  
> [UI-TARS-1.5](https://seed-tars.com/1.5)の能力が[Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL)に統合されたため、Agent TARSはUI-TARSの次の探求と理解することができます。現在、**Beta**段階にあり、詳細については[最新リリースのツイート](https://x.com/_ulivz/status/1938009759413899384)をご確認ください。


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


さらなるデモについては、[#842](https://github.com/bytedance/UI-TARS-desktop/issues/842)をご覧ください。

<br>

### Key Features

- 🖱️ **ワンクリック起動CLI** - 最小限の設定で[素早いセットアップと実行](https://agent-tars.com/guide/basic/cli.html)
- 🎨 **GUI Agent** - 視覚ベースのGUI操作で正確な制御
- 🌐 **ブラウザ統合** - [DOM](https://agent-tars.com/guide/basic/browser.html#dom)や[視覚的認識](https://agent-tars.com/guide/basic/browser.html#visual-grounding)を使用したブラウザ制御
- 🔄 **イベントストリームアーキテクチャ** - 動的な対話のためのすべてのコンポーネント間のリアルタイム通信
- 🧰 **MCPツール** - mcpサーバーで[機能を拡張](https://agent-tars.com/guide/basic/mcp.html)
- 🌐 **プロトコルベースのWeb UI** - ストリーミングレスポンスとダークモードをサポートする[インタラクティブインターフェース](https://agent-tars.com/guide/basic/web-ui.html)
- 🖥️ **ヘッドレスサーバーサポート** - 自動化タスク用にUIなしで[バックグラウンドで実行](https://agent-tars.com/guide/advanced/server.html)
- 📦 **ワークスペース管理** - グローバルワークスペースで[設定とファイルを整理](https://agent-tars.com/guide/basic/workspace.html)
- 🔍 **検索＆コマンドツール** - 情報検索とシステム制御用の組み込みユーティリティ

<br>

### Quick Start

```bash
# グローバルにインストール、Node.js >= 22が必要
npm install @agent-tars/cli@latest -g

# 好みのモデルプロバイダーで実行
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

詳細なセットアップ手順については、包括的な[クイックスタート](https://agent-tars.com/guide/get-started/quick-start.html)ガイドをご覧ください。


### Resources

- [ドキュメント](https://agent-tars.com)
- [ブログ](https://agent-tars.com/beta) - Agent TARSのビジョンと最新機能について学ぶ
- [CLIドキュメント](https://agent-tars.com/guide/basic/cli.html) - すべてのコマンドラインオプションをマスター
- [Discordに参加](https://discord.gg/HnKcSBgTVx) - コミュニティに接続
- [公式Twitterをフォロー](https://twitter.com/agent_tars) - 最新ニュースを入手
- [最新リリースのツイート](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

このプロジェクトは、[UI-TARS（Vision-Language Model）](https://github.com/bytedance/UI-TARS)に基づくGUI Agentアプリケーションで、自然言語を使用してコンピュータを制御することができます。

<div align="center">
<p>
        &nbsp&nbsp 📑 <a href="https://arxiv.org/abs/2501.12326">論文</a> &nbsp&nbsp
        | 🤗 <a href="https://huggingface.co/ByteDance-Seed/UI-TARS-1.5-7B">Hugging Faceモデル</a>&nbsp&nbsp
        | &nbsp&nbsp🫨 <a href="https://discord.gg/pTXwYVjfcs">Discord</a>&nbsp&nbsp
        | &nbsp&nbsp🤖 <a href="https://www.modelscope.cn/collections/UI-TARS-bccb56fa1ef640">ModelScope</a>&nbsp&nbsp
<br>
🖥️ デスクトップアプリケーション &nbsp&nbsp
| &nbsp&nbsp 👓 <a href="https://github.com/web-infra-dev/midscene">Midscene（ブラウザで使用）</a> &nbsp&nbsp
| &nbsp&nbsp <a href="https://deepwiki.com/bytedance/UI-TARS-desktop">
    <img alt="Ask DeepWiki.com" src="https://devin.ai/assets/deepwiki-badge.png" style="height: 18px; vertical-align: middle;">
  </a>
</p>

</div>

### Showcase

|                                                          指示                                                           |                                                ローカルオペレーター                                                |                                                リモートオペレーター                                                |
| :----------------------------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------: |
| VS Codeの自動保存機能を有効にして、自動保存操作を500ミリ秒遅延させるように設定してください。 | <video src="https://github.com/user-attachments/assets/e0914ce9-ad33-494b-bdec-0c25c1b01a27" height="300" /> | <video src="https://github.com/user-attachments/assets/01e49b69-7070-46c8-b3e3-2aaaaec71800" height="300" /> |
|                    UI-TARS-DesktopプロジェクトのGitHub上の最新のオープンissueを確認してもらえますか？                     | <video src="https://github.com/user-attachments/assets/3d159f54-d24a-4268-96c0-e149607e9199" height="300" /> | <video src="https://github.com/user-attachments/assets/072fb72d-7394-4bfa-95f5-4736e29f7e58" height="300" /> |

### Features

- 🤖 Vision-Language Modelによる自然言語制御
- 🖥️ スクリーンショットと視覚認識のサポート
- 🎯 正確なマウスとキーボードの制御
- 💻 クロスプラットフォーム対応（Windows/MacOS/Browser）
- 🔄 リアルタイムフィードバックとステータス表示
- 🔐 プライベートで安全 - 完全ローカル処理
- 🛠️ 簡単なセットアップと直感的なリモートオペレーター

### Quick Start

参照: [クイックスタート](./docs/quick-start.md)

### Documentation

- [デプロイメント](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md)
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## News

- **\[2025-06-25\]** Agent TARS BetaとAgent TARS CLIをリリースしました - [Agent TARS Betaの紹介](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html)。これは、豊富なマルチモーダル機能（GUIエージェント、ビジョンなど）とさまざまな実世界のツールとのシームレスな統合を通じて、より人間に近いタスク完了の作業形態を探求することを目的としたマルチモーダルAI Agentです。
- **\[2025-06-12\]** - 🎁 UI-TARS Desktop v0.2.0のリリースを発表できることを嬉しく思います！この更新では、2つの強力な新機能が導入されました：**リモートコンピュータオペレーター**と**リモートブラウザオペレーター**—どちらも完全に無料です。設定不要：クリックするだけで任意のコンピュータやブラウザをリモート制御し、新しいレベルの利便性と知性を体験できます。
- **\[2025-04-17\]** - 🎉 新しいUI-TARS Desktopアプリケーションv0.1.0のリリースを発表できることを嬉しく思います。リデザインされたAgent UIを特徴とし、コンピュータの使用体験を向上させ、新しいブラウザ操作機能を導入し、パフォーマンスの向上と正確な制御のための[高度なUI-TARS-1.5モデル](https://seed-tars.com/1.5)をサポートしています。
- **\[2025-02-20\]** - 📦 [UI TARS SDK](./docs/sdk.md)を導入しました。これはGUI自動化エージェントを構築するための強力なクロスプラットフォームツールキットです。
- **\[2025-01-23\]** - 🚀 **[クラウドデプロイメント](./docs/deployment.md#cloud-deployment)**セクションを中国語版：[GUIモデルデプロイメントチュートリアル](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb)でModelScopeプラットフォームに関連する新情報で更新しました。ModelScopeプラットフォームをデプロイメントに使用できるようになりました。

## License

このプロジェクトはApache License 2.0の下でライセンスされています。

## Citation

私たちの論文とコードが研究に役立つと思われる場合は、スター :star: と引用 :pencil: をご検討ください。

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
