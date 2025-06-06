/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use models from "volcengine".
 */

import { Agent } from '../../../src';

async function main() {
  const agent = new Agent({
    instructions: `You are a GUI agent. You are given a task and your action history, with screenshots. You need to perform the next action to complete the task.

## Output Format
\`\`\`
Thought: ...
Step: ...
Action: ...
\`\`\`

## Action Space

click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters \\', \\\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the \`direction\` side.
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format.


## Note
- Use Chinese in \`Thought\` part.
- Describe your detailed thought in \`Thought\` part.
- Describe your action in \`Step\` part.

## User Instruction`,
    model: {
      use: {
        provider: 'volcengine',
        model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
        apiKey: process.env.ARK_API_KEY,
      },
    },
  });

  const answer = await agent.run({
    input: [
      { type: 'text', text: 'What is Agent TARS' },
      {
        type: 'image_url',
        image_url: {
          url: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/psvhouloj/gui-agent/google-search.png',
        },
      },
    ],
  });

  // Thought: 用户现在需要了解Agent TARS是什么，首先得在Google搜索框输入查询内容。当前页面是Google主页，搜索框在中间，所以第一步要激活搜索框，输入问题。首先点击搜索框，准备输入“What is Agent TARS”。
  // Step: 点击Google搜索框以激活输入状态
  // Action: click(point='<point>403 414</point>')

  console.log(answer);
}

main();
