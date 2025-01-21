import { describe, expect, it } from 'vitest';

import { actionParser } from './index';

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
          reflection: '',
          thought:
            '左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。',
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
          reflection: '',
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
          reflection: '',
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
          reflection: '',
          thought:
            '左键单击窗口右上角的最小化按钮（图标为横线），将当前窗口最小化到任务栏。',
        },
      ],
    });
  });

  it('should remove trailing \\n in content value', () => {
    const result = actionParser({
      prediction:
        'Thought: To proceed with the task of accessing "doubao.com," I need to type the correct URL into the address bar. Since the address bar is already active, the next logical step is to input the URL "doubao.com" to navigate to the desired website.\nType "doubao.com" into the address bar to initiate navigation to the website.\nAction: type(content=\'doubao.com\\n\')',
      factor: 1000,
    });

    expect(result).toEqual({
      parsed: [
        {
          action_inputs: {
            content: 'doubao.com',
          },
          action_type: 'type',
          reflection: '',
          thought:
            'To proceed with the task of accessing "doubao.com," I need to type the correct URL into the address bar. Since the address bar is already active, the next logical step is to input the URL "doubao.com" to navigate to the desired website.\nType "doubao.com" into the address bar to initiate navigation to the website.',
        },
      ],
    });
  });
});
