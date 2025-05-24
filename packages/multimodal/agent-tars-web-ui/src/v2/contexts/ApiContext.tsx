import React, { createContext, useContext, useMemo } from 'react';
import { AgentService } from '../services/AgentService';
import { SessionService } from '../services/SessionService';
import { ConnectionManager } from '../services/ConnectionManager';

/**
 * API服务上下文接口
 * 定义应用中可用的所有API服务
 */
interface ApiContextType {
  agentService: AgentService;
  sessionService: SessionService;
  connectionManager: ConnectionManager;
}

/**
 * API上下文
 * 提供应用中所有API服务的访问点
 */
const ApiContext = createContext<ApiContextType | null>(null);

/**
 * API提供者组件
 * 创建并提供所有API服务实例
 */
export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(() => {
    // 使用单例模式初始化连接管理器
    const connectionManager = ConnectionManager.getInstance();

    // 创建服务实例，注入依赖
    const sessionService = new SessionService(connectionManager);
    const agentService = new AgentService(connectionManager);

    return { connectionManager, sessionService, agentService };
  }, []);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

/**
 * 使用API服务的Hook
 * 提供对所有API服务的便捷访问
 */
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
