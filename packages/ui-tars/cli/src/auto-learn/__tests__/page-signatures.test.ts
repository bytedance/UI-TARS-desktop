/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import {
  matchPageSignature,
  getLayoutType,
  isSecondaryPage,
} from '../page-signatures';

describe('matchPageSignature', () => {
  it('should match home page features', () => {
    expect(matchPageSignature('推荐卡片和banner轮播')).toBe('首页');
    expect(matchPageSignature('banner推荐内容')).toBe('首页');
  });

  it('should match theater page features', () => {
    expect(matchPageSignature('左侧分类筛选列表')).toBe('剧场');
    expect(matchPageSignature('剧目卡片和分类筛选')).toBe('剧场');
  });

  it('should match messages page features', () => {
    expect(matchPageSignature('消息列表聊天记录')).toBe('消息');
  });

  it('should match profile page features', () => {
    expect(matchPageSignature('用户头像和钻石余额')).toBe('我的');
    expect(matchPageSignature('个人中心设置')).toBe('我的');
  });

  it('should match secondary pages based on parent context', () => {
    expect(matchPageSignature('剧目封面播放按钮', '剧场')).toBe('剧目详情');
    expect(matchPageSignature('搜索框搜索结果', '首页')).toBe('搜索页');
    expect(matchPageSignature('播放器全屏', '剧目详情')).toBe('播放页');
  });

  it('should return Unknown for unrecognized pages', () => {
    expect(matchPageSignature('随机未知页面')).toBe('Unknown');
  });

  it('should use notFeatures to reduce false positives', () => {
    // "推荐" would match 首页, but "左侧筛选" is a notFeature for 首页
    // So this should match 剧场 instead
    const result = matchPageSignature('左侧筛选和剧目列表');
    expect(result).toBe('剧场');
  });
});

describe('getLayoutType', () => {
  it('should return correct layout for known pages', () => {
    expect(getLayoutType('首页')).toBe('scrollable-feed');
    expect(getLayoutType('剧场')).toBe('split-view');
    expect(getLayoutType('消息')).toBe('list');
    expect(getLayoutType('我的')).toBe('form');
  });

  it('should return unknown for pages without layout definition', () => {
    expect(getLayoutType('AI伴侣')).toBe('unknown');
    expect(getLayoutType('Unknown')).toBe('unknown');
  });
});

describe('isSecondaryPage', () => {
  it('should return true for secondary pages', () => {
    expect(isSecondaryPage('剧目详情')).toBe(true);
    expect(isSecondaryPage('搜索页')).toBe(true);
    expect(isSecondaryPage('播放页')).toBe(true);
    expect(isSecondaryPage('设置页')).toBe(true);
  });

  it('should return false for primary pages', () => {
    expect(isSecondaryPage('首页')).toBe(false);
    expect(isSecondaryPage('剧场')).toBe(false);
    expect(isSecondaryPage('AI伴侣')).toBe(false);
    expect(isSecondaryPage('消息')).toBe(false);
    expect(isSecondaryPage('我的')).toBe(false);
  });

  it('should return false for unknown pages', () => {
    expect(isSecondaryPage('Unknown')).toBe(false);
  });
});
