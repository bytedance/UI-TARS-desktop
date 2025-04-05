<a href="./docs/quick-start.md">
  <img src="./static/hero.png">
</a>

# Agent TARS

<p>
  <a href="https://github.com/bytedance/UI-TARS-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache 2.0-blue.svg?style=flat-square&logo=apache&colorA=564341&colorB=EDED91" alt="license" /></a>
  <a href="https://github.com/bytedance/UI-TARS-desktop/graphs/contributors"><img alt="GitHub contributors" src="https://img.shields.io/github/contributors/bytedance/UI-TARS-desktop?style=flat-square&logo=github&colorA=564341&colorB=EDED91"></a>
</p>

**Agent TARS** is an open-source multimodal AI agent that leverages browser operations by visually interpreting web pages and seamlessly integrating with command lines and file systems.

> [!CAUTION]
> **DISCLAIMER**: Agent TARS is still in **Technical Preview** stage and not stable yet. It's not recommended to use it in production.

> [!TIP]
> **Introduction Blog**: https://agent-tars.com/2025/03/18/announcing-agent-tars-app

## Showcases

<video src="https://github.com/user-attachments/assets/5bfed86f-7201-4fe2-b33b-d93a591c35c8" autoplay loop muted></video>

For more showcases please head: https://agent-tars.com/showcase

## ✨️ Features

- **🌐 Advanced Browser Operations:** Executes sophisticated tasks like Deep Research and Operator functions through an agent framework, enabling comprehensive planning and execution.
- **🛠️ Comprehensive Tool Support:** Integrates with search, file editing, command line, and Model Context Protocol (**MCP**) tools to handle complex workflows.
- **💻️ Enhanced Desktop App:** A revamped UI with displays for browsers, multimodal elements, session management, model configuration, dialogue flow visualization, and browser/search status tracking.
- **🔄 Workflow Orchestration:** Seamlessly connects GUI Agent tools—search, browse, explore links, and synthesize information into final outputs.
- **⚙️ Developer-Friendly Framework:** Simplifies integration with UI-TARS and custom workflow creation for GUI Agent projects.

## Install

You can download the [latest release](https://github.com/bytedance/UI-TARS-desktop/releases/latest) version of Agent TARS from our releases page.

> **Note**: If you have [Homebrew](https://brew.sh/) installed, you can install UI-TARS Desktop by running the following command:
> ```bash
> brew install --cask agent-tars
> ```

## Getting Started

See [Quick Start](https://agent-tars.com/doc/quick-start).

## Contributing

Please read the [contributing guide](../../CONTRIBUTING.md) and let's build Agent TARS together.

## Code of conduct

This repo has adopted the ByteDance Open Source Code of Conduct. Please check [Code of conduct](../../CODE_OF_CONDUCT.md) for more details.

## Roadmap

**Agent TARS** is more than a tool —— it’s a platform for the future of multimodal agents. Upcoming enhancements include:

- Ongoing optimization of agent framework —— GUI Agent synergy with expanded model compatibility.
- Expansion to mobile device operations with cross-platform framework.
- Integration with game environments for AI-driven gameplay.


## Credits

Thanks to:

- The [browser-use](https://github.com/browser-use/browser-use) project whose work inspired us to better operate browsers
- [@alexchenzl](https://github.com/alexchenzl) for developing the innovative [nanobrowser](https://github.com/nanobrowser/nanobrowser) Chrome extension, which provided valuable technical references during our browser control in Electron
- [@EGOIST](https://github.com/egoist) for creating the remarkable AI chatbot [ChatWise](https://chatwise.app/), from which we drew significant inspiration for local browser detection and local browser search.
- [Anthropic](https://www.anthropic.com/) for building the [Model Context Protocol](https://docs.anthropic.com/en/docs/agents-and-tools/mcp) to help us better manage local tools
- [puppeteer](https://github.com/puppeteer/puppeteer) team for their excellent browser automation toolkit that greatly enhanced our workflow
- [Web Infra](https://github.com/web-infra-dev) team and the [Rslib](https://github.com/web-infra-dev/rslib) project helps us build our libraries better.
- The UI-TARS and UI-TARS-desktop development teams for laying crucial foundational frameworks
- All contributors and members of the open-source community who supported this journey with their expertise and encouragement


## License

Agent TARS is [Apache License 2.0 licensed](https://github.com/bytedance/UI-TARS-desktop/blob/main/LICENSE).

