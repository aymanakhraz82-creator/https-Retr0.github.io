import { describe, expect, it } from 'vitest';
import { layoutPage } from '../src/lib/layout.js';

const close = (value, expected, tolerance = 0.01) => expect(Math.abs(value - expected)).toBeLessThan(tolerance);

describe('layoutPage', () => {
  it('centres a portrait photo on A4 portrait', () => {
    const page = layoutPage('a4', 'portrait', 1000, 2000, 18);
    expect(page.pageWidth).toBeCloseTo(595.28);
    expect(page.pageHeight).toBeCloseTo(841.89);
    close(page.x, (595.28 - page.drawWidth) / 2);
    close(page.y, (841.89 - page.drawHeight) / 2);
    expect(page.drawWidth).toBeLessThanOrEqual(page.pageWidth - 36 + 0.01);
  });

  it('swaps the A4 sides in landscape', () => {
    const page = layoutPage('a4', 'landscape', 1600, 900, 0);
    expect(page.pageWidth).toBeCloseTo(841.89);
    expect(page.pageHeight).toBeCloseTo(595.28);
  });

  it('follows the image shape on auto orientation', () => {
    const page = layoutPage('letter', 'auto', 2000, 1000, 18);
    expect(page.pageWidth).toBeCloseTo(792);
    expect(page.pageHeight).toBeCloseTo(612);
  });

  it('sizes the page to the image for fit-to-image', () => {
    const page = layoutPage('fit', 'portrait', 800, 600, 36);
    expect(page.pageWidth).toBeCloseTo(800 * 0.75 + 72);
    expect(page.pageHeight).toBeCloseTo(600 * 0.75 + 72);
    expect(page.drawWidth).toBeCloseTo(600);
    expect(page.x).toBe(36);
  });

  it('never produces a negative drawing box with huge margins', () => {
    const page = layoutPage('a4', 'portrait', 100, 100, 1000);
    expect(Number.isFinite(page.drawWidth)).toBe(true);
    expect(page.drawWidth).toBeGreaterThan(0);
  });
});
