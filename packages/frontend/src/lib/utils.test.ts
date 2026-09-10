import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, toInputDate, toInputDateTime } from './utils';

describe('formatDate', () => {
  it('returns an em dash for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats an ISO string as DD.MM.YYYY', () => {
    expect(formatDate('2026-03-05T00:00:00.000Z')).toBe('05.03.2026');
  });
});

describe('formatMoney', () => {
  it('returns an em dash for null/undefined', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });

  it('formats a numeric string with thousands separators', () => {
    expect(formatMoney('1500')).toContain('500');
  });
});

describe('toInputDate / toInputDateTime', () => {
  it('slices an ISO string to the date-only portion', () => {
    expect(toInputDate('2026-03-05T10:30:00.000Z')).toBe('2026-03-05');
  });

  it('slices an ISO string to the datetime-local portion', () => {
    expect(toInputDateTime('2026-03-05T10:30:00.000Z')).toBe('2026-03-05T10:30');
  });

  it('returns an empty string for a missing value', () => {
    expect(toInputDate(null)).toBe('');
    expect(toInputDateTime(undefined)).toBe('');
  });
});
