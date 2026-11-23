import { icon } from '../icons.js';
import { hasKeptPages, keptCount, moveBy, normalizeRotation, restorePages } from '../lib/organize.js';
import { closePdfjs, openWithPdfjs } from '../lib/pdf.js';
import {
  attachDragSort,
  createDropzone,
  createProgress,
  download,
  formatBytes,
  friendlyPdfError,
  LIMITS,
  outputName,
  setStatus,
  toast,
  withBusy,
} from '../ui.js';

const MAX_PAGES = 300;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function mount(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div data-drop></div>

      <section class="hidden space-y-4" data-panel aria-labelledby="organize-heading">
        <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">${icon('layers', 'h-5 w-5')}</span>
          <div class="min-w-0 flex-1">
            <h2 id="organize-heading" class="truncate text-sm font-semibold" data-name></h2>
            <p class="text-xs text-muted" data-meta></p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-reset>Change file</button>
        </div>

        <div data-progress></div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-muted" data-summary></p>
          <button type="button" class="btn btn-secondary btn-sm" data-restore>Reset changes</button>
        </div>

        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-grid></ul>

        <p class="hint">Rotate a page, delete it, or drag it to a new spot. Use the arrow buttons on touch screens. Nothing is applied until you save.</p>

        <div data-result></div>

        <button type="button" class="btn btn-primary btn-block" data-save>Save PDF</button>
        <p class="hint" data-status role="status" aria-live="polite"></p>
      </section>
    </div>
  `;

  const dropHost = root.querySelector('[data-drop]');
  const panel = root.querySelector('[data-panel]');
  const nameEl = root.querySelector('[data-name]');
  const metaEl = root.querySelector('[data-meta]');
  const summary = root.querySelector('[data-summary]');
  const grid = root.querySelector('[data-grid]');
  const progressHost = root.querySelector('[data-progress]');
  const result = root.querySelector('[data-result]');
  const status = root.querySelector('[data-status]');
  const saveButtons = root.querySelectorAll('[data-save]');

  /** @type {{file:File,bytes:Uint8Array,pages:{id:string,sourceIndex:number,rotation:number,deleted:boolean,canvas:HTMLCanvasElement,card:HTMLLIElement}[]}|null} */
  let state = null;
  let lastBlob = null;
  let lastName = 'organized.pdf';
  let busy = false;

  const dropzone = createDropzone({
    accept: 'application/pdf',
    types: ['application/pdf', '.pdf'],
    multiple: false,
    maxSizeMB: LIMITS.pdfMB,
    typeLabel: 'a PDF file',
    title: 'Drop a PDF here, or <span class="browse">browse</span>',
    hint: `PDF only · up to ${LIMITS.pdfMB} MB · ${MAX_PAGES} pages`,
    iconName: 'layers',
    onFiles: (files) => load(files[0]),
  });
  dropHost.append(dropzone.element);

  function updateSummary() {
    if (!state) return;
    const kept = keptCount(state.pages);
    const removed = state.pages.length - kept;
    summary.textContent = `${kept} of ${state.pages.length} pages kept${removed ? ` · ${removed} removed` : ''}${kept ? '' : ' — keep at least one page to save'}`;
    saveButtons.forEach((button) => {
      button.disabled = !hasKeptPages(state.pages) || busy;
    });
    state.pages.forEach((page) => {
      page.card.classList.toggle('opacity-45', page.deleted);
      const label = page.card.querySelector('[data-rotation]');
      label.textContent = page.rotation ? `${page.rotation}°` : '';
      const del = page.card.querySelector('[data-delete]');
      del.innerHTML = page.deleted ? icon('check', 'h-3.5 w-3.5') : icon('trash', 'h-3.5 w-3.5');
      del.setAttribute('aria-label', page.deleted ? `Restore original page ${page.sourceIndex + 1}` : `Delete page ${page.sourceIndex + 1}`);
      const index = state.pages.indexOf(page);
      const prev = page.card.querySelector('[data-move="-1"]');
      const next = page.card.querySelector('[data-move="1"]');
      if (prev) prev.disabled = index === 0 || page.deleted;
      if (next) next.disabled = index === state.pages.length - 1 || page.deleted;
      const canvas = page.canvas;
      canvas.style.transform = `rotate(${page.rotation}deg) scale(${page.rotation % 180 ? 0.7 : 1})`;
    });
  }

  function reset() {
    if (busy) return;
    state = null;
    lastBlob = null;
    panel.classList.add('hidden');
    grid.innerHTML = '';
    progressHost.innerHTML = '';
    result.innerHTML = '';
    setStatus(status, '');
    dropzone.clearError();
  }

  root.querySelector('[data-reset]').addEventListener('click', reset);

  async function load(file) {
    if (busy) return;
    reset();
    busy = true;
    setStatus(status, 'Reading the document…');
    panel.classList.remove('hidden');
    nameEl.textContent = file.name;
    metaEl.textContent = formatBytes(file.size);
    const progress = createProgress('Opening the PDF…');
    progressHost.replaceChildren(progress.element);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(bytes, { updateMetadata: false });
      if (doc.getPageCount() > MAX_PAGES) {
        throw new Error(`This PDF has ${doc.getPageCount()} pages. The organizer handles up to ${MAX_PAGES} pages.`);
      }
      const pdf = await openWithPdfjs(file);
      if (pdf.numPages > MAX_PAGES) throw new Error(`This PDF has ${pdf.numPages} pages. Keep it under ${MAX_PAGES}.`);
      const totalPages = pdf.numPages;

      state = { file, bytes, pages: [] };
      grid.innerHTML = '';

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.6, 190 / base.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        page.cleanup();

        const record = {
          id: uid(),
          sourceIndex: pageNumber - 1,
          rotation: 0,
          deleted: false,
          canvas,
          card: buildCard(pageNumber),
        };
        record.card.querySelector('[data-canvas]').append(canvas);
        state.pages.push(record);
        grid.append(record.card);

        progress.set((pageNumber / totalPages) * 100, `Rendering page ${pageNumber} of ${totalPages}…`);
        if (pageNumber % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }

      await closePdfjs(pdf);
      metaEl.textContent = `${totalPages} page${totalPages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      updateSummary();
      setStatus(status, 'Make your changes, then save a new copy.');
    } catch (error) {
      console.error(error);
      if (state && state.pages.length === 0) state = null;
      panel.classList.add('hidden');
      setStatus(status, friendlyPdfError(error), 'error');
      toast(friendlyPdfError(error), 'error');
    } finally {
      busy = false;
      progressHost.replaceChildren();
      updateSummary();
    }
  }

  function buildCard(pageNumber) {
    const card = document.createElement('li');
    card.className = 'thumb-card';
    card.draggable = true;
    card.dataset.id = uid();
    card.innerHTML = `
      <div class="thumb-canvas" data-canvas></div>
      <div class="space-y-1 border-t border-line p-1.5">
        <div class="flex items-center justify-between px-1">
          <span class="text-[11px] font-semibold text-muted">Page ${pageNumber}</span>
          <span class="text-[10px] font-medium text-brand" data-rotation></span>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <button type="button" class="icon-button h-7 w-7 rounded-md" data-move="-1" aria-label="Move page ${pageNumber} earlier">
            <span class="rotate-180">${icon('chevron', 'h-3.5 w-3.5')}</span>
          </button>
          <button type="button" class="icon-button h-7 w-7 rounded-md" data-move="1" aria-label="Move page ${pageNumber} later">
            ${icon('chevron', 'h-3.5 w-3.5')}
          </button>
          <button type="button" class="icon-button h-7 w-7 rounded-md" data-rotate="-90" aria-label="Rotate page ${pageNumber} counter-clockwise">
            <span class="-scale-x-100">${icon('rotate', 'h-3.5 w-3.5')}</span>
          </button>
          <button type="button" class="icon-button h-7 w-7 rounded-md" data-rotate="90" aria-label="Rotate page ${pageNumber} clockwise">
            ${icon('rotate', 'h-3.5 w-3.5')}
          </button>
          <button type="button" class="icon-button h-7 w-7 rounded-md text-danger" data-delete aria-label="Delete page ${pageNumber}">
            ${icon('trash', 'h-3.5 w-3.5')}
          </button>
        </div>
      </div>`;
    return card;
  }

  grid.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const card = event.target.closest('[data-id]');
    if (!button || !card || !state) return;
    const record = state.pages.find((page) => page.card === card);
    if (!record) return;

    if (button.hasAttribute('data-delete')) {
      record.deleted = !record.deleted;
      if (record.deleted) record.rotation = normalizeRotation(record.rotation);
      updateSummary();
      return;
    }

    if (button.hasAttribute('data-rotate')) {
      record.rotation = normalizeRotation(record.rotation, button.getAttribute('data-rotate'));
      updateSummary();
      return;
    }

    if (button.hasAttribute('data-move')) {
      moveBy(state.pages, state.pages.indexOf(record), button.getAttribute('data-move'));
      syncOrder();
    }
  });

  function syncOrder() {
    if (!state) return;
    state.pages.forEach((page) => grid.append(page.card));
    updateSummary();
  }

  attachDragSort(grid, (fromId, toId) => {
    if (!state) return;
    const from = state.pages.findIndex((page) => page.card.dataset.id === fromId);
    const to = state.pages.findIndex((page) => page.card.dataset.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = state.pages.splice(from, 1);
    state.pages.splice(to, 0, moved);
    syncOrder();
  });

  root.querySelector('[data-restore]').addEventListener('click', () => {
    if (!state) return;
    state.pages = restorePages(state.pages);
    syncOrder();
    result.innerHTML = '';
    lastBlob = null;
    setStatus(status, 'All changes reset.');
  });

  saveButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!state || busy) return;
      const kept = state.pages.filter((page) => !page.deleted);
      if (!hasKeptPages(state.pages)) {
        setStatus(status, 'Every page is deleted, so there is nothing to save. Restore at least one page first.', 'error');
        return;
      }
      result.innerHTML = '';
      lastBlob = null;
      busy = true;

      withBusy(
        button,
        async () => {
          try {
            setStatus(status, 'Building the new PDF…');
            const { PDFDocument, degrees } = await import('pdf-lib');
            const source = await PDFDocument.load(state.bytes, { updateMetadata: false });
            const out = await PDFDocument.create();
            const copies = await out.copyPages(
              source,
              kept.map((page) => page.sourceIndex),
            );
            copies.forEach((page, index) => {
              const base = page.getRotation().angle;
              const total = (((base + kept[index].rotation) % 360) + 360) % 360;
              page.setRotation(degrees(total));
              out.addPage(page);
            });
            out.setCreator('Ultimate Free Tool');
            const bytes = await out.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            lastName = outputName(state.file.name, 'organized');
            download(blob, lastName);
            lastBlob = blob;
            result.innerHTML = `<div class="flex flex-col gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="flex items-center gap-1.5 text-sm font-semibold text-accent">${icon('check', 'h-4 w-4')} Saved ${kept.length} pages</p>
                <p class="text-xs text-accent">${formatBytes(blob.size)} · your original file is unchanged</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm shrink-0" data-download>${icon('download', 'h-4 w-4')} Download again</button>
            </div>`;
            result.querySelector('[data-download]').addEventListener('click', () => download(lastBlob, lastName));
            setStatus(status, 'Saved and downloaded.', 'success');
          } catch (error) {
            console.error(error);
            setStatus(status, friendlyPdfError(error), 'error');
          } finally {
            busy = false;
            updateSummary();
          }
        },
        'Saving…',
      );
    });
  });

  setStatus(status, '');
}
