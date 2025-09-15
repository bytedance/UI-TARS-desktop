/**
 * 用户认证相关的 Hook
 * 处理用户登录、登出和状态管理
 */
import React, { ReactNode, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getJwtUserInfo } from '@bytecloud/common-lib';
import { useAtom } from 'jotai';

import { UserInfo, authStateAtom, setAuthLoadingAtom, setUserAtom } from '../state/atoms/auth';

// 获取当前用户信息的辅助函数
export function getCurrentUser() {
  const userInfo = localStorage.getItem('user_info');
  return userInfo ? JSON.parse(userInfo) : null;
}

// 将用户信息编码为字符串（用于请求头）
export function encodeUserInfo(user: UserInfo): string {
  return encodeURIComponent(JSON.stringify(user));
}

// 创建带有认证信息的请求头
export function createAuthHeaders(user: UserInfo | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (user) {
    headers['X-User-Info'] = encodeUserInfo(user);
  }

  return headers;
}

export function useAuth() {
  const [authState] = useAtom(authStateAtom);
  const [, setUser] = useAtom(setUserAtom);
  const [, setAuthLoading] = useAtom(setAuthLoadingAtom);

  // 获取用户信息
  const fetchUserInfo = useCallback(async () => {
    try {
      setAuthLoading(true);
      console.log('正在获取用户信息...');

      const userInfo = await getJwtUserInfo('online');

      if (!userInfo) {
        throw new Error('userInfo empyt');
        // return;
      }

      console.log('用户信息获取成功:', userInfo);

      const user: UserInfo = {
        username: userInfo.username,
        email: userInfo.email,
        avatar_url: userInfo.avatar_url,
        organization: userInfo.organization,
      };

      setUser(user);

      // 将用户信息存储到 localStorage
      localStorage.setItem('user_info', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setUser(null);

      // 清理本地存储
      localStorage.removeItem('user_info');

      toast.error('获取用户信息失败，请重新登录');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [setUser, setAuthLoading]);

  // 登出
  const logout = useCallback(() => {
    console.log('用户登出');
    setUser(null);
    localStorage.removeItem('user_info');
    toast.success('已退出登录');
  }, [setUser]);

  // 初始化时尝试从本地存储恢复用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem('user_info');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);

        setUser(user);
      } catch (error) {
        console.error('解析本地用户信息失败:', error);
        localStorage.removeItem('user_info');
        setAuthLoading(false);
      }
    } else {
      // 没有本地用户信息，尝试获取
      fetchUserInfo().catch(() => {
        // 获取失败时静默处理
        setAuthLoading(false);
      });
    }
  }, [fetchUserInfo, setUser, setAuthLoading]);

  return {
    ...authState,
    fetchUserInfo,
    logout,
    refreshUserInfo: fetchUserInfo,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // if (isLoading) {
  //   return <div>loading</div>;
  // }

  // if (!isAuthenticated) {
  //   return <div>need login</div>;
  // }

  return <>{children}</>;
};
