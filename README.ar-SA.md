<!-- README.ar-SA.md -->
<picture>
  <img alt="Agent TARS Banner" src="./images/tars.png">
</picture>

<br/>

## Intorduction

[![](https://trendshift.io/api/badge/repositories/13584)](https://trendshift.io/repositories/13584)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja-JP.md) | [한국어](./README.ko-KR.md) |  [Español](./README.es-ES.md) | العربية | [Français](./README.fr-FR.md) | [Português](./README.pt-BR.md) | [Русский](./README.ru-RU.md)

<b>TARS<sup>\*</sup></b> هو مجموعة متعددة الوسائط للعميل الذكي، تجلب قوة GUI Agent والرؤية إلى terminal الخاص بك، وجهاز الكمبيوتر والمتصفح والمنتج. حاليًا، أطلقنا مشروعين: [Agent TARS](#agent-tars) و [UI-TARS-desktop](#ui-tars-desktop).


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

Agent TARS هو عميل ذكي مفتوح المصدر متعدد الوسائط يوفر تكاملًا سلسًا مع مختلف الأدوات في العالم الحقيقي. تم بناؤه على القدرات القوية لـ [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL)، ويجلب الاستدلال متعدد الوسائط والتفاعل المعتمد على الرؤية مباشرة إلى terminal والمتصفح والكمبيوتر والمنتج الخاص بك.

> [!IMPORTANT]  
> بما أن قدرة [UI-TARS-1.5](https://seed-tars.com/1.5) قد تم دمجها بواسطة [Seed-1.5-VL](https://github.com/ByteDance-Seed/Seed1.5-VL)، يمكنك فهم أن Agent TARS هو استكشافنا التالي بعد UI-TARS. حاليًا، هو في مرحلة **Beta**، تحقق من [آخر تغريدة إصدار](https://x.com/_ulivz/status/1938009759413899384) للتفاصيل.


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


لمزيد من العروض، يرجى التحقق من [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

<br>

### Key Features

- 🖱️ **CLI with One-Click Launch** - [إعداد وتنفيذ سريع](https://agent-tars.com/guide/basic/cli.html) مع الحد الأدنى من التكوين
- 🎨 **GUI Agent** - تفاعل GUI مبني على الرؤية مع تحكم دقيق
- 🌐 **Browser Integration** - تحكم في المتصفحات باستخدام [DOM](https://agent-tars.com/guide/basic/browser.html#dom) أو [visual grounding](https://agent-tars.com/guide/basic/browser.html#visual-grounding)
- 🔄 **Event Stream Architecture** - اتصال في الوقت الفعلي بين جميع المكونات للتفاعلات الديناميكية
- 🧰 **MCP Tools** - [توسيع الوظائف](https://agent-tars.com/guide/basic/mcp.html) مع خوادم mcp
- 🌐 **Protocol-Based Web UI** - [واجهة تفاعلية](https://agent-tars.com/guide/basic/web-ui.html) مع استجابات متدفقة ودعم الوضع الداكن
- 🖥️ **Headless Server Support** - [تشغيل في الخلفية](https://agent-tars.com/guide/advanced/server.html) بدون واجهة مستخدم لمهام الأتمتة
- 📦 **Workspace Management** - [تنظيم التكوين والملفات](https://agent-tars.com/guide/basic/workspace.html) باستخدام مساحات عمل عالمية
- 🔍 **Search & Command Tools** - أدوات مدمجة لاسترجاع المعلومات والتحكم في النظام

<br>

### Quick Start

```bash
# تثبيت عالمي، يتطلب Node.js >= 22
npm install @agent-tars/cli@latest -g

# تشغيل مع مزود النموذج المفضل لديك
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

قم بزيارة دليل [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) الشامل للحصول على تعليمات الإعداد التفصيلية.


### Documentation

- [Documentation](https://agent-tars.com)
- [Blog](https://agent-tars.com/beta) - تعرف على رؤية Agent TARS وأحدث الميزات
- [CLI Documentation](https://agent-tars.com/guide/basic/cli.html) - أتقن جميع خيارات سطر الأوامر
- [Join Discord](https://discord.gg/HnKcSBgTVx) - تواصل مع مجتمعنا
- [Follow Official Twitter](https://twitter.com/agent_tars) - ابق على اطلاع بأحدث الأخبار
- [Latest release twitter](https://x.com/_ulivz/status/1938009759413899384)

<br/>

## UI-TARS Desktop

<p align="center">
  <img alt="UI-TARS" width="260" src="./apps/ui-tars/resources/icon.png">
</p>

هذا المشروع هو تطبيق GUI Agent مبني على [UI-TARS (Vision-Language Model)](https://github.com/bytedance/UI-TARS) يسمح لك بالتحكم في جهاز الكمبيوتر الخاص بك باستخدام اللغة الطبيعية.

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

- 🤖 تحكم باللغة الطبيعية مدعوم بنموذج Vision-Language
- 🖥️ دعم لقطات الشاشة والتعرف البصري
- 🎯 تحكم دقيق بالماوس ولوحة المفاتيح
- 💻 دعم متعدد المنصات (Windows/MacOS/Browser)
- 🔄 تغذية راجعة في الوقت الفعلي وعرض الحالة
- 🔐 خاص وآمن - معالجة محلية بالكامل
- 🛠️ إعداد سهل ومشغلات بعيدة بديهية

### Quick Start

انظر: [Quick Start](./docs/quick-start.md)

### Documentation

- [Deployment](https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md).
- [@ui-tars/sdk](./docs/sdk.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md).

## News

- **\[2025-06-25\]** أطلقنا Agent TARS Beta و Agent TARS CLI - [تقديم Agent TARS Beta](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html)، وهو عميل ذكي متعدد الوسائط يهدف إلى استكشاف شكل عمل أقرب إلى إكمال المهام البشرية من خلال قدرات غنية متعددة الوسائط (مثل GUI Agent، Vision) وتكامل سلس مع مختلف الأدوات في العالم الحقيقي.
- **\[2025-06-12\]** - 🎁 يسعدنا أن نعلن عن إصدار UI-TARS Desktop v0.2.0! يقدم هذا التحديث ميزتين قويتين جديدتين: **Remote Computer Operator** و **Remote Browser Operator** - كلاهما مجاني تمامًا. لا يلزم أي تكوين: ببساطة انقر للتحكم عن بُعد في أي جهاز كمبيوتر أو متصفح، واختبر مستوى جديد من الراحة والذكاء.
- **\[2025-04-17\]** - 🎉 يسعدنا أن نعلن عن إصدار تطبيق UI-TARS Desktop الجديد v0.1.0، مع واجهة Agent معاد تصميمها. يعزز التطبيق تجربة استخدام الكمبيوتر، ويقدم ميزات تشغيل متصفح جديدة، ويدعم [نموذج UI-TARS-1.5 المتقدم](https://seed-tars.com/1.5) لأداء محسن وتحكم دقيق.
- **\[2025-02-20\]** - 📦 تم تقديم [UI TARS SDK](./docs/sdk.md)، وهو مجموعة أدوات قوية متعددة المنصات لبناء عملاء أتمتة GUI.
- **\[2025-01-23\]** - 🚀 قمنا بتحديث قسم **[Cloud Deployment](./docs/deployment.md#cloud-deployment)** في النسخة الصينية: [GUI模型部署教程](https://bytedance.sg.larkoffice.com/docx/TCcudYwyIox5vyxiSDLlgIsTgWf#U94rdCxzBoJMLex38NPlHL21gNb) بمعلومات جديدة تتعلق بمنصة ModelScope. يمكنك الآن استخدام منصة ModelScope للنشر.

## License

هذا المشروع مرخص تحت رخصة Apache License 2.0.

## Citation

إذا وجدت ورقتنا البحثية وكودنا مفيدًا في أبحاثك، فيرجى التفكير في إعطاء نجمة :star: واقتباس :pencil:

```BibTeX
@article{qin2025ui,
  title={UI-TARS: Pioneering Automated GUI Interaction with Native Agents},
  author={Qin, Yujia and Ye, Yining and Fang, Junjie and Wang, Haoming and Liang, Shihao and Tian, Shizuo and Zhang, Junda and Li, Jiahao and Li, Yunxin and Huang, Shijue and others},
  journal={arXiv preprint arXiv:2501.12326},
  year={2025}
}
```
