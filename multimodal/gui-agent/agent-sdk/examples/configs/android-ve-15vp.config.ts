/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SystemPromptTemplate } from '@gui-agent/shared/types';
import { SYSTEM_PROMPT_1 } from './prompts';
import { doubao_1_5_vp } from './models';
import { androidOperator } from './operators';

const systemPromptTemplate: SystemPromptTemplate = {
  template: SYSTEM_PROMPT_1,
  actionsToString: (actions) => {
    return actions
      .map((action) => {
        switch (action) {
          case 'click':
            return `click(point='<point>x1 y1</point>')`;
          case 'right_click':
            return `right_single(point='<point>x1 y1</point>')`;
          case 'double_click':
            return `left_double(point='<point>x1 y1</point>')`;
          case 'drag':
            return `swipe(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>') # Swipe/Drag to show more information or select elements. The direction of the page movement is opposite to the finger's movement`;
          case 'hotkey':
            return `hotkey(key='ctrl c') # Split keys with a space and use lowercase. Also, do not use more than 3 keys in one hotkey action.`;
          case 'type':
            return `type(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format. If you want to submit your input, use \\n at the end of content. `;
          case 'scroll':
            return `scroll(point='<point>x1 y1</point>', direction='down or up or right or left') # Show more information on the \`direction\` side.`;
          case 'long_press':
            return `long_press(point='<point>x1 y1</point>')`;
          case 'press_back':
            return `press_back() # Press the back button. 如果你想切换应用不需要press_back，直接open_app。`;
          case 'press_home':
            return `press_home() # Press the home button. 如果你想切换应用不需要press_home，直接open_app。`;
          case 'open_app':
            return `open_app(app_name='xxx') # Open the app with the given name. You can only use the apps in the app_list.`;
          case 'wait':
            return `wait() #Sleep for 5s and take a screenshot to check for any changes.`;
          case 'finished':
            return `finished(content='xxx') # Use escape characters \\', \\", and \\n in content part to ensure we can parse the content in normal python string format.`;
        }
        return ``;
      })
      .join('\n');
  },
};

export default defineConfig({
  operator: androidOperator,
  model: doubao_1_5_vp,
  // systemPrompt: SYSTEM_PROMPT_1,
  systemPrompt: systemPromptTemplate,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/android-ve-15vp'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Android (Volcengine)',
    subtitle: 'Android mobile GUI agent powered by Volcengine ARK models',
    welcomTitle: 'Android GUI Agent with Volcengine',
    welcomePrompts: [
      'Check the weather in Beijing',
      'Add Tom: 12345678900 to contacts',
      'What is Agent TARS',
      'Set an alarm for 8:00',
      'Check the current device version',
    ],
  },
});
