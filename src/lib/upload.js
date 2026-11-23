/**
 * File validation shared by every dropzone. Pure, so the size / count / type /
 * HEIC rules can be unit tested.
 */

export const PDF_TYPES = ['application/pdf', '.pdf'];
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'];

const HEIC_NAME = /\.(heic|heif)$/i;

export function isHeicFile(file) {
  const type = String(file?.type || '').toLowerCase();
  return type === 'image/heic' || type === 'image/heif' || HEIC_NAME.test(String(file?.name || ''));
}

export function humanSize(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value;
  let unit = -1;
  do {
    size /= 1024;
    unit += 1;
  } while (size >= 1024 && unit < units.length - 1);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

/**
 * @returns {{ files: File[], error: string }} Either the accepted files with an
 * empty error, or no files and a message for the user.
 */
export function validateFiles(files, { types = PDF_TYPES, maxSizeMB = 50, maxFiles = 20, typeLabel = 'PDF files' } = {}) {
  const list = Array.from(files || []);
  if (!list.length) return { files: [], error: '' };

  const heic = list.find(isHeicFile);
  if (heic) {
    return {
      files: [],
      error: `“${heic.name}” is a HEIC photo. Browsers cannot open HEIC — export it as JPG in your camera app or Photos, then try again.`,
    };
  }

  const wrongType = list.find(
    (file) => !types.some((type) => file.type === type || String(file.name).toLowerCase().endsWith(type)),
  );
  if (wrongType) {
    return {
      files: [],
      error: `“${wrongType.name}” is not a supported file. Please choose ${typeLabel}.`,
    };
  }

  const tooBig = list.find((file) => file.size / (1024 * 1024) > maxSizeMB);
  if (tooBig) {
    return {
      files: [],
      error: `“${tooBig.name}” is ${humanSize(tooBig.size)}. The limit is ${maxSizeMB} MB per file — try compressing it first.`,
    };
  }

  if (list.length > maxFiles) {
    return { files: [], error: `Please add up to ${maxFiles} files at a time.` };
  }

  return { files: list, error: '' };
}
