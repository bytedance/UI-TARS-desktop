# Trouble Shooting

Starting from [v0.0.1-alpha.4](https://github.com/bytedance/UI-TARS-desktop/releases/tag/Agent-TARS-v1.0.0-alpha.4), we have introduced log-based error troubleshooting capabilities.

## Introduction

Since the Agent TARS App is currently in the `preview` stage and considering the occasional instability of LLM provider services, you may encounter various unexpected issues during runtime. This guide will help you perform self-troubleshooting to resolve many common problems quickly and efficiently.

If after following this guide your problem persists, or if you encounter an error scenario not covered in this document, please [report the issue](https://github.com/bytedance/UI-TARS-desktop/issues) to us with the minimal steps needed to reproduce the problem.

## Overview

| No. | Scenario                     | Solution Approach                                                                                                        |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| #1  | No response from application | Use [Inspect Main Process](#inspect-main-process) to search for `[Error]` logs to identify potential LLM request errors. |
| #2  | OpenAI API Key validation    | See [Validate OpenAI API Key](#validate-openai-api-key) section.                                                         |
| #3  | Anthropic API Key validation | See [Validate Anthropic API Key](#validate-anthropic-api-key) section.                                                   |
| #4  | Search functionality issues  | See [Validate Search](#validate-search) section.                                                                         |

## Guide

### Inspect Main Process

To view application logs, open the top left menu and navigate to `Help > View Logs`:

<p align="center">
  <img width="300" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/view-logs.png">
</p>

This will display the complete logs from the Main thread:

<p align="center">
  <img width="600" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/logs-window.png">
</p>

You can filter for `[Error]` to quickly locate all potential runtime issues in common scenarios.

### Inspect WebView Process

If you're experiencing abnormal UI rendering, you can access Chrome DevTools through these steps:

<p align="center">
  <img width="300" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/toggle-developer-tools.png">
</p>

This allows you to debug the UI and check the console for any error messages:

<p align="center">
  <img width="600" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/agent-tars-docs/chrome-devtools.png">
</p>

### Validate LLM Request

#### Validate Anthropic API Key

For users of the Official Anthropic API Key, verify your key's validity by running this curl command in your terminal:

```bash
curl https://api.anthropic.com/v1/messages \
--header "x-api-key: $ANTHROPIC_API_KEY" \
--header "anthropic-version: 2023-06-01" \
--header "content-type: application/json" \
--data \
'{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
        {"role": "user", "content": "Hello, world"}
    ]
}'
```

A successful response indicates that your API key is working correctly.

> [!TIP] > **See more**: https://docs.anthropic.com/en/api/getting-started

---

#### Validate OpenAI API Key

For Official OpenAI API Key users, verify your key with this curl command:

```bash
curl "https://api.openai.com/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4o",
        "messages": [
            {
                "role": "user",
                "content": "Hello, world."
            }
        ]
    }'
```

A successful response confirms your API key is valid.

> [!TIP] > **See more**: https://platform.openai.com/docs/quickstart

---

### Validate Search

#### Validate Tavily Search

Test your Tavily search functionality with:

```bash
curl -X POST https://api.tavily.com/search \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer tvly-dev-********************************' \
-d '{
    "query": "Agent TARS"
}'
```

> [!TIP] > **See more**: https://tavily.com/

---

#### Validate Duckduckgo Search

Test DuckDuckGo search with:

```bash
curl -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" \
  -H "Accept: application/json, text/javascript, */*; q=0.01" \
  -H "Accept-Language: en-US,en;q=0.9" \
  -H "Referer: https://duckduckgo.com/" \
  "https://duckduckgo.com/?q=hello+world&format=json"
```

> [!TIP] > **See more**:
>
> - https://github.com/Snazzah/duck-duck-scrape
> - https://duck-duck-scrape.js.org

> [!WARNING]
> As DuckDuckGo is a free service, occasional instability may occur. If you have insights about this, please help us improve this section.

## Errors

### Claude

#### 403: Request not allowed

```bash
Failed to get tool response from LLM: Failed to get tool response
from Anthropic:Error:403 {"error":{"type": "feorbidden","message": "Request not allowed"}}
```

**Solution**: Follow the steps in [Validate Anthropic API Key](#validate-anthropic-api-key).

### OpenAI

#### 401 Incorrect API key provided

```bash
[2025-03-22T18:05:59.707Z] [ERROR] Failed to get tool response from LLM: Failed to get tool response from OpenAI: Error: 401 Incorrect API key provided: xx. You can find your API key at https://platform.openai.com/account/api-keys.
```

**Solution**: Follow the steps in [Validate OpenAI API Key](#validate-openai-api-key).

---

#### TypeError: Invalid URL

```bash
[2025-03-22T17:14:02.078Z] [ERROR] Failed to get tool response from LLM: Failed to get tool response from OpenAI: TypeError: Invalid URL
```

**Solution**: Verify that the Base URL (Endpoint) is configured correctly. Replace the `https://api.openai.com/v1` in the [Validate OpenAI API Key](#validate-openai-api-key) section with your actual endpoint URL.

---

#### Error: 400 invalid model or product name

```bash
Failed to get tool response from LLM: Failed to get tool response from OpenAI: Error: 400 invalid model or product name, product not right
```

---

#### Error: 401 no model permission:

```bash
Failed to get tool response from LLM: Failed to get tool response from Azure OpenAI: Error: 401 no model permission: gpt-4o-2024-11-20, you can apply on the platform
```

---

### DeepSeek

#### 402 Insufficient Balance

```bash
[2025-03-23T04:01:26.836Z] [ERROR] Failed to get tool response from LLM: Failed to get tool response from OpenAI: Error: 402 Insufficient Balance
```

**Solution**: Recharge your account balance.
