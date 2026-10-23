import { describe, it, expect } from 'vitest';
import {
  flagshipsNeedingRefresh,
  latestRecurrenceStart,
  STALE_AFTER_DAYS,
} from '@/lib/flagship-freshness';
import { FLAGSHIP_OPPORTUNITIES, type FlagshipOpportunity } from '@/lib/flagship-opportunities';

const NOW = new Date('2026-10-22T09:00:00Z');

function entry(overrides: Partial<FlagshipOpportunity>): FlagshipOpportunity {
  return {
    slug: 'test-program',
    name: 'Test Program',
    url: 'https://example.com/',
    provider: 'Example',
    kind: 'scholarship',
    categorySlug: 'scholarships',
    costType: 'scholarship',
    region: 'IN',
    description: 'Test.',
    source: 'https://example.com/official',
    verifiedOn: '2026-10-01',
    ...overrides,
  };
}

function codes(e: FlagshipOpportunity, now = NOW) {
  return flagshipsNeedingRefresh([e], now)[0]?.reasons.map((r) => r.code) ?? [];
}

describe('flagship-freshness.ts', () => {
  describe('latestRecurrenceStart', () => {
    it('returns this year when the month has arrived, else last year', () => {
      expect(latestRecurrenceStart('Oct', '2026-10-22')).toBe('2026-10-01');
      expect(latestRecurrenceStart('Nov', '2026-10-22')).toBe('2025-11-01');
    });

    it('takes the most recent of several months', () => {
      expect(latestRecurrenceStart('Feb & Aug', '2026-10-22')).toBe('2026-08-01');
      expect(latestRecurrenceStart('Oct & Mar', '2026-02-10')).toBe('2025-10-01');
    });

    it('returns null when no month can be read', () => {
      expect(latestRecurrenceStart(undefined, '2026-10-22')).toBeNull();
      expect(latestRecurrenceStart('rolling', '2026-10-22')).toBeNull();
    });
  });

  describe('flagshipsNeedingRefresh', () => {
    it('ignores upcoming deadlines and fresh entries', () => {
      expect(codes(entry({ deadline: '2026-10-31', recurrence: 'Jun' }))).toEqual([]);
      expect(codes(entry({ deadline: '2026-10-22' }))).toEqual([]); // closes today
    });

    it('flags a passed deadline not verified since, naming the next cycle', () => {
      const [result] = flagshipsNeedingRefresh(
        [entry({ deadline: '2026-10-05', recurrence: 'Aug', verifiedOn: '2026-09-01' })],
        NOW,
      );
      expect(result.source).toBe('https://example.com/official');
      expect(result.reasons).toEqual([
        {
          code: 'deadline-passed',
          message: 'Deadline 2026-10-05 passed; next cycle expected ~Aug, check the official page',
        },
      ]);
    });

    it('asks whether a non-recurring program still runs', () => {
      const [result] = flagshipsNeedingRefresh(
        [entry({ deadline: '2026-10-05', verifiedOn: '2026-09-01' })],
        NOW,
      );
      expect(result.reasons[0].message).toContain('no recurrence is set');
    });

    it('stays quiet after a re-check until the recurrence month comes round', () => {
      const closed = entry({ deadline: '2026-03-31', recurrence: 'Mar', verifiedOn: '2026-10-21' });
      expect(codes(closed)).toEqual([]);
      expect(codes(closed, new Date('2027-02-28T12:00:00Z'))).toEqual([]);
      expect(codes(closed, new Date('2027-03-01T12:00:00Z'))).toEqual(['next-cycle-due']);
    });

    it('flags a missing date once the usual window has opened since verification', () => {
      const undated = entry({ recurrence: 'Oct', verifiedOn: '2026-09-15' });
      expect(codes(undated)).toEqual(['no-date']);
      expect(codes({ ...undated, verifiedOn: '2026-10-02' })).toEqual([]);
      // No recurrence means no expected window.
      expect(codes(entry({ verifiedOn: '2026-09-15' }))).toEqual([]);
    });

    it('never asks mentorship programs for dates', () => {
      expect(codes(entry({ kind: 'mentorship', recurrence: 'May', verifiedOn: '2026-06-01' }))).toEqual([]);
    });

    it(`flags entries verified more than ${STALE_AFTER_DAYS} days ago, mentorship included`, () => {
      expect(codes(entry({ verifiedOn: '2026-04-25' }))).toEqual([]); // 180 days
      expect(codes(entry({ verifiedOn: '2026-04-24' }))).toEqual(['stale']); // 181 days
      expect(codes(entry({ kind: 'mentorship', verifiedOn: '2026-01-01' }))).toEqual(['stale']);
      expect(codes(entry({ verifiedOn: undefined }))).toEqual(['stale']);
    });

    it('combines reasons on one entry', () => {
      expect(
        codes(entry({ deadline: '2026-03-31', recurrence: 'Mar', verifiedOn: '2026-01-10' })),
      ).toEqual(['deadline-passed', 'stale']);
    });

    it('runs over the real curated list without throwing', () => {
      const result = flagshipsNeedingRefresh(FLAGSHIP_OPPORTUNITIES, NOW);
      for (const r of result) {
        expect(r.source).toMatch(/^https:\/\//);
        expect(r.reasons.length).toBeGreaterThan(0);
      }
    });
  });
});
