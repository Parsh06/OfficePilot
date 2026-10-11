import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, ApiError, apiClient } from '@/lib/api/client';

describe('Frontend API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('automatically adds Authorization header when token exists and parses response', async () => {
    const mockData = { status: 'HEALTHY', version: '1.0.0' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: mockData,
        }),
    } as any);

    const result = await apiClient.getHealth();
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({
        headers: expect.anything(),
      })
    );
  });

  it('throws ApiError with error code when response is not successful', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid session token',
          },
        }),
    } as any);

    await expect(apiFetch('/api/v1/profile')).rejects.toThrow(ApiError);
    await expect(apiFetch('/api/v1/profile')).rejects.toThrow('Invalid session token');
  });
});
