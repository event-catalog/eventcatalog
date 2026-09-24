import { describe, expect, it } from 'vitest';
import { getTrialStatus, TRIAL_LENGTH_DAYS } from '../trial';

const DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 0, 1);

describe('getTrialStatus', () => {
  it('gives the full trial on the day it starts', () => {
    expect(getTrialStatus(start, start)).toEqual({
      daysLeft: TRIAL_LENGTH_DAYS,
      ended: false,
      endsAt: new Date(start + TRIAL_LENGTH_DAYS * DAY),
    });
  });

  it('counts a part-day as a day left', () => {
    expect(getTrialStatus(start, start + 23 * DAY + 1)?.daysLeft).toBe(67);
    expect(getTrialStatus(start, start + (TRIAL_LENGTH_DAYS - 1) * DAY + 1)?.daysLeft).toBe(1);
  });

  it('ends after the trial length', () => {
    expect(getTrialStatus(start, start + TRIAL_LENGTH_DAYS * DAY)).toMatchObject({ daysLeft: 0, ended: true });
    expect(getTrialStatus(start, start + 400 * DAY)).toMatchObject({ daysLeft: 0, ended: true });
  });

  it('has no status without a valid start date', () => {
    for (const tsd of [undefined, null, '<tsd>', NaN, 0, -1]) {
      expect(getTrialStatus(tsd, start)).toBeUndefined();
    }
  });
});
