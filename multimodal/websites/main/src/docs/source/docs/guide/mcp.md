# Config MCP Servers

## Overview

**MCP (Model Context Protocol)** is an open-source protocol designed to provide context information to Large Language Models (LLMs) in a standardized way. For more information about MCP, please refer to [#what-is-mcp-model-context-protocol](https://modelcontextprotocol.io/introduction).

---

## Prerequisites: Install uv and Node.js

- [uv installation](https://docs.astral.sh/uv/getting-started/installation/)
- [npm installation](https://nodejs.org/en/download)

---

## Quick Start

1. Open Settings

   - Click the settings icon (⚙️) in the left sidebar to access the settings interface
     ![Image](https://sf16-sg.tiktokcdn.com/obj/eden-sg/100upeupq/1.png)

2. Navigate to MCP Servers

   - Select the "MCP Servers" tab from the top navigation bar in settings
     ![Image](https://sf16-sg.tiktokcdn.com/obj/eden-sg/100upeupq/2.png)

3. Add New Server
   - Click the "Add Server" button to begin adding a new MCP server
     ![Image](https://sf16-sg.tiktokcdn.com/obj/eden-sg/100upeupq/3.png)

---

## Configuration Options

There are two types of MCP Server configurations available:

### STDIO Configuration

When selecting "STDIO (Standard Input/Output)" type, you need to fill in the following fields:

- **Name** (required): Enter the server name
- **Description**: Enter server description (optional)
- **Type**: Select STDIO
- **Command** (required): Enter executable command, such as `uvx` or other binary executable
- **Arguments**: Enter parameters, one per line
- **Environment Variables**: Set environment variables in `KEY1=value1` format
- **Enable**: Toggle switch to enable/disable the server

### SSE Configuration

When selecting "SSE (Server-Sent Events)" type, you need to fill in the following fields:

- **Name** (required): Enter the server name
- **Description**: Enter server description (optional)
- **Type**: Select SSE
- **URL** (required): Enter the SSE server URL, e.g., `https://example.com/sse`
- **HEADERS**: SSE request headers
- **Enable**: Toggle switch to enable/disable the server

![Image](https://sf16-sg.tiktokcdn.com/obj/eden-sg/100upeupq/4.png)

---

## References

[MCP Brings a New Paradigm to Layered AI Application Development](/2025/03/25/mcp-brings-a-new-paradigm-to-layered-ai-app-development)
