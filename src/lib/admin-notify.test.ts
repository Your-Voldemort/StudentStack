import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getWebhookUrl,
  buildBrokenLinksMessage,
  notifyBrokenLinks,
  getSubmissionsWebhookUrl,
  buildNewSubmissionMessage,
  notifyNewSubmission,
  type BrokenLink,
  type LinkHealthSummary,
} from '@/lib/admin-notify';
import type { FlagshipRefreshEntry } from '@/lib/flagship-freshness';

const summary: LinkHealthSummary = {
  checked: 10,
  active: 8,
  broken: 1,
  expired: 1,
  checkedAt: '2026-10-18T00:00:00.000Z',
};

const links: BrokenLink[] = [
  { id: 1, url: 'https://example.com/a', previousStatus: 'active', newStatus: 'broken' },
  { id: 2, url: 'https://example.com/b', previousStatus: 'broken', newStatus: 'expired' },
];

const refresh: FlagshipRefreshEntry[] = [
  {
    slug: 'gsoc',
    name: 'Google Summer of Code',
    source: 'https://developers.google.com/open-source/gsoc/timeline',
    reasons: [
      {
        code: 'deadline-passed',
        message: 'Deadline 2026-03-31 passed; next cycle expected ~Mar, check the official page',
      },
    ],
  },
];

afterEach(() => {
  delete process.env.LINK_HEALTH_WEBHOOK_URL;
  delete process.env.SUBMISSIONS_WEBHOOK_URL;
});

describe('admin-notify.ts', () => {
  describe('getWebhookUrl', () => {
    it('returns the configured webhook URL', () => {
      process.env.LINK_HEALTH_WEBHOOK_URL = 'https://hooks.example/x';
      expect(getWebhookUrl()).toBe('https://hooks.example/x');
    });

    it('returns null when unconfigured or blank', () => {
      expect(getWebhookUrl()).toBeNull();
      process.env.LINK_HEALTH_WEBHOOK_URL = '   ';
      expect(getWebhookUrl()).toBeNull();
    });
  });

  describe('buildBrokenLinksMessage', () => {
    it('lists the flagged links with their transitions and the run summary', () => {
      const message = buildBrokenLinksMessage(links, summary);
      expect(message).toContain('2 newly flagged links');
      expect(message).toContain('https://example.com/a (active -> broken)');
      expect(message).toContain('https://example.com/b (broken -> expired)');
      expect(message).toContain('Checked 10 URLs');
    });

    it('truncates long lists at 20 entries', () => {
      const many: BrokenLink[] = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        url: `https://example.com/${i}`,
        previousStatus: 'active',
        newStatus: 'broken' as const,
      }));
      const message = buildBrokenLinksMessage(many, summary);
      expect(message).toContain('…and 5 more');
      expect(message).not.toContain('https://example.com/24');
    });

    it('appends the curated programs to re-check with reason and source', () => {
      const message = buildBrokenLinksMessage(links, summary, refresh);
      expect(message).toContain('1 curated program to re-check');
      expect(message).toContain(
        '- Google Summer of Code: Deadline 2026-03-31 passed; next cycle expected ~Mar, check the official page (https://developers.google.com/open-source/gsoc/timeline)',
      );
    });

    it('says so when only curated programs need attention, and truncates at 10', () => {
      const many = Array.from({ length: 12 }, (_, i) => ({ ...refresh[0], slug: `p${i}`, name: `Program ${i}` }));
      const message = buildBrokenLinksMessage([], summary, many);
      expect(message).toContain('no newly flagged links');
      expect(message).toContain('12 curated programs to re-check');
      expect(message).toContain('…and 2 more on the admin dashboard');
      expect(message).not.toContain('Program 11');
    });
  });

  describe('notifyBrokenLinks', () => {
    it('does nothing when there are no newly flagged links', async () => {
      const fetchImpl = vi.fn();
      const result = await notifyBrokenLinks([], summary, {
        webhookUrl: 'https://hooks.example/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result).toEqual({ sent: false, reason: 'no newly flagged links' });
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('still sends when only curated programs need a re-check', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      const result = await notifyBrokenLinks([], summary, {
        webhookUrl: 'https://hooks.example/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        flagshipRefresh: refresh,
      });
      expect(result).toEqual({ sent: true });
      const body = JSON.parse(fetchImpl.mock.calls[0][1].body as string);
      expect(body.text).toContain('Google Summer of Code');
    });

    it('skips silently when no webhook is configured', async () => {
      const fetchImpl = vi.fn();
      const result = await notifyBrokenLinks(links, summary, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result.sent).toBe(false);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('POSTs the message as JSON to the webhook', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      const result = await notifyBrokenLinks(links, summary, {
        webhookUrl: 'https://hooks.example/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result).toEqual({ sent: true });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe('https://hooks.example/x');
      expect(init.method).toBe('POST');
      expect(init.headers['content-type']).toBe('application/json');
      const body = JSON.parse(init.body as string);
      expect(body.text).toContain('https://example.com/a');
    });

    it('reports HTTP errors instead of throwing', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      const result = await notifyBrokenLinks(links, summary, {
        webhookUrl: 'https://hooks.example/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result).toEqual({ sent: false, reason: 'webhook returned HTTP 500' });
    });

    it('reports network failures instead of throwing', async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error('fetch failed'));
      const result = await notifyBrokenLinks(links, summary, {
        webhookUrl: 'https://hooks.example/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result.sent).toBe(false);
      expect((result as { reason: string }).reason).toContain('fetch failed');
    });
  });

  describe('getSubmissionsWebhookUrl', () => {
    it('prefers SUBMISSIONS_WEBHOOK_URL', () => {
      expect(
        getSubmissionsWebhookUrl({
          SUBMISSIONS_WEBHOOK_URL: 'https://hooks.example/subs',
          LINK_HEALTH_WEBHOOK_URL: 'https://hooks.example/links',
        } as unknown as NodeJS.ProcessEnv),
      ).toBe('https://hooks.example/subs');
    });

    it('falls back to LINK_HEALTH_WEBHOOK_URL, then null', () => {
      expect(
        getSubmissionsWebhookUrl({ LINK_HEALTH_WEBHOOK_URL: 'https://hooks.example/links' } as unknown as NodeJS.ProcessEnv),
      ).toBe('https://hooks.example/links');
      expect(getSubmissionsWebhookUrl({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    });
  });

  describe('notifyNewSubmission', () => {
    const submission = { name: 'Figma', url: 'https://figma.com/education', categoryName: 'Design & Creative' };

    it('builds a message with the name, link, and review URL', () => {
      const text = buildNewSubmissionMessage(submission, 'https://site.example/admin');
      expect(text).toContain('Figma (Design & Creative)');
      expect(text).toContain('https://figma.com/education');
      expect(text).toContain('https://site.example/admin');
    });

    it('skips silently when no webhook is configured', async () => {
      const result = await notifyNewSubmission(submission, 'https://site.example/admin', { webhookUrl: null });
      expect(result.sent).toBe(false);
    });

    it('POSTs the message to the webhook', async () => {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      const result = await notifyNewSubmission(submission, 'https://site.example/admin', {
        webhookUrl: 'https://hooks.example/subs',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result).toEqual({ sent: true });
      const [url, init] = fetchImpl.mock.calls[0];
      expect(url).toBe('https://hooks.example/subs');
      expect(JSON.parse(init.body).text).toContain('Figma');
    });
  });
});
