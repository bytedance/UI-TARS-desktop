# Quick Start

## Introduction

[Agent TARS](https://github.com/bytedance/UI-TARS-desktop) is an open-source multimodal agent designed to revolutionize GUI interaction by visually interpreting web pages and seamlessly integrating with command lines and file systems.

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-welcome-screen.png">
</p>

In this section, we'll help you to quickly start Agent TARS in minimal necessary steps, and take the following prompt as an example:

```bash
Tell me the top 5 most popular projects on ProductHunt today, analyze them in depth, and output a report to me.
```

---

## Prerequisites

Before you begin, you will need to set some necessary settings, you can click the left-bottom button to open the setting page.

---

### Environment Setup

- **OS**: `macOS`
- **Necessary software**: [Chrome](https://www.google.com/chrome/).
- **Install Agent TARS App**: https://github.com/bytedance/UI-TARS-desktop/releases

> [!TIP]
> Since Agent TARS is still in the `technical preview` stage and the developers are primarily focusing on Mac, the unstable Windows poses challenges for troubleshooting. Therefore, we DO NOT support Windows at this time. You can subscribe to https://github.com/bytedance/UI-TARS-desktop/issues/268 to stay updated on Windows support.

---

### Config Model Provider

For model config, you can set the model provider and api key:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting.png">
</p>

> [!TIP]
> For Azure OpenAI, you can set more params, including `apiVersion`, `deploymentName` and `endpoint`.

If you encounter any problems with model calls later, please go to [Trouble Setting](/doc/trouble-shooting) to check your configuration.

---

#### Compare Model Providers

Agent TARS is still in `alpha` stage, `Claude 3.x` is the best working model so far, but it is still not optimal, we plan to provide better model support in the `beta` version.

The preliminary comparison of **known** model providers is as follows:

| Search Provider   | Planning  | Executing | Stability |
| ----------------- | --------- | --------- | --------- |
| Claude 3.7 Sonnet | Medium+   | Medium    | Medium    |
| Claude 3.5 Sonnet | Medium+   | Medium    | Medium    |
| GPT-4o            | Medium    | ⚠️ Low    | ❓Unknown |
| DeepSeek          | Medium    | ⚠️ Low    | ❓Unknown |
| Others            | ❓Unknown | ❓Unknown | ❓Unknown |

> [!TIP]
> Disclaimer: The above table is based on the test results of the current stage and the summary of Github Issues, and should be replaced by the official Benchmark in the future.

To reflect this, we’ve added reminders in the settings for clarity. Other models, such as `GPT-4o`, `DeepSeek`, and others, are in an experimental state. Agent TARS does not guarantee their effectiveness, so please use them with caution. Learn more about updates: https://github.com/bytedance/UI-TARS-desktop/discussions/377

---

#### Test Model Provider

> [!TIP]
> From [v0.0.1-alpha.8](https://github.com/bytedance/UI-TARS-desktop/releases/tag/Agent-TARS-v1.0.0-alpha.8).

You can click **Test Model Provider** button to check if current model setting is available:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting-test-model-provider-success.png">
</p>

Some common mistakes:

| Error                   | Snapshot                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid API Key         | <img width="700" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting-test-model-provider-no-ak.png"> |
| Not support tools       | <img width="700" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting-test-model-provider.png">       |
| Not respond tool_calls | <img width="700" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting-test-model-provider.png">       |

> [!TIP]
> For more informations, please check [Trouble Shooting](/doc/trouble-shooting) guide.

---

### Config Search Provider

For search config, you can set the search provider:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting-search.png">
</p>

---

#### Compare Search Providers

The comparison of search providers is as follows:

| Search Provider                | Need API Key? | Speed       |
| ------------------------------ | ------------- | ----------- |
| Local Browser Search (Default) | NO            | Slow        |
| Tavily                         | YES           | Fast        |
| Bing Search                    | YES           | Fast        |
| SearXNG Search                 | NO            | ❓Unknown   |
| Duckduckgo Search              | NO            | ⚠️ Unstable |

---

#### Test Search Service

You can click **Test Search Service** button to check if current search setting is available:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-setting-test-search-service.png">
</p>

---

## Start your first task

Now you can start your first journey in Agent TARS! You can input your first question in the input box, and then press Enter to send your question.

### Step-by-step

Let‘s take the following instruction as an example:

```bash
Tell me the top 5 most popular projects on ProductHunt today, analyze them in depth, and output a report to me.
```

You would see that Agent TARS completes the planning first and trigger a search:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-first-task-01.png">
</p>

Agent TARS connects to the `browser use` below through MCP and opens "Product Hunt":

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-first-task-02.png">
</p>

According to the plan, Agent TARS will continue to browse the detailed of these 5 products:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-first-task-03.png">
</p>

After several minutes or more of waiting, summarizing, and writing files, Agent TARS has generated a research report for you:

<p align="center">
  <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/agent-tars-first-task-08.png">
</p>

It's working!

### Human In the Loop

Agent TARS also supports **Human In the Loop**, that means you can interact with the agent in the working process by the input box. If you want to change the direction of current agent work, you can insert your thoughts in the special input box on the top position, and then press Enter to send your thoughts. Here is an example:

<p align="center">
  <img width="800" src="https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/human-in-the-loop.jpeg">
</p>

---

## Share your task

You can share your task thread with others by the share button on the top menu.

There are two modes to share your thread:

- **Local Html**: Agent TARS will bundle your thread into a html file, and you can share it with others.
- **Remote Server Url**: Agent TARS will generate a url for you to share your thread with others, Agent TARS will upload the html bundle to a remote server.

---

### Local mode

You can click the share button to open the share modal, and then click the **Local Html** button to share your thread.

<p align="center">
  <img width="800" src="https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/local-share.jpeg">
</p>

---

### Remote mode

For the remote share mode, you need to set the remote server url in the share modal:

<p align="center">
  <img width="800" src="https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/remote-share.jpeg">
</p>

Then Agent TARS will post a request to the remote server to upload the html bundle, and then you can share the url with others. The specific request information is as follows:

- Method: POST
- Body:
  - file: the html bundle file(type: multipart/form-data)
- Response:
  - data: { url: string }

Then the server will return an object including the `url` parameter, which is the url to share your thread.

---

When you finish the shared process, you can preview the bundle and experience the wonderful replay process! That's really cool!
