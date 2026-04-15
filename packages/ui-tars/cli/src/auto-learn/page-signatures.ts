/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { LayoutType } from './types';

interface PageSignatureData {
  name: string;
  features: string[];
  notFeatures?: string[];
  layout?: string;
  parentTypes?: string[];
}

export const PAGE_SIGNATURES: PageSignatureData[] = [
  {
    name: '首页',
    features: ['横幅轮播', '推荐卡片', 'banner', '推荐内容'],
    notFeatures: ['左侧筛选', '分类列表'],
    layout: 'scrollable-feed',
  },
  {
    name: '剧场',
    features: ['左侧分类', '筛选列表', '剧目卡片', '剧目列表', '分类筛选'],
    layout: 'split-view',
  },
  {
    name: 'AI伴侣',
    features: ['伴侣头像', '对话界面', 'AI', '伴侣', '聊天'],
    layout: 'unknown',
  },
  {
    name: '消息',
    features: ['消息列表', '聊天记录', '消息卡片', '对话'],
    notFeatures: ['推荐', '剧目'],
    layout: 'list',
  },
  {
    name: '我的',
    features: ['用户头像', '钻石余额', '角色清单', '个人中心', '设置', '我的'],
    layout: 'form',
  },
  {
    name: '剧目详情',
    features: ['剧目封面', '播放按钮', '剧情简介', '详情页'],
    parentTypes: ['剧场', '首页'],
    layout: 'unknown',
  },
  {
    name: '搜索页',
    features: ['搜索框', '搜索结果', '搜索'],
    parentTypes: ['首页', '剧场'],
    layout: 'list',
  },
  {
    name: '播放页',
    features: ['播放器', '视频', '全屏'],
    parentTypes: ['剧目详情'],
    layout: 'unknown',
  },
  {
    name: '设置页',
    features: ['设置选项', '设置列表', '开关'],
    parentTypes: ['我的'],
    layout: 'list',
  },
];

export function matchPageSignature(
  description: string,
  parentPage?: string,
): string {
  const lowerDesc = description.toLowerCase();

  let bestMatch: PageSignatureData | null = null;
  let bestScore = 0;

  for (const sig of PAGE_SIGNATURES) {
    let score = 0;

    for (const feature of sig.features) {
      if (lowerDesc.includes(feature.toLowerCase())) {
        score += 2;
      }
    }

    if (sig.notFeatures) {
      for (const notFeature of sig.notFeatures) {
        if (lowerDesc.includes(notFeature.toLowerCase())) {
          score -= 3;
        }
      }
    }

    if (parentPage && sig.parentTypes && sig.parentTypes.includes(parentPage)) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = sig;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.name;
  }

  return 'Unknown';
}

export function getLayoutType(pageName: string): LayoutType {
  const sig = PAGE_SIGNATURES.find((s) => s.name === pageName);
  return (sig?.layout as LayoutType) || 'unknown';
}

export function isSecondaryPage(pageName: string): boolean {
  const sig = PAGE_SIGNATURES.find((s) => s.name === pageName);
  return sig?.parentTypes !== undefined && sig.parentTypes.length > 0;
}
