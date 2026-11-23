/**
 * Page-list rules for the Organize PDF tool. The records also carry canvases
 * and DOM nodes in the browser, so these helpers only touch the small numeric
 * and boolean fields, which keeps them testable.
 */

/** Keeps a rotation in the 0/90/180/270 range, including negative turns. */
export function normalizeRotation(rotation, delta = 0) {
  const next = (Number(rotation) || 0) + (Number(delta) || 0);
  return ((next % 360) + 360) % 360;
}

/** Saving is allowed only while at least one page is kept. */
export function hasKeptPages(pages) {
  return Array.isArray(pages) && pages.some((page) => page && !page.deleted);
}

export function keptCount(pages) {
  return Array.isArray(pages) ? pages.filter((page) => page && !page.deleted).length : 0;
}

/** Moves one entry by `delta` positions. Returns the same array for chaining. */
export function moveBy(pages, index, delta) {
  const next = index + Number(delta);
  if (!Array.isArray(pages) || index < 0 || index >= pages.length) return pages;
  if (!Number.isInteger(next) || next < 0 || next >= pages.length) return pages;
  const [moved] = pages.splice(index, 1);
  pages.splice(next, 0, moved);
  return pages;
}

/** Restores original order, rotations and deletions. Mutates the records. */
export function restorePages(pages) {
  if (!Array.isArray(pages)) return [];
  return pages
    .slice()
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map((page) => {
      page.rotation = 0;
      page.deleted = false;
      return page;
    });
}
