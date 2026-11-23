import { icon } from '../icons.js';
import {
  attachDragSort,
  createDropzone,
  download,
  formatBytes,
  friendlyPdfError,
  LIMITS,
  outputName,
  setStatus,
  toast,
  withBusy,
} from '../ui.js';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Friendly messages for common PDF error cases. */
const PDF_MESSAGES = {
  notAPDF: 'That file does not look like a valid PDF. It may be damaged or renamed from another format.',
  password: 'This PDF is password-protected. Unlock it in your PDF reader first, then try again.',
  empty: 'The PDF has no pages.',
  memory: 'This PDF is too large for the available memory. Try a smaller file or a desktop browser.',
  tooFew: 'Add at least two PDFs to merge.',
  success: 'Merged and downloaded.',
};

export function mount(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div data-drop></div>

      <section class="hidden space-y-2" data-list-section aria-labelledby="merge-list-heading">
        <div class="flex items-center justify-between gap-3">
          <h2 id="merge-list-heading" class="text-sm font-semibold">Documents
            <span class="font-normal text-muted" data-count></span>
          </h2>
          <button type="button" class="btn btn-ghost btn-sm" data-clear>Clear all</button>
        </div>
        <ul class="space-y-2" data-list></ul>
        <p class="hint">Drag a row to reorder, or use the arrow buttons. The top row becomes the first pages of the merged PDF.</p>
      </section>

      <div class="hidden" data-result></div>

      <div class="space-y-2 pt-1">
        <button type="button" class="btn btn-primary btn-block" data-run disabled>Merge PDFs</button>
        <p class="hint" data-status role="status" aria-live="polite"></p>
      </div>
    </div>
  `;

  const dropHost = root.querySelector('[data-drop]');
  const listSection = root.querySelector('[data-list-section]');
  const list = root.querySelector('[data-list]');
  const count = root.querySelector('[data-count]');
  const clearBtn = root.querySelector('[data-clear]');
  const runBtn = root.querySelector('[data-run]');
  const status = root.querySelector('[data-status]');
  const result = root.querySelector('[data-result]');

  /** @type {{id:string,name:string,size:number,bytes:Uint8Array,pages:number}[]} */
  const items = [];
  let lastBlob = null;
  let lastName = 'merged.pdf';

  const dropzone = createDropzone({
    accept: 'application/pdf',
    types: ['application/pdf', '.pdf'],
    multiple: true,
    maxSizeMB: LIMITS.pdfMB,
    maxFiles: LIMITS.maxPdfFiles,
    typeLabel: 'PDF files',
    title: 'Drop PDFs here, or <span class="browse">browse</span>',
    hint: `2–${LIMITS.maxPdfFiles} PDF files · up to ${LIMITS.pdfMB} MB each`,
    iconName: 'merge',
    onFiles: (files) => addFiles(files),
  });
  dropHost.append(dropzone.element);

  const row = (item, index) => `<li class="file-row" draggable="true" data-id="${item.id}">
    <span class="cursor-grab text-muted" aria-hidden="true">${icon('grip', 'h-5 w-5')}</span>
    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">${icon('merge', 'h-4 w-4')}</span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-medium">${escapeHtml(item.name)}</span>
      <span class="block text-xs text-muted">${item.pages} page${item.pages === 1 ? '' : 's'} · ${formatBytes(item.size)}</span>
    </span>
    <span class="flex items-center gap-1">
      <button type="button" class="icon-button h-8 w-8 rounded-lg" data-move="-1" aria-label="Move ${escapeHtml(item.name)} up" ${index === 0 ? 'disabled' : ''}>
        <span class="rotate-180">${icon('chevron', 'h-4 w-4')}</span>
      </button>
      <button type="button" class="icon-button h-8 w-8 rounded-lg" data-move="1" aria-label="Move ${escapeHtml(item.name)} down" ${index === items.length - 1 ? 'disabled' : ''}>
        ${icon('chevron', 'h-4 w-4')}
      </button>
      <button type="button" class="icon-button h-8 w-8 rounded-lg" data-remove aria-label="Remove ${escapeHtml(item.name)}">
        ${icon('close', 'h-4 w-4')}
      </button>
    </span>
  </li>`;

  function clearResult() {
    lastBlob = null;
    result.innerHTML = '';
    result.classList.add('hidden');
  }

  function render() {
    listSection.classList.toggle('hidden', items.length === 0);
    const pages = items.reduce((total, item) => total + item.pages, 0);
    count.textContent = items.length ? `· ${items.length} file${items.length === 1 ? '' : 's'} · ${pages} pages` : '';
    list.innerHTML = items.map(row).join('');
    runBtn.disabled = items.length < 2;
    if (items.length === 0) setStatus(status, 'Add at least two PDFs to merge.');
    else if (items.length === 1) setStatus(status, 'Add one more PDF to enable merging.');
    else setStatus(status, 'Ready. The merged PDF downloads when it is built.');
  }

  async function addFiles(files) {
    const { PDFDocument } = await import('pdf-lib');
    let added = 0;
    for (const file of files) {
      if (items.length >= LIMITS.maxPdfFiles) {
        toast(`Up to ${LIMITS.maxPdfFiles} PDFs can be merged at once.`, 'error');
        break;
      }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFDocument.load(bytes, { updateMetadata: false });
        items.push({
          id: uid(),
          name: file.name,
          size: file.size,
          bytes,
          pages: doc.getPageCount(),
        });
        added += 1;
      } catch (error) {
        const msg = friendlyPdfError(error);
        setStatus(status, `“${file.name}” could not be added. ${msg}`, 'error');
        toast(`“${file.name}” could not be added: ${msg}`, 'error');
      }
    }
    if (added) {
      clearResult();
      render();
    }
  }

  function moveBy(id, delta) {
    const index = items.findIndex((item) => item.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    clearResult();
    render();
  }

  list.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const rowEl = event.target.closest('[data-id]');
    if (!button || !rowEl) return;
    const id = rowEl.dataset.id;
    if (button.hasAttribute('data-remove')) {
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) items.splice(index, 1);
      clearResult();
      render();
    } else if (button.hasAttribute('data-move')) {
      moveBy(id, Number(button.getAttribute('data-move')));
    }
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

  clearBtn.addEventListener('click', () => {
    items.splice(0);
    clearResult();
    dropzone.clearError();
    render();
  });

  runBtn.addEventListener('click', () => {
    if (items.length < 2) return;
    withBusy(
      runBtn,
      async () => {
        clearResult();
        setStatus(status, 'Copying pages into a new document…');
        try {
          const { PDFDocument } = await import('pdf-lib');
          const merged = await PDFDocument.create();
          let pageTotal = 0;
          for (const item of items) {
            const source = await PDFDocument.load(item.bytes, { updateMetadata: false });
            const copied = await merged.copyPages(source, source.getPageIndices());
            copied.forEach((page) => merged.addPage(page));
            pageTotal += copied.length;
          }
          merged.setTitle('Merged document');
          merged.setCreator('Ultimate Free Tool');
          merged.setProducer('Ultimate Free Tool');
          merged.setCreationDate(new Date());

          const bytes = await merged.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          lastName = outputName(items[0].name, 'merged');
          download(blob, lastName);
          showResult(blob, pageTotal);
          setStatus(status, 'Merged and downloaded.', 'success');
          toast('PDF merged successfully.', 'success');
        } catch (error) {
          console.error(error);
          const msg = friendlyPdfError(error);
          setStatus(status, msg, 'error');
          toast(msg, 'error');
        } finally {
          runBtn.disabled = items.length < 2;
        }
      },
      'Merging…',
    );
  });

  function showResult(blob, pages) {
    lastBlob = blob;
    result.innerHTML = `<div class="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="flex items-center gap-1.5 text-sm font-semibold text-accent">${icon('check', 'h-4 w-4')} Merged successfully</p>
        <p class="text-xs text-accent">${items.length} files · ${pages} pages · ${formatBytes(blob.size)}</p>
      </div>
      <button type="button" class="btn btn-secondary btn-sm shrink-0" data-download>${icon('download', 'h-4 w-4')} Download again</button>
    </div>`;
    result.classList.remove('hidden');
    result.querySelector('[data-download]').addEventListener('click', () => download(lastBlob, lastName));
  }

  render();
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}
