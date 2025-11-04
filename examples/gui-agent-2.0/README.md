# GUI Agent 2.0 – Minimal Demo

A minimal, runnable demo showing how to use `GUI Agent SDK 2.0` with the `AIO Hybrid Operator` and a Doubao model to perform a simple task.

## What it does

- Initializes `GUIAgent` with `AIOHybridOperator` and a Doubao model
- Sends a single request: "Check the weather in Shanghai"
- Prints the agent's response to the console

## Prerequisites

- Node.js 18+, pnpm or npm
- Valid credentials for Volcengine Ark (API key, base URL) and a Doubao model ID
- A running AIO sandbox service base URL

## Project structure

- src/index.ts: Entry point, sets up agent and runs the demo
- src/constants.ts: System prompt for the agent
- package.json: Scripts to build/run the demo
- .env.local: Environment variables (not committed)

## How to use

1. Create an `.env.local` file in this folder with the following keys:

```
ARK_BASE_URL=https://your-ark-base-url
ARK_API_KEY=your-ark-api-key
DOUBAO_SEED_1_6=your-doubao-model-id
SANDBOX_URL=http://your-aio-sandbox-url
```

2. Install dependencies:

```bash
pnpm install
# or
npm install
```

3. Run

- Development (TypeScript, using tsx):
```bash
pnpm dev
```

- Build and run:
```bash
pnpm build
pnpm start
``` 

4. Expected output

You should see logs similar to:

```
📦 Testing AIO Operator...

📝 Agent with AIO Operator Response:
================================================
<agent response content>
================================================
```
