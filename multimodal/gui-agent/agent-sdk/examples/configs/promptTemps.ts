/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SystemPromptTemplate } from '@gui-agent/shared/types';
import { SYSTEM_PROMPT_1 } from './prompts';

export const systemPromptTemplate1: SystemPromptTemplate = {
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
          case 'navigate':
            return `navigate(url='xxx') # Navigate to the given url.`;
          case 'navigate_back':
            return `navigate_back() # Navigate back to the previous page.`;
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
          default:
            return null;
        }
      })
      .filter((actionString) => actionString !== null)
      .join('\n');
  },
};

export const systemPromptTemplate2: SystemPromptTemplate = {
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
          case 'navigate':
            return `navigate(url='xxx') # Navigate to the given url.`;
          case 'navigate_back':
            return `navigate_back() # Navigate back to the previous page.`;
          case 'drag':
            return `drag(start_point='<point>x1 y1</point>', end_point='<point>x2 y2</point>') # Swipe/Drag to show more information or select elements. The direction of the page movement is opposite to the finger's movement`;
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
          default:
            return null;
        }
      })
      .filter((actionString) => actionString !== null)
      .join('\n');
  },
};
