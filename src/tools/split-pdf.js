import { icon } from '../icons.js';
import {
  createDropzone,
  download,
  formatBytes,
  friendlyPdfError,
  LIMITS,
  outputName,
  parsePageRanges,
  parseRangeGroups,
  setStatus,
  toast,
  withBusy,
} from '../ui.js';

export function mount(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div data-drop role="button" tabindex="0" aria-label="Choose a file, or drag and drop it here">
        <span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">${icon('split', 'h-5 w-5')}</span>
        <p class="dropzone-title">Drop a PDF here, or <span class="browse">browse</span></p>
        <p class="hint">PDF only · up to ${LIMITS.pdfMB} MB</p>
      </div>

      <section class="hidden space-y-4" data-panel aria-labelledby="split-file-heading">
        <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">${icon('split', 'h-5 w-5')}</span>
          <div class="min-w-0 flex-1">
            <h2 id="split-file-heading" class="truncate text-sm font-semibold" data-name></h2>
            <p class="text-xs text-muted" data-meta></p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-reset>Change file</button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="field sm:col-span-2">
            <label class="label" for="split-pages">Pages to keep</label>
            <input id="split-pages" class="input font-mono" data-ranges type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="1-3, 7, 10">
            <p class="hint">Commas separate pages or ranges. Example: <span class="font-mono">1-3, 7, 10</span>.</p>
          </div>

          <div class="field">
            <label class="label" for="split-mode">Output</label>
            <select id="split-mode" class="select" data-mode>
              <option value="single">One PDF with the selected pages</option>
              <option value="separate">One PDF per range</option>
            </select>
          </div>

          <div class="field">
            <span class="label">Quick pick</span>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn btn-secondary btn-sm" data-preset="first">First page</button>
              <button type="button" class="btn btn-secondary btn-sm" data-preset="last">Last page</button>
              <button type="button" class="btn btn-secondary btn-sm" data-preset="all">All pages</button>
            </div>
          </div>
        </div>

        <p class="form-error hidden" data-error role="alert"></p>

        <button type="button" class="btn btn-primary btn-block" data-run>Extract pages</button>
        <p class="hint" data-status role="status" aria-live="polite"></p>
      </section>
    </div>
  `;

  const dropHost = root.querySelector('[data-drop]');
  const panel = root.querySelector('[data-panel]');
  const nameEl = root.querySelector('[data-name]');
  const metaEl = root.querySelector('[data-meta]');
  const rangesInput = root.querySelector('[data-ranges]');
  const modeSelect = root.querySelector('[data-mode]');
  const errorEl = root.querySelector('[data-error]');
  const status = root.querySelector('[data-status]');
  const runBtn = root.querySelector('[data-run]');

  let state = null;
  let loading = false;

  const dropzone = createDropzone({
    accept: 'application/pdf',
    types: ['application/pdf', '.pdf'],
    multiple: false,
    maxSizeMB: LIMITS.pdfMB,
    typeLabel: 'a PDF file',
    title: 'Drop a PDF here, or <span class="browse">browse</span>',
    hint: `PDF only · up to ${LIMITS.pdfMB} MB`,
    iconName: 'split',
    onFiles: (files) => load(files[0]),
  });
  dropHost.append(dropzone.element);

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  };
  const clearError = () => {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  };

  async function load(file) {
    if (loading) return;
    loading = true;
    clearError();
    setStatus(status, 'Reading the document…');
    try {
      const { openWithPdfLib } = await import('../lib/pdf.js');
      const { doc } = await openWithPdfLib(file);
      const pageCount = doc.getPageCount();
      if (!pageCount) throw new Error('This PDF has no pages.');
      state = { name: file.name, size: file.size, doc, pageCount };
      nameEl.textContent = file.name;
      metaEl.textContent = `${pageCount} page${pageCount === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      rangesInput.value = pageCount === 1 ? '1' : `1-${pageCount}`;
      panel.classList.remove('hidden');
      setStatus(status, 'Pick the pages you want, then extract.');
    } catch (error) {
      console.error(error);
      panel.classList.add('hidden');
      state = null;
      setStatus(status, friendlyPdfError(error), 'error');
      toast(friendlyPdfError(error), 'error');
    } finally {
      loading = false;
    }
  }

  function reset() {
    state = null;
    panel.classList.add('hidden');
    clearError();
    setStatus(status, '');
    dropzone.clearError();
  }

  root.querySelector('[data-reset]').addEventListener('click', reset);

  root.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!state) return;
      const preset = button.getAttribute('data-preset');
      if (preset === 'first') rangesInput.value = '1';
      else if (preset === 'last') rangesInput.value = String(state.pageCount);
      else rangesInput.value = state.pageCount === 1 ? '1' : `1-${state.pageCount}`;
      clearError();
      rangesInput.focus();
    });
  });

  modeSelect.addEventListener('change', () => {
    runBtn.textContent = modeSelect.value === 'separate' ? 'Split into PDFs' : 'Extract pages';
    clearError();
  });

  rangesInput.addEventListener('input', clearError);

  runBtn.addEventListener('click', () => {
    if (!state) return;
    clearError();
    withBusy(
      runBtn,
      async () => {
        try {
          const { PDFDocument } = await import('pdf-lib');

          if (modeSelect.value === 'separate') {
            const groups = parseRangeGroups(rangesInput.value, state.pageCount);
            if (groups.length > 20) {
              throw new Error('That would create more than 20 files. Use larger ranges or run it in batches.');
            }
            setStatus(status, `Building ${groups.length} PDF${groups.length === 1 ? '' : 's'}…`);
            const usesAllPages = groups.flat().length === state.pageCount && groups.length === 1;
            for (let index = 0; index < groups.length; index += 1) {
              const group = groups[index];
              const out = await PDFDocument.create();
              const copied = await out.copyPages(state.doc, group.map((page) => page - 1));
              copied.forEach((page) => out.addPage(page));
              const bytes = await out.save();
              const suffix = usesAllPages ? 'all-pages' : `part-${index + 1}`;
              download(new Blob([bytes], { type: 'application/pdf' }), outputName(state.name, suffix));
              setStatus(status, `Saved file ${index + 1} of ${groups.length}…`);
              if (index < groups.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
            }
            setStatus(
              status,
              `Saved ${groups.length} PDF${groups.length === 1 ? '' : 's'}. If your browser blocked some downloads, allow multiple downloads for this site.`,
              'success',
            );
            toast(`Saved ${groups.length} PDF${groups.length === 1 ? '' : 's'}. Check your downloads folder.`, 'success');
            return;
          }

          const pages = parsePageRanges(rangesInput.value, state.pageCount);
          if (pages.length === state.pageCount) {
            setStatus(status, 'That selects every page. Building a copy…');
          } else {
            setStatus(status, `Copying ${pages.length} page${pages.length === 1 ? '' : 's'}…`);
          }
          const out = await PDFDocument.create();
          const copied = await out.copyPages(state.doc, pages.map((page) => page - 1));
          copied.forEach((page) => out.addPage(page));
          const bytes = await out.save();
          const suffix =
            pages.length === state.pageCount
              ? 'all-pages'
              : pages.length === 1
                ? `page-${pages[0]}`
                : `${pages.length}-pages`;
          const filename = outputName(state.name, suffix);
          download(new Blob([bytes], { type: 'application/pdf' }), filename);
          setStatus(status, `Done — ${pages.length} page${pages.length === 1 ? '' : 's'} saved as ${filename}.`, 'success');
          toast(`Saved ${pages.length} page${pages.length === 1 ? '' : 's'} as ${filename}.`, 'success');
        } catch (error) {
          console.error(error);
          showError(error.message || friendlyPdfError(error));
          setStatus(status, friendlyPdfError(error), 'error');
          toast(error.message || friendlyPdfError(error), 'error');
        }
      },
      'Working…',
    );
  });

  setStatus(status, '');
}
