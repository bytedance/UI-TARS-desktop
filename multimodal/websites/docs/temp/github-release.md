![image](https://github.com/user-attachments/assets/4f75a67e-624b-4e0f-a986-927d7fbbc73d)

<b>Agent TARS</b> is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product. <br>
It primarily ships with a <a href="https://agent-tars.com/guide/basic/cli.html" target="_blank">CLI</a> and <a href="https://agent-tars.com/guide/basic/web-ui.html" target="_blank">Web UI</a> for usage. It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world <a href="https://agent-tars.com/guide/basic/mcp.html" target="_blank">MCP</a> tools.

📣 **Just released**: Agent TARS Beta - check out our [announcement blog post](https://agent-tars.com/beta)!

https://github.com/user-attachments/assets/772b0eef-aef7-4ab9-8cb0-9611820539d8

<br>

<table>
  <thead>
    <tr>
      <th width="50%" align="center">Booking Hotel</th>
      <th width="50%" align="center">Generate Chart with extra MCP Servers</th>
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
        <b>Instruction:</b> <i>I am in Los Angeles from September 1st to September 6th, with a budget of $5,000. Please help me book a Ritz-Carlton hotel closest to the airport on booking.com and compile a transportation guide for me</i>
      </td>
      <td align="left">
        <b>Instruction:</b> <i>Draw me a chart of Hangzhou's weather for one month</i>
      </td>
    </tr>
  </tbody>
</table>

For more use cases, please check out [#842](https://github.com/bytedance/UI-TARS-desktop/issues/842).

### Core Features

- 🖱️ **One-Click Out-of-the-box CLI** - Supports both **headful** [Web UI](https://agent-tars.com/guide/basic/web-ui.html) and **headless** [server](https://agent-tars.com/guide/advanced/server.html)) [execution](https://agent-tars.com/guide/basic/cli.html).
- 🌐 **Hybrid Browser Agent** - Control browsers using [GUI Agent](https://agent-tars.com/guide/basic/browser.html#visual-grounding), [DOM](https://agent-tars.com/guide/basic/browser.html#dom), or a hybrid strategy.
- 🔄 **Event Stream** - Protocol-driven Event Stream drives [Context Engineering](https://agent-tars.com/beta#context-engineering) and [Agent UI](https://agent-tars.com/blog/2025-06-25-introducing-agent-tars-beta.html#easy-to-build-applications).
- 🧰 **MCP Integration** - The kernel is built on MCP and also supports mounting [MCP Servers](https://agent-tars.com/guide/basic/mcp.html) to connect to real-world tools.

### Quick Start

```bash
# Luanch with `npx`.
npx @agent-tars/cli@latest

# Install globally, required Node.js >= 22
npm install @agent-tars/cli@latest -g

# Run with your preferred model provider
agent-tars --provider volcengine --model doubao-1-5-thinking-vision-pro-250428 --apiKey your-api-key
agent-tars --provider anthropic --model claude-3-7-sonnet-latest --apiKey your-api-key
```

Visit the comprehensive [Quick Start](https://agent-tars.com/guide/get-started/quick-start.html) guide for detailed setup instructions.

## 📚 Resources

![agent-tars-banner](https://github.com/user-attachments/assets/1b07e0a7-b5ea-4f06-90a1-234afe659568)

- 📄 [Blog Post](https://agent-tars.com/beta)
- 🐦 [Release Announcement on Twitter](https://x.com/_ulivz/status/1938009759413899384)
- 🐦 [Official Twitter](https://x.com/agent_tars)
- 💬 [Discord Community](https://discord.gg/HnKcSBgTVx)
- 💬 [飞书交流群](https://applink.larkoffice.com/client/chat/chatter/add_by_link?link_token=279h3365-b0fa-407f-89f3-0f96f36cd4d8)
- 🚀 [Quick Start](https://agent-tars.com/quick-start)
- 💻 [CLI Documentation](https://agent-tars.com/guide/basic/cli.html)
- 🖥️ [Web UI Guide](https://agent-tars.com/guide/basic/web-ui.html)
- 📁 [Workspace Documentation](https://agent-tars.com/guide/basic/workspace.html)
- 🔌 [MCP Documentation](https://agent-tars.com/guide/basic/mcp.html)

## What's Changed

See Full [CHANGELOG](https://github.com/bytedance/UI-TARS-desktop/blob/main/multimodal/CHANGELOG.md)
