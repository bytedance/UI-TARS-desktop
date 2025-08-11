/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
// @prettier
import { describe, expect, it } from 'vitest';

import { actionParser } from '../';

describe('actionParser', () => {
  it('should return parsed action', () => {
    const result = actionParser({
      prediction:
        "Action_Summary: 左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。\nAction: click(start_box='(948,57)')",
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            start_box: '[0.948,0.057,0.948,0.057]',
          },
          action_type: 'click',
          reflection: null,
          thought: '左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。',
        },
      ],
    });
  });

  it('should return parsed action english', () => {
    const result = actionParser({
      prediction:
        "Thought: The task is to open Chrome, but the current screen shows a GitHub repository page in a different browser. To proceed, I need to close this window and open Chrome. The most efficient way to do this is by clicking the 'X' button in the top-right corner of the current window to close it, which will allow me to access the desktop and open Chrome from there. Click on the 'X' button in the top-right corner of the current window to close it. Action: click(start_box='(962,108)')",
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            start_box: '[0.962,0.108,0.962,0.108]',
          },
          action_type: 'click',
          reflection: null,
          thought:
            "The task is to open Chrome, but the current screen shows a GitHub repository page in a different browser. To proceed, I need to close this window and open Chrome. The most efficient way to do this is by clicking the 'X' button in the top-right corner of the current window to close it, which will allow me to access the desktop and open Chrome from there. Click on the 'X' button in the top-right corner of the current window to close it.",
        },
      ],
    });
  });

  it('should return parsed action english with newline', () => {
    const result = actionParser({
      prediction:
        'Thought: The task is to open Chrome, but the current screen shows a GitHub repository page in a different browser. To proceed, I need to close this window and open Chrome. The most efficient way to do this is by clicking the "X" button in the top-right corner of the current window to close it, which will allow me to access the desktop and open Chrome from there.\nClick on the "X" button in the top-right corner of the current window to close it.\nAction: click(start_box=\'(962,108)\')',
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            start_box: '[0.962,0.108,0.962,0.108]',
          },
          action_type: 'click',
          reflection: null,
          thought:
            'The task is to open Chrome, but the current screen shows a GitHub repository page in a different browser. To proceed, I need to close this window and open Chrome. The most efficient way to do this is by clicking the "X" button in the top-right corner of the current window to close it, which will allow me to access the desktop and open Chrome from there.\nClick on the "X" button in the top-right corner of the current window to close it.',
        },
      ],
    });
  });

  it('should return parsed action with square brackets', () => {
    const result = actionParser({
      prediction:
        "Action_Summary: 左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。\nAction: click(start_box='[948,57]')",
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            start_box: '[0.948,0.057,0.948,0.057]',
          },
          action_type: 'click',
          reflection: null,
          thought: '左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。',
        },
      ],
    });
  });

  it('should return parsed action english with square brackets', () => {
    const result = actionParser({
      prediction:
        'Thought: The task is to open Chrome, but the current screen shows a GitHub repository page in a different browser. To proceed, I need to close this window and open Chrome. The most efficient way to do this is by clicking the "X" button in the top-right corner of the current window to close it, which will allow me to access the desktop and open Chrome from there.\nClick on the "X" button in the top-right corner of the current window to close it.\nAction: click(start_box=\'[962,108]\')',
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            start_box: '[0.962,0.108,0.962,0.108]',
          },
          action_type: 'click',
          reflection: null,
          thought:
            'The task is to open Chrome, but the current screen shows a GitHub repository page in a different browser. To proceed, I need to close this window and open Chrome. The most efficient way to do this is by clicking the "X" button in the top-right corner of the current window to close it, which will allow me to access the desktop and open Chrome from there.\nClick on the "X" button in the top-right corner of the current window to close it.',
        },
      ],
    });
  });

  it('should return Action_Summary', () => {
    const result = actionParser({
      prediction:
        "Action_Summary: 左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。\nAction: click(start_box='(948,57)')",
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            start_box: '[0.948,0.057,0.948,0.057]',
          },
          action_type: 'click',
          reflection: null,
          thought: '左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。',
        },
      ],
    });
  });

  it('should return Reflection', () => {
    const result = actionParser({
      prediction:
        "Reflection: 在桌面上我看到了Chrome浏览器的图标，根据任务要求需要打开Chrome浏览器，应该双击该图标来启动浏览器。\nAction_Summary: 在桌面上找到Chrome浏览器图标的位置，通过双击操作来打开浏览器。\nAction: left_double(start_box='21, 246, 21, 246')",
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          thought: '在桌面上找到Chrome浏览器图标的位置，通过双击操作来打开浏览器。',
          reflection:
            '在桌面上我看到了Chrome浏览器的图标，根据任务要求需要打开Chrome浏览器，应该双击该图标来启动浏览器。',
          action_type: 'left_double',
          action_inputs: {
            start_box: '[0.021,0.246,0.021,0.246]',
          },
        },
      ],
    });
  });

  it('should return parsed action with newline', () => {
    const result = actionParser({
      // prettier-ignore
      prediction: "Thought: 我已经点击了地址栏，现在需要输入网址doubao.com。地址栏已经被激活，可以直接输入网址。\nAction: type(content='doubao.com\n')",
      factor: 1000,
    });

    expect(result.parsed[0].thought).toBe(
      '我已经点击了地址栏，现在需要输入网址doubao.com。地址栏已经被激活，可以直接输入网址。',
    );
    expect(result.parsed[0].action_type).toBe('type');
    expect(result.parsed[0].action_inputs.content).toEqual(String.raw`doubao.com\n`);
  });

  describe('Mobile action parser', () => {
    it('Click on the search bar at the top of the screen', () => {
      const result = actionParser({
        prediction:
          "Thought: Click on the search bar at the top of the screen\nAction: click(start_box='(395,74)')",
        factor: 1000,
      });
      expect(result).toEqual({
        parsed: [
          {
            reflection: null,
            thought: 'Click on the search bar at the top of the screen',
            action_type: 'click',
            action_inputs: { start_box: '[0.395,0.074,0.395,0.074]' },
          },
        ],
      });
    });

    it('swipe', () => {
      const result = actionParser({
        prediction:
          "Thought: swipe(start_box='(693,685)', end_box='(724,300)')\n\nAction: scroll(direction='left')",
        factor: 1000,
      });
      expect(result).toEqual({
        parsed: [
          {
            reflection: null,
            thought: "swipe(start_box='(693,685)', end_box='(724,300)')",
            action_type: 'scroll',
            action_inputs: { direction: 'left' },
          },
        ],
      });
    });
  });

  it('it should return empty action', () => {
    expect(
      actionParser({
        prediction:
          'Thought: 在当前的界面中，我看到有多个窗口和文件，包括一个浏览器窗口和一个终端窗口。',
        factor: 1000,
      }),
    ).toEqual({
      parsed: [
        {
          reflection: null,
          thought: '在当前的界面中，我看到有多个窗口和文件，包括一个浏览器窗口和一个终端窗口。',
          action_type: '',
          action_inputs: {},
        },
      ],
    });
  });

  it('it should return last action', () => {
    expect(
      actionParser({
        prediction:
          "Thought: 在当前的界面中，我看到有多个窗口和文件，包括一个浏览器窗口和一个终端窗口。\nAction: click(start_box='(100,100)')\n\nAction: type(content='doubao.com')",
        factor: 1000,
      }),
    ).toEqual({
      parsed: [
        {
          reflection: null,
          thought: '在当前的界面中，我看到有多个窗口和文件，包括一个浏览器窗口和一个终端窗口。',
          action_type: 'type',
          action_inputs: { content: 'doubao.com' },
        },
      ],
    });
  });

  it('it should return hotkey', () => {
    expect(
      actionParser({
        prediction:
          // secretlint-disable-next-line
          "Action_Summary: 粘贴使用 ctrl+v。\nAction: hotkey(key='ctrl v')",
        factor: 1000,
      }),
    ).toEqual({
      parsed: [
        {
          reflection: null,
          thought: '粘贴使用 ctrl+v。',
          action_type: 'hotkey',
          // secretlint-disable-next-line
          action_inputs: { key: 'ctrl v' },
        },
      ],
    });
  });
});
