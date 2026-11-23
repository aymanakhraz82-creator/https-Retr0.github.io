import { describe, expect, it } from 'vitest';
import { parsePageRanges, parseRangeGroups } from '../src/lib/ranges.js';

describe('parsePageRanges', () => {
  it('parses a mixed list of ranges and single pages', () => {
    expect(parsePageRanges('1-3, 5, 8-10', 10)).toEqual([1, 2, 3, 5, 8, 9, 10]);
  });

  it('tolerates spaces around ranges', () => {
    expect(parsePageRanges('  1 - 2 ,4 ', 4)).toEqual([1, 2, 4]);
  });

  it('removes duplicates while keeping the typed order', () => {
    expect(parsePageRanges('3, 1, 3, 1-2', 3)).toEqual([3, 1, 2]);
  });

  it('accepts the word all', () => {
    expect(parsePageRanges('ALL', 3)).toEqual([1, 2, 3]);
  });

  it('rejects a backwards range', () => {
    expect(() => parsePageRanges('5-3', 10)).toThrow(/runs backwards/i);
  });

  it('rejects page zero', () => {
    expect(() => parsePageRanges('0', 10)).toThrow(/start at 1/i);
  });

  it('rejects pages past the end with the real page count', () => {
    expect(() => parsePageRanges('99', 10)).toThrow(/10 pages/i);
  });

  it('rejects blank input', () => {
    expect(() => parsePageRanges('   ', 10)).toThrow(/at least one page/i);
    expect(() => parsePageRanges(',', 10)).toThrow(/at least one page/i);
  });

  it('rejects non-numeric tokens', () => {
    expect(() => parsePageRanges('one', 10)).toThrow(/not a page or range/i);
  });
});

describe('parseRangeGroups', () => {
  it('keeps one group per comma-separated range', () => {
    expect(parseRangeGroups('1-2, 4, 6-7', 7)).toEqual([
      [1, 2],
      [4],
      [6, 7],
    ]);
  });

  it('rejects an empty value', () => {
    expect(() => parseRangeGroups('', 5)).toThrow(/at least one range/i);
  });

  it('reports the out-of-range group', () => {
    expect(() => parseRangeGroups('1-2, 9', 5)).toThrow(/5 pages/i);
  });
});
