import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/config/web-ui-config', () => ({ API_BASE_URL: '' }));

import { apiService } from './apiService';

describe('ApiService file uploads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends multipart data with CSRF protection and lets fetch set the boundary', async () => {
    const uploadedFile = {
      name: 'sample.csv',
      storedName: 'sample-abc123.csv',
      relativePath: 'uploads/sample-abc123.csv',
      size: 8,
      mimeType: 'text/csv',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'csrf-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ files: [uploadedFile] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['a,b\n1,2\n'], 'sample.csv', { type: 'text/csv' });
    await expect(apiService.uploadFiles([file])).resolves.toEqual([uploadedFile]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/csrf-token');

    const [uploadUrl, uploadOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(uploadUrl).toBe('/api/v1/files/upload');
    expect(uploadOptions.method).toBe('POST');
    expect(uploadOptions.body).toBeInstanceOf(FormData);
    expect(uploadOptions.headers).toEqual({ 'X-CSRF-Token': 'csrf-token' });
    expect((uploadOptions.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});
