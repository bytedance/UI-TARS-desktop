/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { test, expect, describe } from 'vitest';
import { escapeHtml, setOfMarksOverlays } from './setOfMarks';

const testMakeScreenMarker = () => {
  let xPos;
  let yPos;
  const actions = [
    {
      action_type: 'double_click',
      action_inputs: {
        start_box: '[0.1171875,0.20833333,0.1171875,0.20833333]',
      },
      reflection: 'reflection',
      thought: 'thought',
    },
    {
      action_type: 'type',
      action_inputs: {
        content: 'Hello, world!',
      },
      reflection: 'reflection',
      thought: 'thought',
    },
    {
      action_type: 'drag',
      action_inputs: {
        start_box: '[0.1171875,0.20833333,0.1171875,0.20833333]',
        end_box: '[0.175,0.647,0.175,0.647]',
      },
      reflection: 'reflection',
      thought: 'thought',
    },
    {
      reflection: '',
      thought:
        '我已经在搜索框中输入了"杭州天气"，但还需要按下回车键来执行搜索。现在需要按下回车键来提交搜索请求，这样就能看到杭州的天气信息。',
      action_type: 'hotkey',
      action_inputs: { key: 'ctrl enter' },
    },
    {
      reflection: '',
      thought:
        'To narrow down the search results to cat litters within the specified price range of $18 to $32, I need to adjust the price filter. The next logical step is to drag the left handle of the price slider to set the minimum price to $18, ensuring that only products within the desired range are displayed.\n' +
        'Drag the left handle of the price slider to set the minimum price to $18.',
      action_type: 'drag',
      action_inputs: {
        start_box: '[0.072,0.646,0.072,0.646]',
        end_box: '[0.175,0.647,0.175,0.647]',
      },
    },
    {
      reflection: null,
      thought:
        '我看到桌面上有Google Chrome的图标，要完成打开Chrome的任务，我需要双击该图标。在之前的操作中，我已经双击了Chrome图标，但是页面没有发生变化，我应该等待一段时间，等待页面加载完成。',
      action_type: 'wait',
      action_inputs: {},
    },
  ];
  for (const action of actions) {
    const { overlays } = setOfMarksOverlays({
      predictions: [action],
      screenshotContext: {
        size: {
          width: 2560,
          height: 1440,
        },
        scaleFactor: 1,
      },
      xPos,
      yPos,
    });
    console.log('overlays', overlays);
    // for (let i = 0; i < overlays.length; i++) {
    //       const overlay = overlays[i];
    //       const currentOverlay = new BrowserWindow({
    //         width: overlay.boxWidth || 200,
    //         height: overlay.boxHeight || 200,
    //         transparent: true,
    //         frame: false,
    //         alwaysOnTop: true,
    //         skipTaskbar: true,
    //         focusable: false,
    //         hasShadow: false,
    //         thickFrame: false,
    //         paintWhenInitiallyHidden: true,
    //         type: 'panel',
    //         webPreferences: {
    //           nodeIntegration: true,
    //           contextIsolation: false,
    //         },
    //       });
    //       currentOverlay.webContents.openDevTools();
    //       if (overlay.xPos && overlay.yPos && overlay.svg) {
    //         currentOverlay.setPosition(
    //           overlay.xPos + overlay.offsetX,
    //           overlay.yPos + overlay.offsetY,
    //         );
    //         xPos = overlay.xPos;
    //         yPos = overlay.yPos;
    //         currentOverlay.loadURL(`data:text/html;charset=UTF-8,
    // <html>
    // <head>
    //   <style>
    //     html, body {
    //       background: transparent;
    //       margin: 0;
    //       padding: 0;
    //       overflow: hidden;
    //       width: 100%;
    //       height: 100%;
    //     }
    //   </style>
    // </head>
    // <body>
    //   ${overlay.svg}
    // </body>
    // </html>
    // `);
    //       }
    //       await sleep(1000);
    //       currentOverlay.close();
    // }
  }
};

test('not throw error', () => {
  expect(() => testMakeScreenMarker()).not.toThrow();
});

describe('escapeHtml', () => {
  test('escapes the five HTML metacharacters', () => {
    expect(escapeHtml(`& < > " '`)).toBe(`&amp; &lt; &gt; &quot; &#39;`);
  });

  test('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  test('coerces non-strings via String(...)', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(true)).toBe('true');
  });
});

describe('setOfMarksOverlays — prompt-injection regression', () => {
  const screenshotContext = {
    size: { width: 2560, height: 1440 },
    scaleFactor: 1,
  };

  // Reproduces the payload from the public 1-click RCE PoC.
  const rcePayload =
    '</text></svg><script>require("node:child_process").exec("open -a Calculator")</script><svg><text>';

  test('escapes malicious type() content so <script> cannot escape the SVG text node', () => {
    const { overlays } = setOfMarksOverlays({
      predictions: [
        {
          action_type: 'type',
          action_inputs: { content: rcePayload },
          reflection: null,
          thought: '',
        },
      ],
      screenshotContext,
      xPos: 100,
      yPos: 100,
    });

    expect(overlays).toHaveLength(1);
    const { svg } = overlays[0];
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('</text></svg>');
    expect(svg).not.toContain('require(');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&lt;/text&gt;&lt;/svg&gt;');
  });

  test('escapes malicious hotkey key strings', () => {
    const { overlays } = setOfMarksOverlays({
      predictions: [
        {
          action_type: 'hotkey',
          action_inputs: { key: '"><script>alert(1)</script>' },
          reflection: null,
          thought: '',
        },
      ],
      screenshotContext,
    });

    const { svg } = overlays[0];
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&quot;');
  });

  test('escapes a malicious action_type in default branch overlays', () => {
    const { overlays } = setOfMarksOverlays({
      predictions: [
        {
          action_type: 'wait</text><script>1</script>',
          action_inputs: {},
          reflection: null,
          thought: '',
        },
      ],
      screenshotContext,
    });

    const { svg } = overlays[0];
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  test('escapes a malicious action_type in click overlays', () => {
    const { overlays } = setOfMarksOverlays({
      predictions: [
        {
          action_type: 'click<script>1</script>',
          action_inputs: {
            start_box: '[0.1171875,0.20833333,0.1171875,0.20833333]',
          },
          reflection: null,
          thought: '',
        } as unknown as Parameters<
          typeof setOfMarksOverlays
        >[0]['predictions'][number],
      ],
      screenshotContext,
    });

    if (overlays.length === 0) return;
    const { svg } = overlays[0];
    expect(svg).not.toContain('<script>');
  });

  test('keeps benign content untouched apart from HTML metas', () => {
    const { overlays } = setOfMarksOverlays({
      predictions: [
        {
          action_type: 'type',
          action_inputs: { content: 'Hello, world!' },
          reflection: null,
          thought: '',
        },
      ],
      screenshotContext,
    });

    expect(overlays[0].svg).toContain('Typing: "Hello, world!"');
  });
});
