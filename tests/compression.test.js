import { describe, expect, it } from 'vitest';
import { compressionVerdict } from '../src/lib/compression.js';

describe('compressionVerdict', () => {
  it('accepts a smaller result and reports the saving', () => {
    expect(compressionVerdict(1_000, 400)).toEqual({
      smaller: true,
      saved: 600,
      percent: 60,
      usable: true,
    });
  });

  it('refuses a larger result so nothing is downloaded', () => {
    const verdict = compressionVerdict(1_000, 1_200);
    expect(verdict.smaller).toBe(false);
    expect(verdict.saved).toBe(-200);
    expect(verdict.percent).toBe(-20);
  });

  it('treats an identical size as no saving', () => {
    expect(compressionVerdict(500, 500).smaller).toBe(false);
  });

  it('never accepts an empty result', () => {
    expect(compressionVerdict(500, 0)).toMatchObject({ smaller: false, usable: false });
  });

  it('handles missing sizes without NaN', () => {
    expect(compressionVerdict(undefined, undefined)).toEqual({
      smaller: false,
      saved: 0,
      percent: 0,
      usable: false,
    });
  });
});
