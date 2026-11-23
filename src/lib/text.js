/**
 * Word wrapping for the invoice PDF. `measure` is injected (usually
 * font.widthOfTextAtSize) so the algorithm can be tested without pdf-lib.
 */
export function wrapText(text, measure, maxWidth, { maxLines = Infinity } = {}) {
  const input = String(text ?? '');
  const words = input.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  if (typeof measure !== 'function') throw new TypeError('wrapText needs a measure function');

  const lines = [];
  let line = '';
  const push = (value) => {
    lines.push(value);
    line = '';
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth || (!line && measure(word) <= maxWidth)) {
      line = candidate;
      continue;
    }
    if (line) {
      push(line);
      if (lines.length >= maxLines) break;
    }
    // A single word wider than the column (a long URL or German compound) is
    // split character by character instead of overflowing the page.
    if (measure(word) > maxWidth) {
      let chunk = '';
      for (const character of word) {
        if (chunk && measure(chunk + character) > maxWidth) {
          lines.push(chunk);
          chunk = character;
          if (lines.length >= maxLines) break;
        } else {
          chunk += character;
        }
      }
      if (lines.length < maxLines) line = chunk;
    } else {
      line = word;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.length ? lines : [''];
}
