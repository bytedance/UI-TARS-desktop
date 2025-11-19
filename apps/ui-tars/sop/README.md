# SOP (标准操作程序) 系统

## 概述

SOP 系统允许将常见的任务步骤预先录制并存储为标准操作程序，当用户执行相同任务时，可以直接使用这些预定义的步骤，而无需每一回合都调用模型来返回动作。这样可以显著提升执行常见任务的速度。

## 文件结构

```
sop/
├── README.md              # 本文件
├── table_of_contents.md   # SOP 索引文件
├── sys_setting.md         # 开启勿扰模式的 SOP
└── open_calculator.md     # 打开计算器的 SOP
```

## SOP 文件格式

每个 SOP 文件都遵循以下格式：

```markdown
---
title: "任务标题"
description: "任务描述"
user_instruction: "用户指令"
---

# 任务标题

## 步骤
1. 步骤描述
2. 步骤描述
...

## 动作序列
```json
[
  {
    "reflection": null,
    "thought": "思考过程",
    "action_type": "动作类型",
    "action_inputs": {
      "参数名": "参数值"
    }
  },
  ...
]
```

## 支持的动作类型

1. **hotkey**: 按下组合键
   ```json
   {
     "action_type": "hotkey",
     "action_inputs": {
       "key": "cmd space"
     }
   }
   ```

2. **type**: 输入文本
   ```json
   {
     "action_type": "type",
     "action_inputs": {
       "content": "要输入的文本"
     }
   }
   ```

3. **click**: 点击屏幕位置
   ```json
   {
     "action_type": "click",
     "action_inputs": {
       "start_box": "[x1,y1,x2,y2]",
       "start_coords": [x, y]
     }
   }
   ```

## 添加新的 SOP

1. 创建新的 SOP 文件，遵循上述格式
2. 在 `table_of_contents.md` 中添加新 SOP 的索引信息
3. 确保 SOP 文件中的动作序列正确无误

## 索引文件格式

`table_of_contents.md` 文件包含所有 SOP 的索引信息：

```json
{
  "sops": [
    {
      "user_instruction": "用户指令",
      "file_path": "文件路径",
      "title": "SOP 标题",
      "description": "SOP 描述"
    },
    ...
  ]
}
```

## 工作原理

1. 当用户提交指令时，系统首先检查是否有匹配的 SOP
2. 如果找到匹配的 SOP，系统会按照 SOP 中定义的动作序列执行
3. 每个动作之间会等待 1000ms
4. 执行完所有 SOP 动作后，系统会截图并调用模型判断任务是否完成
5. 如果任务未完成，系统会继续使用常规模式让模型一步步执行

## 注意事项

1. SOP 中的坐标和区域可能因屏幕分辨率和系统版本而异
2. 建议为不同的系统环境创建不同的 SOP
3. SOP 执行失败时，系统会自动回退到常规模式
4. SOP 适用于固定步骤的常见任务，不适用于需要动态决策的复杂任务
