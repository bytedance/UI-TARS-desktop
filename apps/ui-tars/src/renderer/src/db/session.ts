/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { get, set, del, entries, createStore } from 'idb-keyval';
import { v4 } from 'uuid';

// Session 相关的类型定义
export interface SessionMetaInfo {
  [key: string]: any;
}

export interface SessionItem {
  id: string;
  name: string;
  meta: SessionMetaInfo;
  createdAt: number;
  updatedAt: number;
}

const DBName = 'ui_tars_db';

// 创建一个专门的 store 实例
const sessionStore = createStore(DBName, 'sessions');

// Session 管理类
export class SessionManager {
  // 创建新的会话
  async createSession(
    name: string,
    meta: SessionMetaInfo = {},
  ): Promise<SessionItem> {
    const now = Date.now();
    const session: SessionItem = {
      id: `session_${now}_${v4()}`,
      name,
      createdAt: now,
      updatedAt: now,
      meta,
    };

    await set(session.id, session, sessionStore);
    return session;
  }

  // 获取单个会话
  async getSession(id: string): Promise<SessionItem | null | undefined> {
    return await get(id, sessionStore);
  }

  // 获取所有会话
  async getAllSessions(): Promise<SessionItem[]> {
    const items = await entries(sessionStore);
    return items.map(([_, value]) => value as SessionItem);
  }

  // 更新会话
  async updateSession(
    id: string,
    updates: Partial<Pick<SessionItem, 'name' | 'meta'>>,
  ): Promise<SessionItem | null> {
    const session = await this.getSession(id);
    if (!session) return null;

    const updatedSession: SessionItem = {
      ...session,
      ...updates,
      updatedAt: Date.now(),
    };

    await set(id, updatedSession, sessionStore);
    return updatedSession;
  }

  // 删除会话
  async deleteSession(id: string): Promise<boolean> {
    const session = await this.getSession(id);
    if (!session) return false;

    await del(id, sessionStore);
    return true;
  }
}

// 导出单例实例
export const sessionManager = new SessionManager();
