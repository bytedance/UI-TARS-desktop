/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { XMLFormatParser } from '../src/FomatParsers';

const logger = new ConsoleLogger('[XML]', LogLevel.DEBUG);

function testParser(input: string) {
  const parser = new XMLParser();
  const object = parser.parse(input);
  for (const [key, value] of Object.entries(object)) {
    if (key === 'seed:tool_call') {
      logger.debug('[XML] seed:tool_call value:', JSON.stringify(value));
    }
  }
  return object;
}

function testBuilder(input: unknown) {
  const builder = new XMLBuilder();
  const xml = builder.build(input);
  logger.debug('[XLMBuiler] result:', xml);
  return xml;
}

describe('xml parser', () => {
  // it('(0)', () => {
  //   const input = null;
  //   const result = test(input);
  //   expect(result).toEqual({});
  // });

  it('(1.1)', () => {
    const input = ``;
    const result = testParser(input);
    expect(result).toEqual({});
  });

  it('(1.2)', () => {
    const input = `Thought: I need to click on this element
Action: click(start_box='')`;
    const result = testParser(input);
    expect(result).toEqual({});
  });

  it('(1.3)', () => {
    const input = `<think>The user is asking about "Agent TARS". I need to search for information about this. First, I should open a web browser to search for this information. Since I'm in a computer environment, I'll start by opening the computer and then navigating to a search engine.</think>
<computer_env>
Action: open_computer()
</computer_env>`;
    const result = testParser(input);
    expect(result).toEqual({
      computer_env: 'Action: open_computer()',
      think: `The user is asking about "Agent TARS". I need to search for information about this. First, I should open a web browser to search for this information. Since I'm in a computer environment, I'll start by opening the computer and then navigating to a search engine.`,
    });
  });

  it('(1.4)', () => {
    const input = `<think>The user is asking for the answer to 1+1. This is a simple arithmetic question. The answer is 2. I should provide this directly as it doesn't require any computer interaction.</think>
<answer>
The answer to 1+1 is 2.
</answer>`;
    const result = testParser(input);
    expect(result).toEqual({
      answer: 'The answer to 1+1 is 2.',
      think: `The user is asking for the answer to 1+1. This is a simple arithmetic question. The answer is 2. I should provide this directly as it doesn't require any computer interaction.`,
    });
  });

  it('(1.5)', () => {
    const input = `<Thought>I need to perform this action</Thought>
Action_Summary: Click and type text
Action: click(start_box='(100,200)')
</Output>`;
    const result = testParser(input);
    expect(result).toEqual({
      '#text': "Action_Summary: Click and type text\nAction: click(start_box='(100,200)')",
      Thought: 'I need to perform this action',
    });
  });

  it('(1.6)', () => {
    const input = `Thought: 我看到当前屏幕显示的是一个电子表格软件和一个聊天窗口，而任务要求我需要在浏览器中搜索北京明天天气。我需要先点击任务栏上的浏览器图标来启动浏览器。
Action: click(start_box='<bbox>637 964 637 964</bbox>')`;
    const result = testParser(input);
    expect(result).toEqual({
      bbox: '637 964 637 964',
    });
  });

  it('(3)', () => {
    const input = `<thinkt>To find shrimp and crab recipes, I'll first open the web browser to search for relevant recipes. The browser icon is typically located in the taskbar or applications menu. I'll click on the browser icon to launch it and then proceed to search for shrimp and crab recipes.</thinkt><seed:tool_call>
<function=click>
<parameter=point><point>17 58</point></parameter>
</function>
</seed:tool_call>`;
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': {
        'function=click': {
          'parameter=point': {
            point: '17 58',
          },
        },
      },
      thinkt:
        "To find shrimp and crab recipes, I'll first open the web browser to search for relevant recipes. The browser icon is typically located in the taskbar or applications menu. I'll click on the browser icon to launch it and then proceed to search for shrimp and crab recipes.",
    });
  });

  it('(4)', () => {
    const input = `<thinkt>The search bar is now active, so I'll type "shrimp and crab recipes" into it to find relevant recipes. This query should return a variety of results, including websites like Allrecipes, Food Network, and Epicurious, which are known for reliable recipes.</thinkt><seed:tool_call>
<function=type>
<parameter=content>shrimp and crab recipes</parameter>
</function>
</seed:tool_call>`;
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': {
        'function=type': {
          'parameter=content': 'shrimp and crab recipes',
        },
      },
      thinkt:
        'The search bar is now active, so I\'ll type "shrimp and crab recipes" into it to find relevant recipes. This query should return a variety of results, including websites like Allrecipes, Food Network, and Epicurious, which are known for reliable recipes.',
    });
  });

  it('(7)', () => {
    const input = `<think_never_used>用户想要用GUI Action查一下天气，我来想一想该做哪些步骤，首先要打开浏览器，然后在搜索框中输入“天气”，最后查看搜索结果，就能完成任务啦。没错就这么办，第一步我要先打开浏览器，得从桌面上找找，在这呢~找到了浏览器图标，我现在就双击打开它吧！</think_never_used><seed:tool_call>
<function=left_double>
<parameter=point><point>18 58</point></parameter>
</function>
</seed:tool_call>`;
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': {
        'function=left_double': {
          'parameter=point': {
            point: '18 58',
          },
        },
      },
      think_never_used:
        '用户想要用GUI Action查一下天气，我来想一想该做哪些步骤，首先要打开浏览器，然后在搜索框中输入“天气”，最后查看搜索结果，就能完成任务啦。没错就这么办，第一步我要先打开浏览器，得从桌面上找找，在这呢~找到了浏览器图标，我现在就双击打开它吧！',
    });
  });

  it('(8)', () => {
    const input = `<thinkt>用户想要输出一个wait gui action，不要带任何参数。</thinkt><seed:tool_call>
<function=wait>
</function>
</seed:tool_call>`;
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': {
        'function=wait': '',
      },
      thinkt: '用户想要输出一个wait gui action，不要带任何参数。',
    });
  });

  it('(9)', () => {
    const input = `<thinkt>No funtion</thinkt><seed:tool_call>
</seed:tool_call>`;
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': '',
      thinkt: 'No funtion',
    });
  });

  it('(10)', () => {
    const input = `<thinkt>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如<point>500 500</point>。这样就能完成向上滚动的操作了。</thinkt><seed:tool_call>
<function=scroll>
<parameter=direction>up</parameter>
<parameter=point><point>500 500</point></parameter>
</function>
</seed:tool_call>`;
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': {
        'function=scroll': {
          'parameter=direction': 'up',
          'parameter=point': {
            point: '500 500',
          },
        },
      },
      thinkt: {
        '#text':
          '需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如。这样就能完成向上滚动的操作了。',
        point: '500 500',
      },
    });
  });

  it('(11)', () => {
    const input = `up`;
    const result = testBuilder(input);
    expect(result).toEqual('<0>u</0><1>p</1>');
  });

  it('(12)', () => {
    const input = { point: '500 500' };
    const result = testBuilder(input);
    expect(result).toEqual('<point>500 500</point>');
  });

  it('(13)', () => {
    const a = {
      direction: 'up',
      point: '500 500',
    };
    const b = {
      name: 'scroll',
      inputs: JSON.stringify(a),
    };
    expect(JSON.stringify(b)).toEqual(
      '{"name":"scroll","inputs":"{\\"direction\\":\\"up\\",\\"point\\":\\"500 500\\"}"}',
    );
  });

  it('(14)', () => {
    const a = '{"name":"scroll","inputs":"{\\"direction\\":\\"up\\",\\"point\\":\\"500 500\\"}"}';
    const b = JSON.parse(a);
    expect(b).toEqual({
      name: 'scroll',
      inputs: '{"direction":"up","point":"500 500"}',
    });
    const c = b.inputs;
    const d = JSON.parse(c);
    expect(d).toEqual({
      direction: 'up',
      point: '500 500',
    });
  });

  it('(15)', () => {
    const input = `<thinkt>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如<point>500 500</point>。这样就能完成向上滚动的操作了。</thinkt>
<seed:tool_call>
<function name='scroll'>
<parameter name='direction'>up</parameter>
<parameter name='point'>500 500</parameter>
</function>
</seed:tool_call>`;
    const parser = new XMLParser();
    const object = parser.parse(input);
    expect(object).toEqual({
      'seed:tool_call': {
        function: {
          parameter: ['up', '500 500'],
        },
      },
      thinkt: {
        '#text':
          '需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如。这样就能完成向上滚动的操作了。',
        point: '500 500',
      },
    });
  });

  it('(16) should parse XML with namespace correctly', () => {
    const input = `<seed:tool_call>
<function name='scroll'>
<parameter name='direction'>up</parameter>
<parameter name='point'>500 500</parameter>
</function>
</seed:tool_call>`;
    const parser = new XMLParser({
      ignoreAttributes: false,
    });
    const object = parser.parse(input);
    expect(object).toEqual({
      'seed:tool_call': {
        function: {
          '@_name': 'scroll',
          parameter: [
            {
              '#text': 'up',
              '@_name': 'direction',
            },
            {
              '#text': '500 500',
              '@_name': 'point',
            },
          ],
        },
      },
    });
  });

  it('(17) should parse XML with namespace correctly', () => {
    const input = `<seed:tool_call>
<function>
<name>scroll</name>
<parameter>
<direction>up</direction>
<point>500 500</point>
</parameter>
</function>
</seed:tool_call>`;
    const parser = new XMLParser({
      ignoreAttributes: false,
    });
    const object = parser.parse(input);
    expect(object).toEqual({
      'seed:tool_call': {
        function: {
          name: 'scroll',
          parameter: {
            direction: 'up',
            point: '500 500',
          },
        },
      },
    });
  });

  it('(18)', () => {
    const input = `<thinkt>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如<point>500 500</point>。这样就能完成向上滚动的操作了。</thinkt><seed:tool_call>
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
    const result = testParser(input);
    expect(result).toEqual({
      'seed:tool_call': {
        'function=scroll': {
          'parameter=direction': 'up',
          'parameter=point': {
            point: '500 500',
          },
        },
        'function=type': {
          'parameter=content': 'hello',
          'parameter=point': {
            point: '200 126',
          },
        },
        'function=wait': '',
      },
      thinkt: {
        '#text':
          '需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如。这样就能完成向上滚动的操作了。',
        point: '500 500',
      },
    });
  });

  it('(19)', () => {
    const input = `<thinkt>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如<point>500 500</point>。这样就能完成向上滚动的操作了。</thinkt><seed:tool_call>
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
    const parser = new XMLFormatParser(logger);
    const result = parser.parse(input);
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
        "scroll(point='(500, 500)', direction='up')",
        "type(content='hello')",
        'wait()',
      ],
      reasoningContent:
        '<point>500 500</point>需要模拟向上滚动的动作，使用scroll工具，direction设为up，point可以随便选一个页面内的坐标，比如。这样就能完成向上滚动的操作了。',
    });
  });
});
