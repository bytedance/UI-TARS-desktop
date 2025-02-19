# @ui-tars/sdk Guide

## Overview

`@ui-tars/sdk` is a powerful toolkit for building GUI automation agents. It provides a flexible framework to create agents that can interact with graphical user interfaces through various operators.

## Installation

```bash
npm install @ui-tars/sdk
```

```ts
// packages/cli/src/cli/start.ts

import { GUIAgent } from '@ui-tars/sdk';
import { NutJSOperator } from '@ui-tars/operator-nut-js';

const answers = await inquirer.prompt([
  {
    type: 'input',
    name: 'instruction',
    message: 'Input input your instruction',
  },
]);

const abortController = new AbortController();
process.on('SIGINT', () => {
  abortController.abort();
});

const guiAgent = new GUIAgent({
  model: {
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
  },
  operator: new NutJSOperator({}),
  signal: abortController.signal,
  onData: ({ data }) => {
    console.log(data)
  },
  onError: ({ data, error }) => {
    console.error(error, data);
  },
});

await guiAgent.run('send "hello world" to x.com');
```

#### Custom Operator

like `nut-js`

```ts
// packages/operators/nut-js/src/index.ts
import {
  Operator,
  useConfig,
  type ScreenshotOutput,
  type ExecuteParams,
} from '@ui-tars/sdk/core';

export class NutJSOperator extends Operator {
  public async screenshot(): Promise<ScreenshotOutput> {
    // implements
  }

  async execute(params: ExecuteParams): Promise<void> {
    // implements
  }
}
```


### Desktop Agent

✨ Build ANY device/platform Computer Use logic.

⚡ Can't wait to see operators for every platform emerge! The era of AI-driven universal device control starts NOW.

```ts
import { GUIAgent } from '@ui-tars/sdk';
import { NutJSOperator } from '@ui-tars/operator-nut-js';

const abortController = new AbortController();
const guiAgent = new GUIAgent({
  operator: new NutJSOperator({}),
  // openai params
  model: {
    baseURL: 'https://<your_endpoints>.huggingface.cloud/v1/',
    apiKey: 'sk-proj-1234567890',
    model: 'UI-TARS-7B-SFT',
    headers: {},
  },
  signal?: abortController.signal,
  onData?: ({ data }) => {
    console.log(data);
  },
  onError?: ({ data, error }) => {
    console.error(error);
  },
  systemPrompt?: 'override system prompt',
});

await guiAgent.run('send "hello world" to x.com'); // instruction
```

### Planning

```ts
const guiAgent = new GUIAgent({});

const planningList = await reasoningModel.invoke({
  conversations: [
    {
      role: 'user',
      content: 'buy a ticket from beijing to shanghai',
    }
  ]
})
/**
 * [
 *  'open chrome',
 *  'open trip.com',
 *  'click "search" button',
 *  'select "beijing" in "from" input',
 *  'select "shanghai" in "to" input',
 *  'click "search" button',
 * ]
 */

for (const planning of planningList) {
  await guiAgent.run(planning);
}
```


