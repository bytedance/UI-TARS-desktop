---
title: "调高亮度"
description: "在 macOS 系统上调高屏幕亮度"
user_instruction: "调高亮度"
---

# 调高亮度

## 步骤
1. 点击屏幕右上角亮度控制区域
2. 拖动音量滑块

## 动作序列
```json
[
  {
    "reflection": null,
    "thought": "用户需要调高屏幕亮度，在Mac系统中，屏幕亮度控制通常位于屏幕右上角的菜单栏区域。通过点击右上角控制中心图标，可以直接访问亮度控制滑块，从而调高屏幕亮度。",
    "action_type": "click",
    "action_inputs": {
      "start_coords": [1296, 18],
      "start_box": "[0.882,0.019,0.882,0.019]"
    }
  },
  {
    "reflection": null,
    "thought": "现在已经打开了控制中心菜单，看到在显示器下方是亮度调节滑块。要调高屏幕亮度，需要将滑块向右拖动。观察当前滑块位置，向右拖动可以增加亮度。所以下一步是用鼠标拖动亮度滑块，向右移动以调高亮度。",
    "action_type": "drag",
    "action_inputs": {
      "start_coords": [1325.236, 241.175],
      "start_box": "[0.902,0.252,0.902,0.252]",
      "end_coords": [1439.5, 235.5],
      "end_box": "[0.979,0.246,0.979,0.246]"
    }
  },
  {
      "reflection":null,
      "thought":"当前亮度已经被提高，现在状态符合要求，因此任务已完成，无需进一步操作。",
      "action_type":"finished",
      "action_inputs":{
         "content":"已为你调高屏幕亮度，任务完成。"
      }
   }
]
```
