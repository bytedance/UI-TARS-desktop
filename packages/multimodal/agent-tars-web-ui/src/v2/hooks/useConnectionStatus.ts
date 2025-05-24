import { atom, useAtom } from 'jotai';
import { useCallback } from 'react';
import { ConnectionStatus } from '../types';
import { useApi } from '../contexts/ApiContext';

// 连接状态原子
const connectionStatusAtom = atom<ConnectionStatus>({
  connected: false,
  lastConnected: null,
  lastError: null,
  reconnecting: false,
});

/**
 * 连接状态Hook
 * 提供管理和监控服务器连接状态的功能
 */
export function useConnectionStatus() {
  const [status, setStatus] = useAtom(connectionStatusAtom);
  const { connectionManager, sessionService } = useApi();

  /**
   * 检查服务器状态
   */
  const checkServerStatus = useCallback(async () => {
    try {
      const isConnected = await sessionService.checkServerStatus();

      setStatus((prevStatus) => ({
        ...prevStatus,
        connected: isConnected,
        lastConnected: isConnected ? Date.now() : prevStatus.lastConnected,
        lastError: isConnected ? null : prevStatus.lastError,
      }));

      return isConnected;
    } catch (error) {
      setStatus((prevStatus) => ({
        ...prevStatus,
        connected: false,
        lastError: error instanceof Error ? error.message : String(error),
      }));

      return false;
    }
  }, [sessionService, setStatus]);

  /**
   * 初始化连接监控
   */
  const initializeConnection = useCallback(() => {
    // 执行初始检查
    checkServerStatus();

    // 设置套接字事件监听器
    connectionManager.on('connect', () => {
      setStatus((prev) => ({
        ...prev,
        connected: true,
        lastConnected: Date.now(),
        lastError: null,
        reconnecting: false,
      }));
    });

    connectionManager.on('disconnect', (reason) => {
      setStatus((prev) => ({
        ...prev,
        connected: false,
        lastError: `Disconnected: ${reason}`,
        reconnecting: true,
      }));
    });

    connectionManager.on('reconnecting', () => {
      setStatus((prev) => ({
        ...prev,
        reconnecting: true,
      }));
    });

    connectionManager.on('reconnectFailed', () => {
      setStatus((prev) => ({
        ...prev,
        connected: false,
        reconnecting: false,
        lastError: 'Failed to reconnect after multiple attempts',
      }));
    });

    // 设置定期健康检查
    const intervalId = setInterval(() => {
      checkServerStatus();
    }, 30000); // 每30秒检查一次

    // 返回清理函数
    return () => {
      clearInterval(intervalId);
      connectionManager.off('connect', () => {});
      connectionManager.off('disconnect', () => {});
      connectionManager.off('reconnecting', () => {});
      connectionManager.off('reconnectFailed', () => {});
    };
  }, [checkServerStatus, connectionManager, setStatus]);

  return {
    status,
    checkServerStatus,
    initializeConnection,
  };
}
