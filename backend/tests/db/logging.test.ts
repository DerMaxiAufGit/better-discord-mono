import { describe, expect, it } from 'vitest';

import {
  buildQueryErrorLog,
  buildQueryLog,
  shouldLogQueryText,
} from '../../src/db/logging.js';

describe('db logging helpers', () => {
  it('shouldLogQueryText is false in production', () => {
    expect(shouldLogQueryText('production')).toBe(false);
  });

  it('shouldLogQueryText is true when not production', () => {
    expect(shouldLogQueryText('development')).toBe(true);
    expect(shouldLogQueryText(undefined)).toBe(true);
  });

  it('buildQueryLog omits text in production', () => {
    const log = buildQueryLog('SELECT 1', 12, 3, 'production');
    expect(log).toEqual({ duration: 12, rows: 3 });
  });

  it('buildQueryLog includes text outside production', () => {
    const log = buildQueryLog('SELECT 1', 12, 3, 'development');
    expect(log).toEqual({ text: 'SELECT 1', duration: 12, rows: 3 });
  });

  it('buildQueryErrorLog omits text in production', () => {
    const log = buildQueryErrorLog('SELECT 1', new Error('fail'), 'production');
    expect(log).toEqual({ error: expect.any(Error) });
  });

  it('buildQueryErrorLog includes text outside production', () => {
    const log = buildQueryErrorLog('SELECT 1', new Error('fail'), 'development');
    expect(log).toEqual({ text: 'SELECT 1', error: expect.any(Error) });
  });
});
