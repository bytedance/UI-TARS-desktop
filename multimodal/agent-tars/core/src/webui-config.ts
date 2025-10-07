/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentWebUIImplementation } from '@agent-tars/interface';

/**
 * Default Agent UI Configuration for Agent TARS
 */
export const AGENT_TARS_WEBUI_CONFIG: AgentWebUIImplementation = {
  logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
  title: 'Agent TARS',
  subtitle: 'Offering seamless integration with a wide range of real-world tools.',
  welcomTitle: 'A multimodal AI agent',
  welcomePrompts: [],
  welcomeCards: [
    {
      title: 'Search for the latest GUI Agent papers',
      category: 'Research',
      prompt: 'Search for the latest GUI Agent papers',
      image:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center',
    },
    {
      title: 'Find information about UI TARS',
      category: 'Research',
      prompt: 'Find information about UI TARS',
      image:
        'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=300&fit=crop&crop=center',
    },
    {
      title: 'Tell me the top 5 most popular projects on ProductHunt today',
      category: 'Research',
      prompt: 'Tell me the top 5 most popular projects on ProductHunt today',
      image:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&crop=center',
    },
    {
      title: 'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
      category: 'AI Browser',
      prompt: 'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
      image:
        'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop&crop=center',
    },
    {
      title: 'Analyze Google Network Request',
      category: 'CodeAct',
      prompt: 'Use command to help me analyze the network request line of google.com',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/analyze-google-network-request-ea86c5.jpg',
    },
    {
      title: 'Use Remote Feat Agent Api Branch',
      category: 'CodeAct',
      prompt: '直接直接使用远程的  feat/agent-respnse-api 分支',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/featagent-respnse-api-3e7e29.jpg',
    },
    {
      title: 'Research on CLI Parameters of Claude Code and Gemini',
      category: 'Research',
      prompt:
        '帮我调研一下，claude code 和 gemini 使用 cli 直接运行，输入 prompt 的 cli 参数是什么？',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/claude-code-gemini-cli-d3fbf7.jpg',
    },
    {
      title: 'Query Website Filings On MIIT',
      category: 'AI Browser',
      prompt:
        '帮我打开 https://beian.miit.gov.cn/#/Integrated/recordQuery 查看以下网站的备案\r\n\r\n- https://www.bytedance.com\r\n- https://www.douyin.com\r\n- http://toutiao.com/\r\n\r\n整理成表格发给我，注意每次切换 website 要清空输入框',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/httpsbeianmiitgovcnintegratedrecordquery-httpswwwbytedancec-120388.jpg',
    },
    {
      title: "Draw Chart of Hangzhou's Weather",
      category: 'MCP',
      prompt: "Draw me a chart of Hangzhou's weather for one month",
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/draw-me-a-chart-34bc8d.jpg',
    },
    {
      title: 'How To Fix Git Process Error',
      category: 'CodeAct',
      prompt:
        "如何修复这个报错：Another git process seems to be running in this repository, e.g.\r\nan editor opened by 'git commit'. Please make sure all processes\r\nare terminated then try again. If it still fails, a git process\r\nmay have crashed in this repository earlier:\r\nremove the file manually to continue.\r\nerror: Unable to create '/Users/chenhaoli/workspace/code/UI-TARS-desktop/.git/logs/refs/remotes/origin/release/v0.2.0-beta.1.lock': File exists.",
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/another-git-process-seems-b6495e.jpg',
    },
    {
      title: 'In-depth Research on ByteDance Web Infra',
      category: 'Research',
      prompt:
        '帮我深度调研一下 ByteDance Web Infra，给出一份详细的调研报告\r\n\r\n我期待覆盖的信息： \r\n\r\n1. 团队介绍\r\n2. 主要的开源项目、贡献者；\r\n3. 应用场景； \r\n4. 项目活跃状态；\r\n5. 社区影响力；\r\n6. 技术蓝图；\r\n7. 你的思考；\r\n\r\n要求报告采用 Markdown 输出中文，最后写入文件，同时，并使用 HTML 绘制一个图文并茂的 Slide，介绍 ByteDance Web Infra',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/bytedance-web-infra-1-002133.jpg',
    },
    {
      title: 'Agent TARS Showcase UI Recreation',
      category: 'AI Coding',
      prompt: 'Write code to completely recreate this UI',
      image:
        'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop&crop=center',
    },
    {
      title: 'Design Neo - Brutalism Poster For Agent TARS',
      category: 'AI Coding',
      prompt:
        '设计一款符合 neo-brutalism 设计风格的海报\r\n\r\n- 主题：Agent TARS\r\n- 标语：开源多模态 AI Agent\r\n- 图标：https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png\r\n- 醒目的 CTA：https://agent-tars.com',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/neo-brutalism-poster-agent-bfa30c.jpg',
    },
    {
      title: 'Solve Problem Using Python Theory',
      category: 'CodeAct',
      prompt:
        'Try to solve this problem with theory combined with python command. You should notice that "I" and "H" node are not connected.',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/solve-problem-theory-python-020cc2.jpg',
    },
    {
      title: 'Book Flights On Priceline',
      category: 'AI Browser',
      prompt:
        "Please help me book the earliest flight from San Jose to New York on September 1st and the last return flight on September 6th on Priceline\r\n\r\nTip: After switching to Sort, you don't need to click Search anymore. Please answer me in English",
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/book-flights-san-jose-3c5d03.jpg',
    },
    {
      title: 'Open, Play And Pass Game',
      category: 'AI Browser',
      prompt:
        '1. Open this game: https://cpstest.click/en/aim-trainer#google_vignette\r\n2. Select total sec to 50\r\n3. Play and pass this game',
      image:
        'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/storage/general/aim-trainer-50-seconds-e2416d.jpg',
    },
  ],
  enableContextualSelector: false,
  guiAgent: {
    defaultScreenshotRenderStrategy: 'beforeAction',
    enableScreenshotRenderStrategySwitch: true,
    renderGUIAction: true,
  },
  layout: {
    defaultLayout: 'narrow-chat',
    enableLayoutSwitchButton: true,
  },
  debug: {
    enableEventStreamViewer: true,
  },
};
