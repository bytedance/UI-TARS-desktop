interface ApiShareItem {
  sessionId: string;
  slug: string;
  url: string;
  tags: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface ApiListResponse<T> extends ApiResponse<T[]> {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class ShareAPI {
  private baseUrl = 'https://agent-tars.toxichl1994.workers.dev';

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async getShares(page = 1, limit = 100): Promise<ApiListResponse<ApiShareItem>> {
    return this.request<ApiListResponse<ApiShareItem>>(`/shares?page=${page}&limit=${limit}`);
  }

  async getShare(sessionId: string): Promise<ApiResponse<ApiShareItem>> {
    const encodedId = encodeURIComponent(sessionId);
    return this.request<ApiResponse<ApiShareItem>>(`/shares/${encodedId}`);
  }

  async health(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('/health');
  }
}

export const shareAPI = new ShareAPI();
export type { ApiShareItem, ApiResponse, ApiListResponse };
