import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyCheck, checkUrl, runWithConcurrency, resolveStatusTransition } from '@/lib/link-health';

const mockAssertPublicUrl = vi.hoisted(() => vi.fn());

// Mock the SSRF guard at the module boundary (unit behavior of the guard
// itself is covered in ssrf.test.ts); the redirect-hop tests below drive
// per-URL allow/block decisions through this mock.
vi.mock('@/lib/ssrf', () => ({
  assertPublicUrl: mockAssertPublicUrl,
  isRedirectStatus: (status: number) =>
    status === 301 || status === 302 || status === 303 || status === 307 || status === 308,
}));

function redirectResponse(location: string) {
  return {
    status: 302,
    ok: false,
    headers: { get: (name: string) => (name.toLowerCase() === 'location' ? location : null) },
  } as unknown as Response;
}

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
      // By default every URL passes the SSRF guard; individual tests tighten it.
      mockAssertPublicUrl.mockImplementation(async (raw: string) => raw);
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
          redirect: 'manual',
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

    it('refuses to fetch a blocked URL without any network request', async () => {
      mockAssertPublicUrl.mockRejectedValueOnce(new Error('SSRF guard: blocked'));
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const result = await checkUrl('http://169.254.169.254/latest/meta-data/iam/security-credentials/');

      expect(result).toEqual({ ok: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('fails closed when the guard rejects the URL', async () => {
      mockAssertPublicUrl.mockRejectedValueOnce(new Error('SSRF guard: blocked'));
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://does-not-exist.invalid/offer');

      expect(result).toEqual({ ok: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('follows a redirect to another public URL', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse('https://example.com/final'))
        .mockResolvedValueOnce({ status: 200, ok: true } as Response);
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/short');

      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://example.com/final', expect.anything());
    });

    it('blocks a redirect hop to a non-public URL', async () => {
      mockAssertPublicUrl.mockImplementation(async (raw: string) => {
        if (raw.includes('169.254.169.254')) throw new Error('SSRF guard: blocked');
        return raw;
      });
      const mockFetch = vi.fn().mockResolvedValueOnce(redirectResponse('http://169.254.169.254/x'));
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/redirect-to-metadata');

      expect(result).toEqual({ ok: false });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('treats an over-long redirect chain as broken', async () => {
      const mockFetch = vi.fn().mockResolvedValue(redirectResponse('https://example.com/loop'));
      globalThis.fetch = mockFetch;

      const result = await checkUrl('https://example.com/loop');

      expect(result).toEqual({ ok: false });
      // initial request + MAX_REDIRECTS (5) redirect hops = 6 fetches
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });

  describe('resolveStatusTransition (issue #76)', () => {
    it('marks a healthy resource broken on its first failed check', () => {
      const t = resolveStatusTransition({
        previousStatus: 'active',
        consecutiveFailures: 0,
        outcome: { ok: false },
      });
      expect(t).toEqual({ status: 'broken', consecutiveFailures: 1 });
    });

    it('expires a resource after two consecutive failed checks', () => {
      const t = resolveStatusTransition({
        previousStatus: 'broken',
        consecutiveFailures: 1,
        outcome: { ok: false },
      });
      expect(t).toEqual({ status: 'expired', consecutiveFailures: 2 });
    });

    it('keeps counting past two failures without flipping back', () => {
      const t = resolveStatusTransition({
        previousStatus: 'expired',
        consecutiveFailures: 2,
        outcome: { ok: false },
      });
      expect(t.status).toBe('expired');
      expect(t.consecutiveFailures).toBe(3);
    });

    it('heals a broken resource back to active on a successful check', () => {
      const t = resolveStatusTransition({
        previousStatus: 'broken',
        consecutiveFailures: 1,
        outcome: { ok: true },
      });
      expect(t).toEqual({ status: 'active', consecutiveFailures: 0 });
    });

    it('resets the failure counter on success even for active resources', () => {
      const t = resolveStatusTransition({
        previousStatus: 'active',
        consecutiveFailures: 0,
        outcome: { ok: true },
      });
      expect(t).toEqual({ status: 'active', consecutiveFailures: 0 });
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
