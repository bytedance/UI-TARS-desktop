---
title: "打开计算器"
description: "在 macOS 系统上打开计算器应用"
user_instruction: "打开计算器"
---

# 打开计算器

## 步骤
1. 使用 Spotlight 搜索"计算器"
2. 点击计算器应用

## 动作序列
```json
[
  {
    "reflection": null,
    "thought": "用户需要打开计算器应用，首先得用Spotlight搜索。Mac上Spotlight的快捷键是Command+Space，所以先按这个组合键打开Spotlight搜索框，然后输入"计算器"来搜索相关应用。这样就能找到计算器应用，后续点击打开。",
    "action_type": "hotkey",
    "action_inputs": {
      "key": "cmd space"
    }
  },
  {
    "reflection": null,
    "thought": "现在Spotlight搜索框已经打开，接下来需要在搜索框中输入"计算器"来查找相关应用。搜索框处于激活状态，直接输入文字即可，这样就能定位到计算器应用，为后续点击打开做准备。",
    "action_type": "type",
    "action_inputs": {
      "content": "计算器"
    }
  },
  {
    "reflection": null,
    "thought": "现在Spotlight搜索结果中显示了计算器应用，需要点击这个应用来打开计算器。这样就能完成用户的指令要求。",
    "action_type": "click",
    "action_inputs": {
      "start_box": "[0.5,0.3,0.7,0.4]",
      "start_coords": [600, 300]
    }
  }
]
```
