---
title: "开启勿扰模式"
description: "在 macOS 系统上开启勿扰模式"
user_instruction: "开启勿扰模式"
---

# 开启勿扰模式

## 步骤
1. 使用 Spotlight 搜索"勿扰模式"
2. 点击勿扰模式开关

## 动作序列
```json
[
  {
    "reflection": null,
    "thought": "用户需要开启勿扰模式，首先得用Spotlight搜索。Mac上Spotlight的快捷键是Command+Space，所以先按这个组合键打开Spotlight搜索框，然后输入勿扰模式来搜索相关设置。这样就能找到系统设置里的勿扰模式选项，后续开启开关。",
    "action_type": "hotkey",
    "action_inputs": {
      "key": "cmd space"
    }
  },
  {
    "reflection": null,
    "thought": "需要先清空Spotlight里的文字。按Delete键删除现有内容，然后输入勿扰模式来搜索。这样才能找到正确的系统设置选项。",
    "action_type": "hotkey",
    "action_inputs": {
      "key": "delete"
    }
  },
  {
    "reflection": null,
    "thought": "现在Spotlight搜索框已经打开，接下来需要在搜索框中输入\"勿扰模式\"来查找相关设置。搜索框处于激活状态，直接输入文字即可，这样就能定位到系统设置中的勿扰模式选项，为后续开启开关做准备。",
    "action_type": "type",
    "action_inputs": {
      "content": "勿扰模式"
    }
  },
  {
    "reflection": null,
    "thought": "现在Spotlight搜索结果中显示了勿扰模式的开关选项，开关当前是关闭状态（灰色）。需要点击这个开关来开启勿扰模式，使其变为蓝色（开启状态）。这样就能完成用户的指令要求。",
    "action_type": "click",
    "action_inputs": {
      "start_box": "[0.666,0.293,0.684,0.312]",
      "start_coords": [694.575, 202.373]
    }
  }
]
```