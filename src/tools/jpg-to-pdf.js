import { icon } from '../icons.js';
import { layoutPage } from '../lib/layout.js';
import {
  attachDragSort,
  canvasToBlob,
  createDropzone,
  download,
  formatBytes,
  imageSize,
  LIMITS,
  loadImage,
  outputName,
  setStatus,
  toast,
  withBusy,
} from '../ui.js';

const MARGINS = { none: 0, small: 18, medium: 36 };

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const escapeHtml = (value) => {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
};

/** Renders the image to a white-backed JPEG, capped at 2400 px on the long edge. */
async function prepareImage(file) {
  const image = await loadImage(file);
  const { width, height } = imageSize(image);
  if (!width || !height) throw new Error(`“${file.name}” has no readable image data.`);

  const ratio = Math.min(1, 2400 / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  image.close?.();

  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
  canvas.width = 0;
  canvas.height = 0;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: targetWidth, height: targetHeight };
}

const IMAGE_ERRORS = {
  noData: 'This image could not be opened. Try a JPG or PNG copy.',
  tooLarge: 'This image is too large. Try a smaller file or desktop browser.',
};



export function mount(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div data-drop></div>

      <section class="hidden space-y-4" data-panel aria-labelledby="images-heading">
        <div class="flex items-center justify-between gap-3">
          <h2 id="images-heading" class="text-sm font-semibold">Pages
            <span class="font-normal text-muted" data-count></span>
          </h2>
          <button type="button" class="btn btn-ghost btn-sm" data-clear>Clear all</button>
        </div>

        <ul class="grid gap-3 sm:grid-cols-2" data-list></ul>
        <p class="hint">Drag thumbnails to reorder, or use the arrow buttons. Each image becomes one page.</p>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="field">
            <label class="label" for="page-size">Page size</label>
            <select id="page-size" class="select" data-size>
              <option value="a4" selected>A4</option>
              <option value="letter">US Letter</option>
              <option value="fit">Fit to image</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="page-orientation">Orientation</label>
            <select id="page-orientation" class="select" data-orientation>
              <option value="auto" selected>Auto</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="page-margin">Margin</label>
            <select id="page-margin" class="select" data-margin>
              <option value="none">None</option>
              <option value="small" selected>Small</option>
              <option value="medium">Medium</option>
            </select>
          </div>
        </div>

        <div data-result></div>

        <button type="button" class="btn btn-primary btn-block" data-run>Create PDF</button>
        <p class="hint" data-status role="status" aria-live="polite"></p>
      </section>
    </div>
  `;

  const dropHost = root.querySelector('[data-drop]');
  const panel = root.querySelector('[data-panel]');
  const list = root.querySelector('[data-list]');
  const count = root.querySelector('[data-count]');
  const sizeSelect = root.querySelector('[data-size]');
  const orientationSelect = root.querySelector('[data-orientation]');
  const marginSelect = root.querySelector('[data-margin]');
  const result = root.querySelector('[data-result]');
  const runBtn = root.querySelector('[data-run]');
  const status = root.querySelector('[data-status]');

  /** @type {{id:string,file:File,url:string}[]} */
  const items = [];
  let lastBlob = null;
  let lastName = 'images.pdf';

  const dropzone = createDropzone({
    accept: 'image/jpeg,image/png,image/webp',
    types: ['image/jpeg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'],
    multiple: true,
    maxSizeMB: LIMITS.imageMB,
    maxFiles: 25,
    typeLabel: 'JPG, PNG or WebP images',
    title: 'Drop images here, or <span class="browse">browse</span>',
    hint: `JPG, PNG or WebP · up to 25 images · ${LIMITS.imageMB} MB each`,
    iconName: 'image',
    onFiles: (files) => addFiles(files),
  });
  dropHost.append(dropzone.element);

  const clearResult = () => {
    lastBlob = null;
    result.innerHTML = '';
  };

  const row = (item, index) => `<li class="thumb-card" draggable="true" data-id="${item.id}">
    <div class="thumb-canvas">
      <img src="${item.url}" alt="" class="max-h-full max-w-full object-contain">
    </div>
    <div class="flex items-center gap-1 border-t border-line p-2">
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-2 text-[11px] font-bold text-muted">${index + 1}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xs font-medium" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
        <span class="block text-[11px] text-muted">${formatBytes(item.file.size)}</span>
      </span>
      <button type="button" class="icon-button h-7 w-7 rounded-md" data-move="-1" aria-label="Move image up" ${index === 0 ? 'disabled' : ''}>
        <span class="rotate-180">${icon('chevron', 'h-3.5 w-3.5')}</span>
      </button>
      <button type="button" class="icon-button h-7 w-7 rounded-md" data-move="1" aria-label="Move image down" ${index === items.length - 1 ? 'disabled' : ''}>
        ${icon('chevron', 'h-3.5 w-3.5')}
      </button>
      <button type="button" class="icon-button h-7 w-7 rounded-md" data-remove aria-label="Remove image">
        ${icon('close', 'h-3.5 w-3.5')}
      </button>
    </div>
  </li>`;

  function render() {
    panel.classList.toggle('hidden', items.length === 0);
    count.textContent = items.length ? `· ${items.length} image${items.length === 1 ? '' : 's'}` : '';
    list.innerHTML = items.map(row).join('');
    runBtn.disabled = items.length === 0;
    if (items.length) {
      setStatus(status, `Ready to build a ${items.length}-page PDF.`);
    }
  }

  function addFiles(files) {
    for (const file of files) {
      if (items.length >= 25) {
        toast('Up to 25 images per PDF.', 'error');
        break;
      }
      items.push({ id: uid(), file, url: URL.createObjectURL(file) });
    }
    clearResult();
    dropzone.clearError();
    render();
  }

  function removeAt(index) {
    if (index < 0 || index >= items.length) return;
    URL.revokeObjectURL(items[index].url);
    items.splice(index, 1);
    clearResult();
    render();
    if (!items.length) setStatus(status, '');
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const card = event.target.closest('[data-id]');
    if (!button || !card) return;
    const index = items.findIndex((item) => item.id === card.dataset.id);
    if (index < 0) return;
    if (button.hasAttribute('data-remove')) {
      removeAt(index);
      return;
    }
    const delta = Number(button.getAttribute('data-move'));
    const next = index + delta;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    clearResult();
    render();
  });

  attachDragSort(list, (fromId, toId) => {
    const from = items.findIndex((item) => item.id === fromId);
    const to = items.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    clearResult();
    render();
  });

  root.querySelector('[data-clear]').addEventListener('click', () => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
    items.splice(0);
    clearResult();
    render();
    setStatus(status, '');
  });

  sizeSelect.addEventListener('change', () => {
    orientationSelect.disabled = sizeSelect.value === 'fit';
    orientationSelect.classList.toggle('opacity-55', sizeSelect.value === 'fit');
  });

  runBtn.addEventListener('click', () => {
    if (!items.length) return;
    clearResult();
    const sizeKey = sizeSelect.value;
    const orientation = orientationSelect.value;
    const margin = MARGINS[marginSelect.value] ?? MARGINS.small;

    withBusy(
      runBtn,
      async () => {
        try {
          setStatus(status, 'Preparing images…');
          const { PDFDocument } = await import('pdf-lib');
          const pdf = await PDFDocument.create();

          for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            setStatus(status, `Adding image ${index + 1} of ${items.length}…`);
            const prepared = await prepareImage(item.file);
            const jpeg = await pdf.embedJpg(prepared.bytes);
            const layout = layoutPage(sizeKey, orientation, prepared.width, prepared.height, margin);
            const page = pdf.addPage([layout.pageWidth, layout.pageHeight]);
            page.drawImage(jpeg, {
              x: layout.x,
              y: layout.y,
              width: layout.drawWidth,
              height: layout.drawHeight,
            });
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          pdf.setTitle(items[0].file.name.replace(/\.[^.]+$/, ''));
          pdf.setCreator('Ultimate Free Tool');
          const bytes = await pdf.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          lastName = outputName(items[0].file.name, 'images');
          download(blob, lastName);
          showResult(blob);
          setStatus(status, `PDF created — ${items.length} page${items.length === 1 ? '' : 's'}, ${formatBytes(blob.size)}.`, 'success');
          toast('PDF created successfully.', 'success');
        } catch (error) {
          console.error(error);
          const msg = /memory|allocation|array buffer/i.test(String(error?.message))
            ? 'Your device ran out of memory. Try fewer or smaller images, close other tabs, or use a desktop browser.'
            : error.message || 'The PDF could not be created. Try fewer or smaller images.';
          setStatus(status, msg, 'error');
          toast(msg, 'error');
        } finally {
          runBtn.disabled = items.length === 0;
        }
      },
      'Creating PDF…',
    );
  });

  function showResult(blob) {
    lastBlob = blob;
    result.innerHTML = `<div class="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="flex items-center gap-1.5 text-sm font-semibold text-accent">${icon('check', 'h-4 w-4')} PDF ready</p>
        <p class="text-xs text-accent">${items.length} page${items.length === 1 ? '' : 's'} · ${formatBytes(blob.size)}</p>
      </div>
      <button type="button" class="btn btn-secondary btn-sm shrink-0" data-download>${icon('download', 'h-4 w-4')} Download again</button>
    </div>`;
    result.querySelector('[data-download]').addEventListener('click', () => download(lastBlob, lastName));
  }

  render();
  setStatus(status, '');
}
