<a href="./docs/quick-start.md">
  <img src="./static/hero.png">
</a>

# Agent TARS

<p>
  <a href="https://github.com/bytedance/UI-TARS-desktop/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache 2.0-blue.svg?style=flat-square&logo=apache&colorA=564341&colorB=EDED91" alt="license" /></a>
  <a href="https://github.com/bytedance/UI-TARS-desktop/graphs/contributors"><img alt="GitHub contributors" src="https://img.shields.io/github/contributors/bytedance/UI-TARS-desktop?style=flat-square&logo=github&colorA=564341&colorB=EDED91"></a>
</p>


<video src="https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/docs/agent-cli-launch.mp4" playsinline=""></video>

### Node.js

Agent TARS CLI requires [Node.js](https://nodejs.org/) as the runtime, you will need to install Node.js >= version 22, it is recommended to use the Node.js LTS version.

Check the current Node.js version with the following command:

`node -v`

If you do not have Node.js installed in current environment, or the installed version is too low, you can use [nvm](https://github.com/nvm-sh/nvm) to install.

Here is an example of how to install via nvm:

```
# Install Node.js LTS
nvm install --lts
# Switch to Node.js LTS
nvm use --lts
```

### Chrome

By default, Agent TARS CLI launches and controls your **`local browser`**, you'll need install [Chrome](https://www.google.com/chrome/).

Installation
------------

Install latest version:

`npm install @agent-tars/cli@latest -g`

TIP

Agent TARS is under rapid development, and its version iteration follows [Semantic Version](https://semver.org/). You can install the current beta version using `@next`:

`npm install @agent-tars/cli@next -g`

Current version information:

| Tag | Version |
| --- | --- |
| Latest | [![Image 1: npm version](https://img.shields.io/npm/v/@agent-tars/cli?style=flat-square&colorA=564341&colorB=EDED91)](https://npmjs.com/package/@agent-tars/cli?activeTab=readme) |
| Next | [![Image 2: npm version](https://img.shields.io/npm/v/@agent-tars/cli/next?style=flat-square&colorA=564341&colorB=EDED91)](https://www.npmjs.com/package/@agent-tars/cli/v/next?activeTab=readme) |

Quick Start
-----------

### 1. Choose a Model

The Agent TARS framework has designed a Model Provider mechanism that allows you to freely use different models.

#### Overview

The current model compatibility status for Agent TARS is as follows:

| Model Provder | Model | Text | Vision | Tool Call & MCP | Visual Grounding |
| --- | --- | --- | --- | --- | --- |
| `volcengine` | Seed1.5-VL | ✔️ | ✔️ | ✔️ | ✔️ |
| `anthropic` | claude-3.7-sonnet | ✔️ | ✔️ | ✔️ | 🚧 |
| `openai` | gpt-4o | ✔️ | ✔️ | ✔️ | 🚧 |

* * *

#### Seed 1.5 VL ByteDance

**[Seed1.5-VL](https://raw.githubusercontent.com/ByteDance-Seed/Seed1.5-VL/refs/heads/main/README.md)** is a powerful and efficient vision-language foundation model designed for advanced general-purpose multimodal understanding and reasoning, Seed1.5-VL has been deployed on [Volcano Engine](https://www.volcengine.com/product/doubao), The Model ID is `doubao-1-5-thinking-vision-pro-250428`.

Once you obtain the `API_KEY`, you can start Agent TARS with a single command:

```
agent-tars \
--provider volcengine \
--model doubao-1-5-thinking-vision-pro-250428 \
--apiKey {apiKey}
```

* * *

#### claude-3.7-sonnet Anthropic

[Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet) is the first Claude model with hybrid reasoning capabilities released by Anthropic in February 2025. Once you obtain the `API_KEY`, you can quickly start Agent TARS:

```
agent-tars \
--provider anthropic \
--model claude-3-7-sonnet-latest \
--apiKey {apiKey}
```

* * *

#### gpt-4o OpenAI

[GPT-4o](https://platform.openai.com/docs/models/gpt-4o) is high-intelligence flagship model shipped by OpenAI, once you obtain the `API_KEY`, you can start with a single command:

```
agent-tars \
--provider openai \
--model gpt-4o \
--apiKey {apiKey}
```

* * *

For more details about model support, please move [Model Provider](https://agent-tars.com/guide/basic/model-provider).

### 2. Start Your First Task

When you start with `agent-tars`:

`agent-tars [...flags]`

You will see the following output in the console:

![Image 3](https://agent-tars.com/agent-tars-cli.png)

Figure 1: Agent TARS CLI

Open the link in the console: [http://localhost:8888](http://localhost:8888/) , you can see the Web UI:

![Image 4](https://agent-tars.com/web-ui.png)

Figure 2: Agent TARS Web UI

Enter this prompt:

`Tell me the top 10 for Humanity's Last Exam`

Congratulations 🎉! At this point, you have successfully started Agent TARS!

TIP

If you encounter any issues, please feel free to report them to us on [Github](https://github.com/bytedance/UI-TARS-desktop/issues).

* * *

### 3. Create a global workspace

While you can start quickly using the CLI, we still recommend creating a Global Workspace. This allows you to maintain configurations via config files, as well as store your [File System](https://agent-tars.com/guide/basic/file). Let's get started:

```
agent-tars workspace --init   # Follow the prompts to complete creation
agent-tars workspace --open   # Open the Workspace
```

Next, you can maintain your configuration in the Global Workspace using TypeScript instead of dealing with CLI parameters, and benefit from complete type checking:

```
// agent-tars.config.ts
import { defineConfig } from '@agent-tars/interface';

/**
 * @see {@link https://beta.agent-tars.com/api/config/agent.html}
 */
export default defineConfig({
  model: {
    provider: 'volcengine',
    // ... other configs
  },
  // ... other configs
});
```

For complete configuration details, please go to [Config](https://agent-tars.com/guide/basic/config), and for model configuration, please go to [Model Provider](https://agent-tars.com/guide/basic/model-provider).

Next Step
---------
