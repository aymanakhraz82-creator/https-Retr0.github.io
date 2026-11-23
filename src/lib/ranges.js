/**
 * Pure page-range parsing used by the Split PDF tool (and covered by tests).
 * Kept free of DOM access so it can run in Node.
 */

/**
 * "1-3, 5, 8-10" -> [1,2,3,5,8,9,10]. Throws a friendly message on bad input.
 */
export function parsePageRanges(raw, totalPages) {
  const total = Math.max(0, Math.floor(Number(totalPages) || 0));
  const text = String(raw ?? '').trim().toLowerCase();
  if (!text) throw new Error('Enter at least one page or range, for example 1-3, 7.');
  if (text === 'all') return Array.from({ length: total }, (_, index) => index + 1);

  const pages = [];
  for (const token of text.split(',')) {
    const part = token.trim();
    if (!part) continue;
    const match = /^(\d+)\s*(?:[-–]\s*(\d+))?$/.exec(part);
    if (!match) {
      throw new Error(`“${part}” is not a page or range. Use numbers like 1-3 or 5.`);
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < 1) throw new Error('Pages start at 1.');
    if (start > total || end > total) {
      throw new Error(
        `That range goes past the last page. This PDF has ${total} page${total === 1 ? '' : 's'}.`,
      );
    }
    if (start > end) throw new Error(`“${part}” runs backwards. Put the smaller page first.`);
    for (let page = start; page <= end; page += 1) {
      if (!pages.includes(page)) pages.push(page);
    }
  }
  if (!pages.length) throw new Error('Enter at least one page or range, for example 1-3, 7.');
  return pages;
}

/** Groups for "split into separate files": each comma-separated range is a group. */
export function parseRangeGroups(raw, totalPages) {
  const groups = String(raw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/^all$/i.test(part)) {
        return Array.from({ length: Math.max(0, Math.floor(Number(totalPages) || 0)) }, (_, index) => index + 1);
      }
      return parsePageRanges(part, totalPages);
    });
  if (!groups.length) throw new Error('Enter at least one range, for example 1-3, 4, 5-8.');
  return groups;
}
