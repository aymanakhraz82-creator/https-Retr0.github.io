/**
 * Small shared UI + file helpers used by every tool.
 * No framework: plain DOM, no dependencies.
 */
import { icon } from './icons.js';
import { validateFiles } from './lib/upload.js';

export { parsePageRanges, parseRangeGroups } from './lib/ranges.js';

export const LIMITS = {
  pdfMB: 50,
  imageMB: 20,
  backgroundMB: 15,
  maxPdfFiles: 20,
};

/* -------------------------------------------------------------- Formatting */

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export const toMB = (bytes) => bytes / (1024 * 1024);

export function fileStem(name = 'file') {
  return (
    name
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w\-. ]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'file'
  );
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ------------------------------------------------------------------ Toast */

let toastHost;

export function toast(message, tone = 'info') {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className =
      'pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4';
    document.body.append(toastHost);
  }
  const tones = {
    error: 'border-danger/40 bg-danger-soft text-danger',
    success: 'border-accent/40 bg-accent-soft text-accent',
    info: 'border-line bg-surface text-ink',
  };
  const node = document.createElement('div');
  node.className = `pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm shadow-lg ${tones[tone] || tones.info}`;
  node.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  node.textContent = message;
  toastHost.append(node);
  window.setTimeout(() => node.remove(), 5200);
}

export function setStatus(node, message, tone = 'info') {
  if (!node) return;
  node.textContent = message || '';
  node.classList.remove('hidden', 'form-error', 'form-ok', 'hint');
  node.classList.add(tone === 'error' ? 'form-error' : tone === 'success' ? 'form-ok' : 'hint');
  if (!message) node.classList.add('hidden');
}

/* ---------------------------------------------------------------- Busy UI */

export async function withBusy(button, task, busyLabel = 'Working…') {
  if (!button) return task();
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="spinner h-4 w-4"></span><span>${busyLabel}</span>`;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

export function createProgress(label = 'Working…') {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-2';
  wrap.innerHTML = `
    <div class="flex items-center justify-between gap-3 text-xs text-muted">
      <span data-progress-label>${label}</span>
      <span class="font-mono" data-progress-value>0%</span>
    </div>
    <div class="progress-track"><div class="progress-bar w-0" data-progress-bar></div></div>
  `;
  const bar = wrap.querySelector('[data-progress-bar]');
  const value = wrap.querySelector('[data-progress-value]');
  const text = wrap.querySelector('[data-progress-label]');
  return {
    element: wrap,
    set(percent, nextLabel) {
      const safe = Math.round(clamp(percent, 0, 100));
      bar.style.width = `${safe}%`;
      value.textContent = `${safe}%`;
      if (nextLabel) text.textContent = nextLabel;
      wrap.setAttribute('aria-valuenow', String(safe));
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
    },
    label(nextLabel) {
      text.textContent = nextLabel;
    },
  };
}

/* --------------------------------------------------------------- Download */

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 8000);
}

export async function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new Error('Your browser could not encode the image.');
  return blob;
}

/* -------------------------------------------------------------- Dropzone */

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'];
const PDF_TYPES = ['application/pdf', '.pdf'];

/**
 * Builds a drag-and-drop upload zone with size/type/count validation.
 */
export function createDropzone({
  accept = 'application/pdf',
  types = PDF_TYPES,
  multiple = false,
  maxSizeMB = LIMITS.pdfMB,
  maxFiles = 20,
  typeLabel = 'PDF files',
  title = 'Drop your PDF here, or <span class="browse">browse</span>',
  hint = `PDF only · up to ${maxSizeMB} MB`,
  iconName = 'upload',
  onFiles = () => {},
} = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-2';
  wrap.innerHTML = `
    <div class="dropzone" role="button" tabindex="0" aria-label="Choose a file, or drag and drop it here">
      <span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">${icon(iconName, 'h-5 w-5')}</span>
      <p class="dropzone-title">${title}</p>
      <p class="hint">${hint}</p>
      <input class="hidden" type="file" accept="${accept}" ${multiple ? 'multiple' : ''} data-input>
    </div>
    <p class="form-error hidden" role="alert" data-error></p>
  `;

  const zone = wrap.querySelector('.dropzone');
  const input = wrap.querySelector('[data-input]');
  const error = wrap.querySelector('[data-error]');

  const showError = (message) => {
    error.textContent = message;
    error.classList.remove('hidden');
    toast(message, 'error');
  };
  const clearError = () => {
    error.textContent = '';
    error.classList.add('hidden');
  };

  const handle = (fileList) => {
    const result = validateFiles(fileList, { types, maxSizeMB, maxFiles, typeLabel });
    if (result.error) {
      showError(result.error);
      return;
    }
    if (!result.files.length) return;
    clearError();
    onFiles(result.files);
  };

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    handle(input.files);
    input.value = '';
  });

  let dragDepth = 0;
  zone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth += 1;
    zone.classList.add('is-drag');
  });
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  zone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) zone.classList.remove('is-drag');
  });
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    zone.classList.remove('is-drag');
    handle(event.dataTransfer?.files);
  });

  return { element: wrap, clearError, showError, open: () => input.click(), handle };
}

export function onPasteFiles(handler) {
  document.addEventListener('paste', (event) => {
    const files = Array.from(event.clipboardData?.files || []).filter((file) =>
      file.type.startsWith('image/'),
    );
    if (files.length) handler(files);
  });
}

/* ---------------------------------------------------------------- Images */

export async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* Fall through to the <img> path for formats createImageBitmap rejects. */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be opened. Try a JPG or PNG copy.'));
    };
    image.src = url;
  });
}

export function imageSize(image) {
  return {
    width: image.width || image.naturalWidth || 0,
    height: image.height || image.naturalHeight || 0,
  };
}

/* ------------------------------------------------------------ PDF helpers */

export function friendlyPdfError(error) {
  const name = error?.name || '';
  const message = String(error?.message || error || '');
  if (name === 'PasswordException' || /password|encrypted/i.test(message)) {
    return 'This PDF is password-protected. Unlock it in your PDF reader first, then try again.';
  }
  if (/InvalidPDF|No PDF header|not a PDF|expected a pdf/i.test(message) || name === 'InvalidPDFException') {
    return 'That file does not look like a valid PDF. It may be damaged or renamed from another format.';
  }
  if (/no pages|page count/i.test(message)) {
    return 'This PDF has no pages, so there is nothing to process.';
  }
  if (/out of memory|allocation|array buffer|heap/i.test(message)) {
    return 'This PDF is too large for the available memory. Try a smaller file or a desktop browser.';
  }
  return message || 'Something went wrong while reading the PDF. Try another file.';
}

/** Picks a human-friendly name for a generated file. */
export function outputName(originalName, suffix, extension = 'pdf') {
  return `${fileStem(originalName)}-${suffix}.${extension}`;
}

/* ------------------------------------------------------------- Drag sort */

/**
 * Adds HTML5 drag-to-reorder to a list of `[data-id]` children. Callers keep
 * arrow buttons as the keyboard/touch-friendly alternative and own the state.
 */
export function attachDragSort(list, onMove) {
  let dragId = null;

  const cleanup = () => {
    dragId = null;
    list.querySelectorAll('.is-dragging, .is-over').forEach((node) => {
      node.classList.remove('is-dragging', 'is-over');
    });
  };

  list.addEventListener('dragstart', (event) => {
    const item = event.target.closest('[data-id]');
    if (!item) return;
    dragId = item.dataset.id;
    item.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData('text/plain', dragId);
      } catch {
        /* Safari can be picky outside a dragstart gesture. */
      }
    }
  });

  list.addEventListener('dragover', (event) => {
    const item = event.target.closest('[data-id]');
    if (!item || !dragId || item.dataset.id === dragId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    list.querySelectorAll('.is-over').forEach((node) => node.classList.remove('is-over'));
    item.classList.add('is-over');
  });

  list.addEventListener('dragleave', (event) => {
    const item = event.target.closest('[data-id]');
    item?.classList.remove('is-over');
  });

  list.addEventListener('drop', (event) => {
    const item = event.target.closest('[data-id]');
    if (!item || !dragId) return;
    event.preventDefault();
    const from = dragId;
    const to = item.dataset.id;
    cleanup();
    if (from !== to) onMove(from, to);
  });

  list.addEventListener('dragend', cleanup);
}
