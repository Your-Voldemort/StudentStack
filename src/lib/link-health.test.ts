import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyCheck, checkUrl, runWithConcurrency } from '@/lib/link-health';

describe('link-health.ts', () => {
  describe('classifyCheck', () => {
    it('classifies successful check as active', () => {
      expect(classifyCheck({ ok: true })).toBe('active');
    });

    it('classifies failed check as broken', () => {
      expect(classifyCheck({ ok: false })).toBe('broken');
    });
  });

  describe('checkUrl', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns ok true when HEAD request succeeds with 200', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
      } as Response);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/valid');

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/valid',
        expect.objectContaining({
          method: 'HEAD',
          redirect: 'follow',
        })
      );
    });

    it('falls back to GET when HEAD returns 405 Method Not Allowed', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 405,
          ok: false,
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
        } as Response);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/no-head');

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://example.com/no-head',
        expect.objectContaining({ method: 'HEAD' })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://example.com/no-head',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('falls back to GET when HEAD returns 501 Not Implemented', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 501,
          ok: false,
        } as Response)
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
        } as Response);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/unsupported-head');

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://example.com/unsupported-head',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('falls back to GET when HEAD throws network error', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Network connection reset'))
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
        } as Response);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/head-network-error');

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://example.com/head-network-error',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns ok false when both HEAD and GET fail with network errors', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed again'));
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/down');

      expect(result).toEqual({ ok: false });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns ok false when endpoint returns 404', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      } as Response);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/missing');

      expect(result).toEqual({ ok: false });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns ok false when fetch aborts due to timeout', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'TimeoutError';
      const mockFetch = vi.fn().mockRejectedValue(timeoutError);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/timeout', 100);

      expect(result).toEqual({ ok: false });
    });
  });

  describe('runWithConcurrency', () => {
    it('processes all items in the list', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed: number[] = [];

      await runWithConcurrency(items, 2, async (item) => {
        processed.push(item);
      });

      expect(processed).toHaveLength(items.length);
      expect(processed.sort((a, b) => a - b)).toEqual(items);
    });

    it('handles empty input array without invoking worker', async () => {
      const worker = vi.fn();

      await runWithConcurrency([], 3, worker);

      expect(worker).not.toHaveBeenCalled();
    });

    it('handles array when item count is smaller than concurrency limit', async () => {
      const items = ['alpha', 'beta'];
      const processed: string[] = [];

      await runWithConcurrency(items, 10, async (item) => {
        processed.push(item);
      });

      expect(processed).toEqual(items);
    });

    it('ensures active concurrent executions never exceed specified limit', async () => {
      const items = Array.from({ length: 12 }, (_, i) => i + 1);
      const concurrencyLimit = 3;
      let currentActive = 0;
      let peakActive = 0;

      await runWithConcurrency(items, concurrencyLimit, async () => {
        currentActive += 1;
        if (currentActive > peakActive) {
          peakActive = currentActive;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        currentActive -= 1;
      });

      expect(peakActive).toBeLessThanOrEqual(concurrencyLimit);
      expect(currentActive).toBe(0);
    });
  });

  describe('self check block', () => {
    it('executes self check assertions when executed directly', async () => {
      const originalArgv = process.argv[1];
      try {
        process.argv[1] = 'src/lib/link-health.ts';
        vi.resetModules();
        const dynamicPath: string = './link-health';
        await import(/* @vite-ignore */ dynamicPath);
      } finally {
        process.argv[1] = originalArgv;
      }
    });
  });
});
