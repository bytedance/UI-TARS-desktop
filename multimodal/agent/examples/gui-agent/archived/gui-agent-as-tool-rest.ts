/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A example to use models from "volcengine".
 */

import { Agent, Tool, z } from '../../../src';

const guiAgentTool = new Tool({
  id: 'browser_vision_control',
  description: `A browser operation tool based on visual understanding, perform the next action to complete the task.

## Action Space

click(point='<point>x1 y1</point>')
left_double(point='<point>x1 y1</point>')
right_single(point='<point>x1 y1</point>')
drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>')
hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.
type(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. 
scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the \`direction\` side.
wait() #Sleep for 5s and take a screenshot to check for any changes.
finished(content='xxx') # Use escape characters \\', \", and \\n in content part to ensure we can parse the content in normal python string format.


## Note
- Use Chinese in \`Thought\` part.
- Describe your detailed thought in \`Thought\` part.
- Describe your action in \`Step\` part.`,
  parameters: z.object({
    thought: z.string().describe(' your observation and small plan in one sentence'),
    step: z
      .string()
      .describe('Finally summarize the next action (with its target element) in one sentence'),
    action: z.string().describe('some action in action space like clike or press'),
  }),
  function: async ({ thought, step, action }) => {
    console.log({ thought, step, action });
    return { thought, step, action };
  },
});

async function main() {
  const agent = new Agent({
    instructions: `You must use browser_action_tool to finish user's task

    `,
    tools: [guiAgentTool],
    model: {
      use: {
        provider: 'volcengine',
        model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
        apiKey: process.env.ARK_API_KEY,
      },
    },
    toolCallEngine: 'prompt_engineering',
  });

  const answer = await agent.run({
    input: [
      { type: 'text', text: 'What is Agent TARS' },
      { type: 'text', text: "Here is the screenshot of user's browser" },
      {
        type: 'image_url',
        image_url: {
          url: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/psvhouloj/gui-agent/google-search.png',
        },
      },
    ],
  });

  console.log(answer);
}

main();
