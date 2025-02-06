/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { test, expect } from 'vitest';
import { setOfMarksOverlays } from './setOfMarks';
// import { sleep } from '@ui-tars/shared/utils';

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
        width: 2560,
        height: 1440,
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
