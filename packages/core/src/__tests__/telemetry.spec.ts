import { describe, expect, it } from 'vitest';
import { isTelemetryDisabled, TELEMETRY_REQUEST_TIMEOUT_MS } from '../analytics/telemetry';

describe('isTelemetryDisabled', () => {
  it('leaves telemetry on by default', () => {
    expect(TELEMETRY_REQUEST_TIMEOUT_MS).toBe(2000);
    expect(isTelemetryDisabled(undefined, {})).toBe(false);
    expect(isTelemetryDisabled(null, {})).toBe(false);
    expect(isTelemetryDisabled({}, {})).toBe(false);
    expect(isTelemetryDisabled({ telemetry: true }, {})).toBe(false);
  });

  it.each(['1', 'true', 'TRUE', 'True', '  true  ', '1 '])('opts out when EVENTCATALOG_TELEMETRY_DISABLED is %j', (value) => {
    expect(isTelemetryDisabled({ telemetry: true }, { EVENTCATALOG_TELEMETRY_DISABLED: value })).toBe(true);
  });

  it.each(['1', 'true', 'TRUE', 'True'])('opts out when DO_NOT_TRACK is %j', (value) => {
    expect(isTelemetryDisabled(undefined, { DO_NOT_TRACK: value })).toBe(true);
  });

  it('opts out when eventcatalog.config.js sets telemetry to false', () => {
    expect(isTelemetryDisabled({ telemetry: false }, {})).toBe(true);
  });

  it.each(['0', '', 'false', 'no', 'off', 'yes', '2'])('stays on when EVENTCATALOG_TELEMETRY_DISABLED is %j', (value) => {
    expect(isTelemetryDisabled(undefined, { EVENTCATALOG_TELEMETRY_DISABLED: value })).toBe(false);
  });

  it.each(['0', '', 'false', 'no'])('stays on when DO_NOT_TRACK is %j', (value) => {
    expect(isTelemetryDisabled({ telemetry: true }, { DO_NOT_TRACK: value })).toBe(false);
  });
});
