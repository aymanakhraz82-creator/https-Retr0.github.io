import { icon } from '../icons.js';
import { describeBackgroundError } from '../lib/background.js';
import {
  canvasToBlob,
  createDropzone,
  createProgress,
  download,
  fileStem,
  formatBytes,
  LIMITS,
  loadImage,
  onPasteFiles,
  setStatus,
  toast,
  withBusy,
} from '../ui.js';

const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value);

function loadUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The processed image could not be displayed.'));
    image.src = url;
  });
}

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function mount(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div data-drop></div>
      <p class="hint flex items-start gap-1.5">${icon('spark', 'h-3.5 w-3.5 mt-0.5 text-brand')} You can also paste an image with Ctrl+V (⌘V on Mac).</p>

      <div class="hidden space-y-3 rounded-xl border border-line bg-surface-2/40 p-4" data-loading>
        <div class="flex items-center gap-2 text-sm font-medium">
          <span class="spinner h-4 w-4 text-brand"></span>
          <span>Working on your device…</span>
        </div>
        <div data-progress></div>
        <p class="hint">First run downloads a ~40 MB AI model once. It is cached by your browser; your photo is never uploaded.</p>
      </div>

      <section class="hidden space-y-4" data-editor aria-labelledby="bg-preview-heading">
        <h2 id="bg-preview-heading" class="sr-only-focusable">Before and after preview</h2>

        <div class="compare" data-compare style="--split: 50%">
          <img data-before alt="The original image" class="w-full">
          <div class="compare__after">
            <img data-after alt="The image with its background removed" class="w-full">
          </div>
          <div class="compare__handle" aria-hidden="true"></div>
          <input type="range" min="0" max="100" value="50" step="0.5" data-slider aria-label="Slide to compare the original and the cut-out">
        </div>
        <p class="hint text-center">Drag the slider (or swipe) to compare. The right side is the cut-out.</p>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="field">
            <label class="label" for="bg-choice">Background</label>
            <select id="bg-choice" class="select" data-bg>
              <option value="transparent" selected>Transparent (PNG)</option>
              <option value="#ffffff">White</option>
              <option value="#000000">Black</option>
              <option value="custom">Custom colour…</option>
            </select>
          </div>
          <div class="field hidden" data-custom-wrap>
            <label class="label" for="bg-color">Custom colour</label>
            <div class="flex items-center gap-2">
              <input id="bg-color" type="color" class="swatch h-11 w-16" value="#6366f1" data-color>
              <span class="font-mono text-xs text-muted" data-color-label>#6366F1</span>
            </div>
          </div>
        </div>

        <div data-result-note></div>

        <button type="button" class="btn btn-primary btn-block" data-download>${icon('download', 'h-4 w-4')} Download PNG</button>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <button type="button" class="btn btn-secondary btn-sm" data-again>Choose another image</button>
          <span class="hint" data-meta></span>
        </div>
      </section>
    </div>
  `;

  const dropHost = root.querySelector('[data-drop]');
  const loading = root.querySelector('[data-loading]');
  const progressHost = root.querySelector('[data-progress]');
  const editor = root.querySelector('[data-editor]');
  const compare = root.querySelector('[data-compare]');
  const before = root.querySelector('[data-before]');
  const after = root.querySelector('[data-after]');
  const slider = root.querySelector('[data-slider]');
  const bgSelect = root.querySelector('[data-bg]');
  const customWrap = root.querySelector('[data-custom-wrap]');
  const colorInput = root.querySelector('[data-color]');
  const colorLabel = root.querySelector('[data-color-label]');
  const downloadBtn = root.querySelector('[data-download]');
  const resultNote = root.querySelector('[data-result-note]');
  const meta = root.querySelector('[data-meta]');

  let beforeUrl = null;
  let afterUrl = null;
  let resultBlob = null;
  let resultName = 'image-no-bg.png';
  let busy = false;
  let currentFile = null;

  const dropzone = createDropzone({
    accept: 'image/jpeg,image/png,image/webp',
    types: ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'],
    multiple: false,
    maxSizeMB: LIMITS.backgroundMB,
    typeLabel: 'a JPG, PNG or WebP image',
    title: 'Drop a photo here, or <span class="browse">browse</span>',
    hint: `JPG, PNG or WebP · up to ${LIMITS.backgroundMB} MB`,
    iconName: 'wand',
    onFiles: (files) => process(files[0]),
  });
  dropHost.append(dropzone.element);

  onPasteFiles((files) => {
    if (!busy) dropzone.handle(files);
  });

  function cleanupUrls() {
    if (beforeUrl) URL.revokeObjectURL(beforeUrl);
    if (afterUrl) URL.revokeObjectURL(afterUrl);
    beforeUrl = null;
    afterUrl = null;
  }

  function reset() {
    if (busy) return;
    cleanupUrls();
    editor.classList.add('hidden');
    loading.classList.add('hidden');
    resultNote.innerHTML = '';
    resultBlob = null;
    currentFile = null;
    dropzone.clearError();
    setStatus(meta, '');
    slider.value = '50';
    compare.style.setProperty('--split', '50%');
    downloadBtn.disabled = true;
  }

  root.querySelector('[data-again]').addEventListener('click', reset);

  async function process(file) {
    if (busy) return;
    busy = true;
    currentFile = file;
    cleanupUrls();
    resultBlob = null;
    editor.classList.add('hidden');
    loading.classList.remove('hidden');
    resultNote.innerHTML = '';
    downloadBtn.disabled = true;

    const progress = createProgress('Starting the AI model…');
    progressHost.replaceChildren(progress.element);

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      setStatus(meta, `Processing ${file.name}…`);
      progress.set(0, 'Loading the AI model…');

      const blob = await removeBackground(file, {
        model: 'isnet_quint8',
        output: { format: 'image/png' },
        progress: (key, current, total) => {
          const isModel = /\.onnx($|\?)/i.test(key) || /model/i.test(key);
          const isWasm = /\.wasm($|\?)/i.test(key);
          const percent = total ? (current / total) * 100 : 0;
          progress.set(
            percent,
            isModel
              ? 'Downloading the AI model (first run only)…'
              : isWasm
                ? 'Preparing the AI runtime…'
                : 'Loading AI files…',
          );
        },
      });

      resultBlob = blob;
      resultName = `${fileStem(file.name)}-no-bg.png`;
      beforeUrl = URL.createObjectURL(file);
      afterUrl = URL.createObjectURL(blob);
      before.src = beforeUrl;
      after.src = afterUrl;
      slider.value = '50';
      compare.style.setProperty('--split', '50%');

      loading.classList.add('hidden');
      editor.classList.remove('hidden');
      downloadBtn.disabled = false;
      setStatus(meta, `${formatBytes(file.size)} in · ${formatBytes(blob.size)} out`);
      resultNote.innerHTML = `<p class="form-ok flex items-start gap-2 text-xs">${icon('check', 'mt-0.5 h-4 w-4')} <span>Background removed locally. The model is cached, so the next image starts faster.</span></p>`;
    } catch (error) {
      console.error(error);
      const message = describeBackgroundError(error, { online: navigator.onLine !== false });
      toast(message, 'error');
      setStatus(meta, message, 'error');
      loading.classList.add('hidden');
      resultNote.innerHTML = `<div class="space-y-2 rounded-xl border border-danger/30 bg-danger-soft p-3">
        <p class="form-error text-xs">${message}</p>
        <button type="button" class="btn btn-secondary btn-sm" data-retry>${icon('wand', 'h-4 w-4')} Try again</button>
      </div>`;
      resultNote.classList.remove('hidden');
      resultNote.querySelector('[data-retry]')?.addEventListener('click', () => {
        const retryFile = currentFile;
        if (retryFile) process(retryFile);
      });
    } finally {
      busy = false;
      progressHost.replaceChildren();
    }
  }

  slider.addEventListener('input', () => {
    const value = Number(slider.value);
    compare.style.setProperty('--split', `${value}%`);
    slider.setAttribute('aria-valuetext', `${value}% original, ${100 - value}% cut-out`);
  });

  function selectedColor() {
    if (bgSelect.value === 'custom') {
      return isHex(colorInput.value) ? colorInput.value : '#6366f1';
    }
    return bgSelect.value;
  }

  function syncBackgroundPreview() {
    const color = selectedColor();
    if (color === 'transparent') {
      compare.style.backgroundImage = '';
      compare.style.backgroundColor = '';
    } else {
      compare.style.backgroundImage = 'none';
      compare.style.backgroundColor = color;
    }
  }

  bgSelect.addEventListener('change', () => {
    customWrap.classList.toggle('hidden', bgSelect.value !== 'custom');
    syncBackgroundPreview();
  });

  colorInput.addEventListener('input', () => {
    colorLabel.textContent = colorInput.value.toUpperCase();
    syncBackgroundPreview();
  });

  downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    withBusy(
      downloadBtn,
      async () => {
        try {
          const color = selectedColor();
          if (color === 'transparent') {
            download(resultBlob, resultName);
            return;
          }
          const image = await loadUrl(afterUrl);
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;
          const context = canvas.getContext('2d');
          context.fillStyle = color;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const blob = await canvasToBlob(canvas, 'image/png');
          canvas.width = 0;
          canvas.height = 0;
          download(blob, `${fileStem(currentFile?.name || 'image')}-${color.replace('#', '')}.png`);
        } catch (error) {
          console.error(error);
          toast('The PNG could not be created. Try again.', 'error');
        }
      },
      'Preparing…',
    );
  });

  downloadBtn.disabled = true;
}
