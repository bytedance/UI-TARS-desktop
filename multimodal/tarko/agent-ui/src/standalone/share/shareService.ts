import { API_BASE_URL, API_ENDPOINTS } from '@/common/constants';

/**
 * Share configuration interface
 */
export interface ShareConfig {
  hasShareProvider: boolean;
  shareProvider: string | null;
}

/**
 * Share result interface
 */
export interface ShareResult {
  success: boolean;
  url?: string;
  html?: string;
  sessionId?: string;
  error?: string;
}

/**
 * Share service class - handles share-related functionality
 */
class ShareService {
  private shareConfig: ShareConfig | null = null;

  /**
   * Get share configuration
   */
  async getShareConfig(): Promise<ShareConfig> {
    if (this.shareConfig) {
      return this.shareConfig;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SHARE_CONFIG}`, {
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
      // Default configuration
      return { hasShareProvider: false, shareProvider: null };
    }
  }

  /**
   * Share session
   * @param sessionId Session ID
   * @param upload Whether to upload to share provider (if exists)
   */
  async shareSession(sessionId: string, upload = false): Promise<ShareResult> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SESSIONS_SHARE}`, {
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
   * Download HTML share file
   * @param html HTML content
   * @param sessionId Session ID
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
