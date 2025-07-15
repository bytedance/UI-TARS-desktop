# Announcing Agent TARS App (Preview)

## Introduction

Hello everyone! We're thrilled to introduce a new friend — **Agent TARS**.

**Agent TARS** is an open-source multimodal AI agent that offers streamlined browser operations by interpreting web pages visually. It also effortlessly integrates with command lines and file systems. For a quick overview, check out the demo video below:

<div className="bg-gray-900 w-full h-500 rounded-lg overflow-hidden">
  <video
    autoPlay
    loop
    controls
    playsInline
    className="w-full h-full bg-gray-200">
    <source
      src="https://github.com/user-attachments/assets/5bfed86f-7201-4fe2-b33b-d93a591c35c8"
      type="video/mp4"
    />
  </video>
</div>

You can find more examples in our [Showcase](https://agent-tars.com/showcase) page.

---

## Features

Agent TARS brings a suite of powerful features to enhance your AI-driven tasks. In this release, we will mainly introduce the following features to you.

### Agentic Workflow Orchestration

At its core, Agent TARS leverages a sophisticated agent framework to create a agent flow, help you finished **task planning** and **execution**, It smoothly orchestrates tasks such as _searching_, _browsing_, _exploring links_, and at the same time, it connected with the UI through `Event Stream`, and synthesizing information to produce final outputs.

### Comprehensive Tool Support (Browser, CLI, File etc.)

Agent TARS leverages a sophisticated **agent framework** to execute complex `browser` tasks such as `Deep Research` and other _Operator_ functions. we also leverage [Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) (MCP) to integrate seamlessly with a variety of tools including `search`, `file editing`, `CLI` and coding. This extensive toolset allows Agent TARS to handle intricate workflows with ease.

### Real-time Artifact

To enhance user engagement with AI _processes_ and _outcomes_, the Agent TARS App offers an intuitive streaming user interface showcasing `multimodal` artifacts like **browsers** and **documents**. _This is also an important entry point for you to contact Agent TARS_. You can find all released versions [here](https://github.com/bytedance/UI-TARS-desktop/releases?q=Agent+Tars&expanded=true).

These features combine to make Agent TARS a powerful and versatile tool for AI-assisted browsing, research, and task execution, check out our examples:

- [Technical analysis of Tesla's future stock price trends](/showcase/tesla-stock-technical-analysis)
- [Top 5 most popular ProductHunt projects analysis report](/showcase/producthunt-top-projects-analysis)
- [Analyse issues in the Lynx repository](/showcase/lynx-repository-issues-report)
- [Reasons behind Tesla's recent stock price decline
  ](/showcase/tesla-stock-decline-reasons)
- [7-day trip plan to Mexico City from NYC](/showcase/7-day-trip-plan-to-mexico-city)

## Quick Start

> **DISCLAIMER**: Agent TARS is still in **Technical Preview** stage and not stable yet. It's not recommended to use it in production. If you run into any issues, we welcome feedback on [Github](https://github.com/bytedance/UI-TARS-desktop) or on [Twitter](https://x.com/agent_tars).

### Install

Visit [Releases](https://github.com/bytedance/UI-TARS-desktop/releases?q=Agent+Tars&expanded=true) page to download the latest desktop package of Agent TARS.

![Github Releases](https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/releases.png)

Currently, Agent TARS supports only macOS, but don’t worry — support for other platforms is on the way!

---

### Configuration

When you open the app, you need to first open the lower-left corner to access the `Settings` page and adjust the necessary settings:

Before you begin, you will need to set some necessary configuration, You can click the left-bottom button to open the `setting` page:

![setting-icon.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/setting-icon.jpeg)

Then you can set the model config and the search config. For model config, you can set the model provider and `API Key`:

![model-config.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/model-setting.jpeg)

> For Azure OpenAI, you can set more params, including `apiVersion`, `deploymentName` and `endpoint`.

### Search

For search config, you can set the search provider and api key:

![search-settings.png](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/search-setting.jpeg)

### Start Your First Journey

Now you can start your first journey in Agent TARS! You can input your first question in the input box, and then press Enter to send your question. Here is an example:

![first-journey.jpeg](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/start-journey.jpeg)

It's working!

We also support **Human In the Loop**, that means you can interact with the agent in the working process by the input box. If you want to change the direction of current agent work, you can insert your thoughts in the special input box on the top position, and then press Enter to send your thoughts. Here is an example:

![human-in-the-loop.jpeg](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/human-in-the-loop.jpeg)

### Share Your Thread

You can share your thread with others by the share button on the top menu.

There are two modes to share your thread:

- **Local Html**: Agent TARS will bundle your thread into a html file, and you can share it with others.
- **Remote Server Url**: Agent TARS will generate a url for you to share your thread with others, Agent TARS will upload the html bundle to a remote server.

#### Local Mode

You can click the share button to open the share modal, and then click the **Local Html** button to share your thread.

![local-share](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/local-share.jpeg)

#### Remote Mode

For the remote share mode, you need to set the remote server url in the share modal:

![remote-share](https://lf3-static.bytednsdoc.com/obj/eden-cn/uhbfnupenuhf/agent-tars/remote-share.jpeg)

Then Agent TARS will post a request to the remote server to upload the html bundle, and then you can share the url with others. The specific request information is as follows:

> - Method: POST
> - Body:
>   - file: the html bundle file(type: multipart/form-data)
> - Response:
>   - data: { url: string }

Preview, share, and enjoy the awesome replay process!

---

## Important Information

1. Our Planning has been tested based on Claude. Currently, support for OpenAI is still unstable, and you are welcome to collaborate with us to enhance OpenAI support.
2. You may encounter various issues. If any problems arise, please refer to [Trouble Shooting](/doc/trouble-shooting).

---

## What’s Next?

This app marks the exciting first step in Agent TARS's journey, Next, we’ll share its inner workings and unique design with the community.

Stay updated by following us on X ([@AgentTars](https://x.com/agent_tars)) and join our [Discord](https://discord.gg/NAeJMKk4) to share your experiences!

---

## Links

- X: https://x.com/agent_tars
- Discord: https://discord.gg/NAeJMKk4
- Showcase: https://agent-tars.com/showcase
- Github: https://github.com/bytedance/UI-TARS-desktop
