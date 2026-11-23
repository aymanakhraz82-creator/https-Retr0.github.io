/**
 * Decides whether a compressed PDF is actually worth downloading.
 * Pure so the "never download a larger file" rule can be tested.
 */
export function compressionVerdict(originalSize, newSize) {
  const before = Math.max(0, Number(originalSize) || 0);
  const after = Math.max(0, Number(newSize) || 0);
  const saved = before - after;
  const percent = before > 0 ? Math.round((saved / before) * 100) : 0;
  return {
    smaller: after > 0 && saved > 0,
    saved,
    percent,
    // A zero-byte result is never a useful download.
    usable: after > 0,
  };
}
