/**
 * Turns background-removal failures into something a person can act on.
 * Pure, so the wording and the offline/memory cases are testable.
 */

export function describeBackgroundError(error, { online = true } = {}) {
  const text = String(error?.message || error || '');
  if (!online) {
    return 'You are offline. The AI model is downloaded once and then cached — reconnect and run this image again. Your photo was not uploaded.';
  }
  if (/out of memory|allocation|array buffer|heap|memory/i.test(text)) {
    return 'Your device ran out of memory for this image. Close other tabs, try a smaller photo, or use a desktop browser.';
  }
  if (/fetch|network|failed to load|failed to fetch|cors|download|load/i.test(text)) {
    return 'The AI model could not be downloaded. Check your connection and try again — no image data was sent anywhere.';
  }
  return 'The background could not be removed from this image. Try a smaller or simpler photo, or a JPG copy.';
}

export function isModelDownloadMessage(message) {
  return /model could not be downloaded|offline/i.test(String(message || ''));
}
