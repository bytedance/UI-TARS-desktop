/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { DefaultActionParser } from '../src/DefaultActionParser';

const actionParser = new DefaultActionParser();

describe('DefaultActionParser', () => {
  describe('Omni mode', () => {
    it('open computer', () => {
      const input = `<think>The user is asking about "Agent TARS". I need to search for information about this. First, I should open a web browser to search for this information. Since I'm in a computer environment, I'll start by opening the computer and then navigating to a search engine.</think>
<computer_env>
Action: open_computer()
</computer_env>`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'open_computer',
            inputs: {},
          },
        ],
        rawActionStrings: ['open_computer()'],
        rawContent: `<think>The user is asking about "Agent TARS". I need to search for information about this. First, I should open a web browser to search for this information. Since I'm in a computer environment, I'll start by opening the computer and then navigating to a search engine.</think>
<computer_env>
Action: open_computer()
</computer_env>`,
        reasoningContent: `The user is asking about "Agent TARS". I need to search for information about this. First, I should open a web browser to search for this information. Since I'm in a computer environment, I'll start by opening the computer and then navigating to a search engine.`,
      });
    });

    it('finished action', () => {
      const input = `<think>The user is asking for the answer to 1+1. This is a simple arithmetic question. The answer is 2. I should provide this directly as it doesn't require any computer interaction.</think>
<answer>
The answer to 1+1 is 2.
</answer>`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            inputs: { content: 'The answer to 1+1 is 2.' },
            type: 'finished',
          },
        ],
        rawActionStrings: [`finished(content='The answer to 1+1 is 2.')`],
        rawContent: `<think>The user is asking for the answer to 1+1. This is a simple arithmetic question. The answer is 2. I should provide this directly as it doesn't require any computer interaction.</think>
<answer>
The answer to 1+1 is 2.
</answer>`,
        reasoningContent: `The user is asking for the answer to 1+1. This is a simple arithmetic question. The answer is 2. I should provide this directly as it doesn't require any computer interaction.`,
      });
    });
  });

  // BC mode tests
  describe('BC mode', () => {
    it('should correctly parse (1)', () => {
      const input = `Thought: I need to click this button
Action: click(start_box='(100,200)')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 100,
                  y: 200,
                },
                referenceBox: {
                  x1: 100,
                  y1: 200,
                  x2: 100,
                  y2: 200,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='(100,200)')`],
        rawContent: `Thought: I need to click this button
Action: click(start_box='(100,200)')`,
        reasoningContent: `I need to click this button`,
      });
    });

    it('should correctly parse (2)', () => {
      const input = `Thought: I need to click this button
Action: click(start_box='(100,200)')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 100,
                  y: 200,
                },
                referenceBox: {
                  x1: 100,
                  y1: 200,
                  x2: 100,
                  y2: 200,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='(100,200)')`],
        rawContent: `Thought: I need to click this button
Action: click(start_box='(100,200)')`,
        reasoningContent: 'I need to click this button',
      });
    });

    it('input with Reflection and Action_Summary', () => {
      const input = `Reflection: This is a reflection
Action_Summary: This is a summary
Action: type(text='Hello', start_box='(300,400)')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'type',
            inputs: {
              content: 'Hello',
              point: {
                raw: {
                  x: 300,
                  y: 400,
                },
                referenceBox: {
                  x1: 300,
                  y1: 400,
                  x2: 300,
                  y2: 400,
                },
              },
            },
          },
        ],
        rawActionStrings: [`type(text='Hello', start_box='(300,400)')`],
        rawContent: `Reflection: This is a reflection
Action_Summary: This is a summary
Action: type(text='Hello', start_box='(300,400)')`,
        reasoningContent: 'This is a reflection, This is a summary',
      });
    });

    it('multiple actions', () => {
      const input = `Thought: To query the weather in Beijing, we need to first navigate to a search engine. Since the task specifies not to use Google but Baidu, the first step is to navigate to Baidu's homepage. Then, we can enter the query. 

First, the current page is Google's homepage, so we need to change the URL to Baidu. The address bar is where we input the new URL. So, click on the address bar, type "baidu.com", and press Enter to go to Baidu. Once on Baidu, we can use the search bar to query Beijing's weather.

So the actions would be: click the address bar, type the URL, press Enter to navigate, then on Baidu's page, click the search bar, type the query, and press Enter. Let's structure these steps.

First, navigate to Baidu: click the address bar, type "baidu.com", press Enter. Then, on Baidu's homepage, click the search input field, type "北京天气", press Enter. These actions will lead to the weather information for Beijing.
Action: click(point='<point>403 81</point>')

type(content='baidu.com')

hotkey(key='enter')

click(point='<point>403 431</point>')

type(content='北京天气')

hotkey(key='enter')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 403,
                  y: 81,
                },
                referenceBox: {
                  x1: 403,
                  y1: 81,
                  x2: 403,
                  y2: 81,
                },
              },
            },
          },
          {
            type: 'type',
            inputs: {
              content: `baidu.com`,
            },
          },
          {
            type: 'hotkey',
            inputs: {
              key: 'enter',
            },
          },
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 403,
                  y: 431,
                },
                referenceBox: {
                  x1: 403,
                  y1: 431,
                  x2: 403,
                  y2: 431,
                },
              },
            },
          },
          {
            type: 'type',
            inputs: {
              content: `北京天气`,
            },
          },
          {
            type: 'hotkey',
            inputs: {
              key: 'enter',
            },
          },
        ],
        rawActionStrings: [
          `click(point='<point>403 81</point>')`,
          `type(content='baidu.com')`,
          `hotkey(key='enter')`,
          `click(point='<point>403 431</point>')`,
          `type(content='北京天气')`,
          `hotkey(key='enter')`,
        ],
        rawContent: `Thought: To query the weather in Beijing, we need to first navigate to a search engine. Since the task specifies not to use Google but Baidu, the first step is to navigate to Baidu's homepage. Then, we can enter the query. 

First, the current page is Google's homepage, so we need to change the URL to Baidu. The address bar is where we input the new URL. So, click on the address bar, type "baidu.com", and press Enter to go to Baidu. Once on Baidu, we can use the search bar to query Beijing's weather.

So the actions would be: click the address bar, type the URL, press Enter to navigate, then on Baidu's page, click the search bar, type the query, and press Enter. Let's structure these steps.

First, navigate to Baidu: click the address bar, type "baidu.com", press Enter. Then, on Baidu's homepage, click the search input field, type "北京天气", press Enter. These actions will lead to the weather information for Beijing.
Action: click(point='<point>403 81</point>')

type(content='baidu.com')

hotkey(key='enter')

click(point='<point>403 431</point>')

type(content='北京天气')

hotkey(key='enter')`,
        reasoningContent: `To query the weather in Beijing, we need to first navigate to a search engine. Since the task specifies not to use Google but Baidu, the first step is to navigate to Baidu's homepage. Then, we can enter the query. 

First, the current page is Google's homepage, so we need to change the URL to Baidu. The address bar is where we input the new URL. So, click on the address bar, type "baidu.com", and press Enter to go to Baidu. Once on Baidu, we can use the search bar to query Beijing's weather.

So the actions would be: click the address bar, type the URL, press Enter to navigate, then on Baidu's page, click the search bar, type the query, and press Enter. Let's structure these steps.

First, navigate to Baidu: click the address bar, type "baidu.com", press Enter. Then, on Baidu's homepage, click the search input field, type "北京天气", press Enter. These actions will lead to the weather information for Beijing.`,
      });
    });

    it('multiple actions (2)', () => {
      const input = `Thought: Perform multiple actions
Action: click(start_box='<bbox>100 200</bbox>')

type(text='Hello', start_box='<bbox>300 400</bbox>')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 100,
                  y: 200,
                },
                referenceBox: {
                  x1: 100,
                  y1: 200,
                  x2: 100,
                  y2: 200,
                },
              },
            },
          },
          {
            type: 'type',
            inputs: {
              content: 'Hello',
              point: {
                raw: {
                  x: 300,
                  y: 400,
                },
                referenceBox: {
                  x1: 300,
                  y1: 400,
                  x2: 300,
                  y2: 400,
                },
              },
            },
          },
        ],
        rawActionStrings: [
          `click(start_box='<bbox>100 200</bbox>')`,
          `type(text='Hello', start_box='<bbox>300 400</bbox>')`,
        ],
        rawContent: `Thought: Perform multiple actions
Action: click(start_box='<bbox>100 200</bbox>')

type(text='Hello', start_box='<bbox>300 400</bbox>')`,
        reasoningContent: `Perform multiple actions`,
      });
    });

    it('Reflection and Action_Summary and <bbox>', () => {
      const input = `Reflection: This is a reflection
Action_Summary: This is a summary
Action: type(text='Hello', start_box='<bbox>300 400</bbox>')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'type',
            inputs: {
              content: 'Hello',
              point: {
                raw: {
                  x: 300,
                  y: 400,
                },
                referenceBox: {
                  x1: 300,
                  y1: 400,
                  x2: 300,
                  y2: 400,
                },
              },
            },
          },
        ],
        rawActionStrings: [`type(text='Hello', start_box='<bbox>300 400</bbox>')`],
        rawContent: `Reflection: This is a reflection
Action_Summary: This is a summary
Action: type(text='Hello', start_box='<bbox>300 400</bbox>')`,
        reasoningContent: `This is a reflection, This is a summary`,
      });
    });

    it('with [x1, y1, x2, y2]', () => {
      const input = `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='[637,964,637,964]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 637,
                  y: 964,
                },
                referenceBox: {
                  x1: 637,
                  y1: 964,
                  x2: 637,
                  y2: 964,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='[637,964,637,964]')`],
        rawContent: `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='[637,964,637,964]')`,
        reasoningContent: `我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。`,
      });
    });

    it('with [x1, y1, x2, y2] (2)', () => {
      const input = `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='[637,964,637,964]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 637,
                  y: 964,
                },
                referenceBox: {
                  x1: 637,
                  y1: 964,
                  x2: 637,
                  y2: 964,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='[637,964,637,964]')`],
        rawContent: `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='[637,964,637,964]')`,
        reasoningContent: `我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。`,
      });
    });
  });

  // O1 mode tests
  describe('O1 mode', () => {
    it('should correctly parse', () => {
      const input = `<Thought>I need to perform this action</Thought>
Action_Summary: Click and type text
Action: click(start_box='(100,200)')
</Output>`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 100,
                  y: 200,
                },
                referenceBox: {
                  x1: 100,
                  y1: 200,
                  x2: 100,
                  y2: 200,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='(100,200)')`],
        rawContent: `<Thought>I need to perform this action</Thought>
Action_Summary: Click and type text
Action: click(start_box='(100,200)')
</Output>`,
        reasoningContent: `I need to perform this action, Click and type text`,
      });
    });
  });

  // bc mode but new format output tests
  describe('bc mode but hallucination', () => {
    it('<bbox> but no comma', () => {
      const input = `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='<bbox>637 964 637 964</bbox>')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 637,
                  y: 964,
                },
                referenceBox: {
                  x1: 637,
                  y1: 964,
                  x2: 637,
                  y2: 964,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='<bbox>637 964 637 964</bbox>')`],
        rawContent: `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='<bbox>637 964 637 964</bbox>')`,
        reasoningContent: `我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。`,
      });
    });

    it('<think> with Thought:', () => {
      const input = `<think>
Okay, let's see. The user wants to search news, but the current search bar has "hi" in it. First, I need to clear that. The search bar has an 'X' button on the right, so clicking that will remove the existing text. Then, I can type "news" into the search bar. Wait, but maybe after clearing, I should enter the new search term. Let's check the steps again. Clear the search bar, type "news", then press enter or click the search icon. That should initiate a news search. Let's do that step by step.
</think>
Thought: To search for news, first clear the existing text "hi" from the Google search bar by clicking the 'X' icon. Then, type "news" into the search bar and press Enter to perform the search. This will display news-related results.
Action: click(point='<point>510 150</point>')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 510,
                  y: 150,
                },
                referenceBox: {
                  x1: 510,
                  y1: 150,
                  x2: 510,
                  y2: 150,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(point='<point>510 150</point>')`],
        rawContent: `<think>
Okay, let's see. The user wants to search news, but the current search bar has "hi" in it. First, I need to clear that. The search bar has an 'X' button on the right, so clicking that will remove the existing text. Then, I can type "news" into the search bar. Wait, but maybe after clearing, I should enter the new search term. Let's check the steps again. Clear the search bar, type "news", then press enter or click the search icon. That should initiate a news search. Let's do that step by step.
</think>
Thought: To search for news, first clear the existing text "hi" from the Google search bar by clicking the 'X' icon. Then, type "news" into the search bar and press Enter to perform the search. This will display news-related results.
Action: click(point='<point>510 150</point>')`,
        reasoningContent: `To search for news, first clear the existing text "hi" from the Google search bar by clicking the 'X' icon. Then, type "news" into the search bar and press Enter to perform the search. This will display news-related results.`,
      });
    });
  });

  describe('Box coordinates', () => {
    it('with start_box', () => {
      const input = `Thought: I need to click on this element
Action: click(start_box='[130,226]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 130,
                  y: 226,
                },
                referenceBox: {
                  x1: 130,
                  y1: 226,
                  x2: 130,
                  y2: 226,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='[130,226]')`],
        rawContent: `Thought: I need to click on this element
Action: click(start_box='[130,226]')`,
        reasoningContent: `I need to click on this element`,
      });
    });

    it('with end_box', () => {
      const input = `Thought: I need to click on this element
Action: click(end_box='[130,226]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              end: {
                raw: {
                  x: 130,
                  y: 226,
                },
                referenceBox: {
                  x1: 130,
                  y1: 226,
                  x2: 130,
                  y2: 226,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(end_box='[130,226]')`],
        rawContent: `Thought: I need to click on this element
Action: click(end_box='[130,226]')`,
        reasoningContent: `I need to click on this element`,
      });
    });

    it('both start_box and end_box', () => {
      const input = `Thought: I need to click on this element
Action: drag(start_box='[130,226]', end_box='[200,226]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'drag',
            inputs: {
              start: {
                raw: {
                  x: 130,
                  y: 226,
                },
                referenceBox: {
                  x1: 130,
                  y1: 226,
                  x2: 130,
                  y2: 226,
                },
              },
              end: {
                raw: {
                  x: 200,
                  y: 226,
                },
                referenceBox: {
                  x1: 200,
                  y1: 226,
                  x2: 200,
                  y2: 226,
                },
              },
            },
          },
        ],
        rawActionStrings: [`drag(start_box='[130,226]', end_box='[200,226]')`],
        rawContent: `Thought: I need to click on this element
Action: drag(start_box='[130,226]', end_box='[200,226]')`,
        reasoningContent: `I need to click on this element`,
      });
    });

    it('with four coordinates', () => {
      const input = `Thought: I need to click on this element
Action: click(start_box='[348, 333, 928, 365]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 638,
                  y: 349,
                },
                referenceBox: {
                  x1: 348,
                  y1: 333,
                  x2: 928,
                  y2: 365,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='[348, 333, 928, 365]')`],
        rawContent: `Thought: I need to click on this element
Action: click(start_box='[348, 333, 928, 365]')`,
        reasoningContent: `I need to click on this element`,
      });
    });

    it('with four coordinates (2)', () => {
      const input = `Thought: I need to click on this element in the browser
Action: click(start_box='[287, 111, 313, 124]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 300,
                  y: 117.5,
                },
                referenceBox: {
                  x1: 287,
                  y1: 111,
                  x2: 313,
                  y2: 124,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='[287, 111, 313, 124]')`],
        rawContent: `Thought: I need to click on this element in the browser
Action: click(start_box='[287, 111, 313, 124]')`,
        reasoningContent: `I need to click on this element in the browser`,
      });
    });

    it(' zero coordinates', () => {
      const input = `Thought: I need to click on the start button
Action: click(start_box='[0, 964, 10, 984]')`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 5,
                  y: 974,
                },
                referenceBox: {
                  x1: 0,
                  y1: 964,
                  x2: 10,
                  y2: 984,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(start_box='[0, 964, 10, 984]')`],
        rawContent: `Thought: I need to click on the start button
Action: click(start_box='[0, 964, 10, 984]')`,
        reasoningContent: `I need to click on the start button`,
      });
    });
  });

  describe('omni format', () => {
    it('with think_never_used_51bce0c785ca2f68081bfa7d91973934', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<computer_env>
Action: click(point='<point>400 435</point>')
</computer_env>`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 400,
                  y: 435,
                },
                referenceBox: {
                  x1: 400,
                  y1: 435,
                  x2: 400,
                  y2: 435,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(point='<point>400 435</point>')`],
        rawContent: `<think_never_used_51bce0c785ca2f68081bfa7d91973934>Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<computer_env>
Action: click(point='<point>400 435</point>')
</computer_env>`,
        reasoningContent: `Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.`,
      });
    });

    it('with think', () => {
      const input = `<think>Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.</think>
<computer_env>
Action: click(point='<point>400 435</point>')
</computer_env>`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 400,
                  y: 435,
                },
                referenceBox: {
                  x1: 400,
                  y1: 435,
                  x2: 400,
                  y2: 435,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(point='<point>400 435</point>')`],
        rawContent: `<think>Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.</think>
<computer_env>
Action: click(point='<point>400 435</point>')
</computer_env>`,
        reasoningContent: `Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.`,
      });
    });

    it('with think_xxx', () => {
      const input = `<think_xxx>Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.</think_xxx>
<computer_env>
Action: click(point='<point>400 435</point>')
</computer_env>`;

      const result = actionParser.parsePrediction(input);

      expect(result).toEqual({
        actions: [
          {
            type: 'click',
            inputs: {
              point: {
                raw: {
                  x: 400,
                  y: 435,
                },
                referenceBox: {
                  x1: 400,
                  y1: 435,
                  x2: 400,
                  y2: 435,
                },
              },
            },
          },
        ],
        rawActionStrings: [`click(point='<point>400 435</point>')`],
        rawContent: `<think_xxx>Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.</think_xxx>
<computer_env>
Action: click(point='<point>400 435</point>')
</computer_env>`,
        reasoningContent: `Hmm, the previous action didn't work. Let's check again. The Google search page is open, and the search box is where we need to input. Wait, maybe the search box wasn't properly focused? Let me click on the search box first to make sure it's active, then type "UI TARS". That should work. So first, click the search input field, then type the query.`,
      });
    });
  });

  describe('XML format', () => {
    it('(19)', () => {
      const input = `<thinkt>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如<point>500 500</point>。这样就能完成向上滚动的操作了。</thinkt>
<seed:tool_call>
<function=scroll>
<parameter=direction>up</parameter>
<parameter=point><point>500 500</point></parameter>
</function>
<function=type>
<parameter=content>hello</parameter>
<parameter=point><point>200 126</point></parameter>
</function>
<function=wait>
</function>
</seed:tool_call>`;
      const result = actionParser.parsePrediction(input);
      expect(result).toEqual({
        actions: [
          {
            inputs: {
              direction: 'up',
              point: {
                raw: {
                  x: 500,
                  y: 500,
                },
                referenceBox: {
                  x1: 500,
                  x2: 500,
                  y1: 500,
                  y2: 500,
                },
              },
            },
            type: 'scroll',
          },
          {
            inputs: {
              content: 'hello',
              point: {
                raw: {
                  x: 200,
                  y: 126,
                },
                referenceBox: {
                  x1: 200,
                  x2: 200,
                  y1: 126,
                  y2: 126,
                },
              },
            },
            type: 'type',
          },
          {
            inputs: {},
            type: 'wait',
          },
        ],
        rawActionStrings: [
          "scroll(direction='up', point='(500, 500)')",
          "type(content='hello', point='(200, 126)')",
          'wait()',
        ],
        rawContent: `<thinkt>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如<point>500 500</point>。这样就能完成向上滚动的操作了。</thinkt>
<seed:tool_call>
<function=scroll>
<parameter=direction>up</parameter>
<parameter=point><point>500 500</point></parameter>
</function>
<function=type>
<parameter=content>hello</parameter>
<parameter=point><point>200 126</point></parameter>
</function>
<function=wait>
</function>
</seed:tool_call>`,
        reasoningContent:
          '<point>500 500</point>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如。这样就能完成向上滚动的操作了。',
      });
    });
  });
});
