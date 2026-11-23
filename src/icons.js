/**
 * Inline SVG icons. Shared by the build script (static pages) and the browser
 * bundle (tool UIs), so the site ships no icon font and no image requests.
 */

const paths = {
  merge:
    '<rect x="3" y="4" width="9.5" height="12.5" rx="1.5"/><rect x="11.5" y="7.5" width="9.5" height="12.5" rx="1.5"/>',
  split:
    '<circle cx="6" cy="6.5" r="2.2"/><circle cx="6" cy="17.5" r="2.2"/><path d="M8 7.7 19.5 17.5M19.5 6.5 8 16.3"/>',
  compress:
    '<path d="M12 3v6m0 0 2.8-2.8M12 9 9.2 6.2M12 21v-6m0 0 2.8 2.8M12 15l-2.8 2.8"/><rect x="3.5" y="10" width="17" height="4" rx="1.4"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2.2"/><circle cx="8.7" cy="9.6" r="1.5"/><path d="m4 18 5-5 3.8 3.8 2.7-2.7 4.5 4.4"/>',
  layers:
    '<path d="m12 3 8.5 4.6L12 12.2 3.5 7.6 12 3Z"/><path d="m4 12.2 8 4.3 8-4.3M4 16.6l8 4.3 8-4.3"/>',
  wand:
    '<path d="m14.5 3.5 1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4L9.8 8.2l3.4-1.3 1.3-3.4Z"/><path d="m10.5 14.5-6 6"/><path d="M4 4v3M2.5 5.5h3M19 16v3M17.5 17.5h3"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><path d="M14 14h2.5v2.5H14zM18.5 14H21v2.5M14 18.5v2.5h2.5M18.5 18.5H21V21"/>',
  invoice:
    '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7.5h6M9 11h6M9 14.5h3.5"/>',
  shield:
    '<path d="M12 3 19 6v5.4c0 4.3-2.9 7.4-7 9.1-4.1-1.7-7-4.8-7-9.1V6l7-3Z"/><path d="m8.8 11.8 2.2 2.2 4.2-4.4"/>',
  lock:
    '<rect x="4.5" y="10" width="15" height="10.5" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  zap: '<path d="M13.5 2.5 5 13.5h5.5L9.5 21.5 19 10h-5.8l.3-7.5Z"/>',
  sun:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.4 8.4 0 1 0 10.5 10.5Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m6 9.5 6 6 6-6"/>',
  arrow: '<path d="M4.5 12h15m0 0-6-6m6 6-6 6"/>',
  upload: '<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  download: '<path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5"/><path d="M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  rotate:
    '<path d="M20 8V4.5m0 0h-3.5M20 4.5A8.5 8.5 0 1 0 20.5 14"/><path d="M8 10.5h8v7H8z"/>',
  trash:
    '<path d="M4.5 6.5h15M9 6.5V4.5h6v2M6.5 6.5 7.5 20h9l1-13.5M10.5 10v6.5M13.5 10v6.5"/>',
  grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
  spark:
    '<path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z"/><path d="M18.5 16.5 19 18l1.5.5L19 19l-.5 1.5-.5-1.5L16.5 18l1.5-.5.5-1Z"/>',
};

export function icon(name, classes = 'h-6 w-6') {
  const body = paths[name] || paths.spark;
  return `<svg class="${classes}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * The brand mark: an amber crescent moon inside night-blue halos, with a
 * thin tilted orbit ring carrying three small dots. Served as a file so the
 * gradient/mask ids stay unique when the mark appears more than once per page.
 */
export function brandMark(classes = 'h-8 w-8') {
  return `<img class="brand-mark ${classes}" src="%BASE_URL%logo-mark.svg" alt="" width="32" height="32" decoding="async">`;
}
