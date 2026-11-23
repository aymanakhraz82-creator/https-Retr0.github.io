import { describe, expect, it } from 'vitest';
import { isHeicFile, validateFiles } from '../src/lib/upload.js';

const file = (name, size, type = 'application/pdf') => ({ name, size, type });
const MB = 1024 * 1024;

describe('validateFiles', () => {
  it('accepts supported PDFs', () => {
    const result = validateFiles([file('a.pdf', 1000)], { maxSizeMB: 50, maxFiles: 20 });
    expect(result.error).toBe('');
    expect(result.files).toHaveLength(1);
  });

  it('rejects encrypted-looking extensions and other types with a clear message', () => {
    const result = validateFiles([file('notes.txt', 10, 'text/plain')]);
    expect(result.error).toMatch(/not a supported file/i);
    expect(result.files).toHaveLength(0);
  });

  it('rejects HEIC photos with format-specific advice', () => {
    const result = validateFiles([file('IMG_0001.HEIC', 1000, 'image/heic')], {
      types: ['image/jpeg', 'image/png'],
      typeLabel: 'JPG or PNG images',
    });
    expect(isHeicFile({ name: 'photo.HEIF' })).toBe(true);
    expect(result.error).toMatch(/HEIC/);
    expect(result.error).toMatch(/export it as JPG/i);
  });

  it('rejects a file over the per-file limit and names its size', () => {
    const result = validateFiles([file('big.pdf', 51 * MB)], { maxSizeMB: 50 });
    expect(result.error).toMatch(/51 MB/);
    expect(result.error).toMatch(/limit is 50 MB/i);
  });

  it('allows a file exactly at the limit', () => {
    expect(validateFiles([file('edge.pdf', 50 * MB)], { maxSizeMB: 50 }).error).toBe('');
  });

  it('rejects more than the maximum file count', () => {
    const files = Array.from({ length: 21 }, (_, index) => file(`${index}.pdf`, 10));
    expect(validateFiles(files, { maxFiles: 20 }).error).toMatch(/up to 20 files/i);
  });

  it('ignores an empty selection', () => {
    expect(validateFiles([])).toEqual({ files: [], error: '' });
  });
});
