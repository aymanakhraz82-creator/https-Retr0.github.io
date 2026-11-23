import { describe, expect, it } from 'vitest';
import {
  hasKeptPages,
  keptCount,
  moveBy,
  normalizeRotation,
  restorePages,
} from '../src/lib/organize.js';

const pages = () => [
  { sourceIndex: 0, rotation: 0, deleted: false },
  { sourceIndex: 1, rotation: 0, deleted: false },
  { sourceIndex: 2, rotation: 0, deleted: false },
];

describe('normalizeRotation', () => {
  it('rotates clockwise and counter-clockwise within 0-359', () => {
    expect(normalizeRotation(0, 90)).toBe(90);
    expect(normalizeRotation(0, -90)).toBe(270);
    expect(normalizeRotation(270, 90)).toBe(0);
    expect(normalizeRotation(350, 20)).toBe(10);
  });
});

describe('page deletion', () => {
  it('blocks saving when every page is deleted', () => {
    const list = pages().map((page) => ({ ...page, deleted: true }));
    expect(hasKeptPages(list)).toBe(false);
    expect(keptCount(list)).toBe(0);
  });

  it('allows saving while one page is kept', () => {
    const list = pages();
    list[1].deleted = true;
    expect(hasKeptPages(list)).toBe(true);
    expect(keptCount(list)).toBe(2);
  });
});

describe('moveBy', () => {
  it('reorders pages and ignores out-of-range moves', () => {
    const list = pages();
    moveBy(list, 0, 2);
    expect(list.map((page) => page.sourceIndex)).toEqual([1, 2, 0]);
    moveBy(list, 0, -1);
    expect(list.map((page) => page.sourceIndex)).toEqual([1, 2, 0]);
    moveBy(list, 2, 1);
    expect(list.map((page) => page.sourceIndex)).toEqual([1, 2, 0]);
  });
});

describe('restorePages', () => {
  it('restores original order, rotation and deletions', () => {
    const list = pages();
    list.reverse();
    list[0].deleted = true;
    list[1].rotation = 270;
    const restored = restorePages(list);
    expect(restored.map((page) => page.sourceIndex)).toEqual([0, 1, 2]);
    expect(restored.every((page) => page.deleted === false && page.rotation === 0)).toBe(true);
  });
});
