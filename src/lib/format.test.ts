import { describe, it, expect } from 'vitest';
import { relativeTime } from '@/lib/format';

describe('format.ts', () => {
  describe('relativeTime', () => {
    it('returns null for null input', () => {
      expect(relativeTime(null)).toBeNull();
    });

    it('returns "Verified today" for current timestamp', () => {
      expect(relativeTime(Date.now())).toBe('Verified today');
    });

    it('returns "Verified 2 days ago" for 2 days ago', () => {
      const twoDaysAgo = Date.now() - 2 * 86_400_000;
      expect(relativeTime(twoDaysAgo)).toBe('Verified 2 days ago');
    });

    it('returns "Verified tomorrow" for 1 day in future', () => {
      const oneDayFuture = Date.now() + 86_400_000;
      expect(relativeTime(oneDayFuture)).toBe('Verified tomorrow');
    });

    it('returns "Verified 7 days ago" for 7 days ago', () => {
      const sevenDaysAgo = Date.now() - 7 * 86_400_000;
      expect(relativeTime(sevenDaysAgo)).toBe('Verified 7 days ago');
    });
  });
});