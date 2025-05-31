import { API_BASE_URL, API_ENDPOINTS } from '../constants';

/**
 * 分享配置接口
 */
export interface ShareConfig {
  hasShareProvider: boolean;
  shareProvider: string | null;
}

/**
 * 分享结果接口
 */
export interface ShareResult {
  success: boolean;
  url?: string;
  html?: string;
  sessionId?: string;
  error?: string;
}

/**
 * 分享服务类 - 处理分享相关功能
 */
class ShareService {
  private shareConfig: ShareConfig | null = null;

  /**
   * 获取分享配置
   */
  async getShareConfig(): Promise<ShareConfig> {
    if (this.shareConfig) {
      return this.shareConfig;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/share/config`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get share config: ${response.statusText}`);
      }

      this.shareConfig = await response.json();
      return this.shareConfig as ShareConfig;
    } catch (error) {
      console.error('Failed to get share config:', error);
      // 默认配置
      return { hasShareProvider: false, shareProvider: null };
    }
  }

  /**
   * 分享会话
   * @param sessionId 会话ID
   * @param upload 是否上传到分享提供者（如果存在）
   */
  async shareSession(sessionId: string, upload = false): Promise<ShareResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, upload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to share session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to share session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 下载 HTML 分享文件
   * @param html HTML 内容
   * @param sessionId 会话ID
   */
  downloadShareHtml(html: string, sessionId: string): void {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-tars-${sessionId}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const shareService = new ShareService();
