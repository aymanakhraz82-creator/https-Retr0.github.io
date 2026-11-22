import { icon } from '../icons.js';
import { pdfjsLib } from '../lib/pdf.js';
import {
  canvasToBlob,
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

const LEVELS = {
  light: { scale: 2, quality: 0.85, label: 'Light — sharper pages, larger file' },
  balanced: { scale: 1.5, quality: 0.72, label: 'Balanced — recommended for email' },
  strong: { scale: 1.1, quality: 0.55, label: 'Strong — smallest file, softer images' },
};

export function mount(root) {
  root.innerHTML = `
    <div class="space-y-4">
      <div data-drop role="button" tabindex="0" aria-label="Choose a file, or drag and drop it here">
        <span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">${icon('compress', 'h-5 w-5')}</span>
        <p class="dropzone-title">Drop a large PDF here, or <span class="browse">browse</span></p>
        <p class="hint">PDF only · up to ${LIMITS.pdfMB} MB</p>
      </div>

      <section class="hidden space-y-4" data-panel>
        <div class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">${icon('compress', 'h-5 w-5')}</span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-sm font-semibold" data-name></h2>
            <p class="text-xs text-muted" data-meta></p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-reset>Change file</button>
        </div>

        <div class="field">
          <label class="label" for="compress-level">Compression level</label>
          <select id="compress-level" class="select" data-level>
            <option value="light">Light — sharper pages, larger file</option>
            <option value="balanced" selected>Balanced — recommended for email</option>
            <option value="strong">Strong — smallest file, softer images</option>
          </select>
          <p class="hint">Every page is re-rendered as a JPEG. Text will not be selectable in the result.</p>
        </div>

        <div data-progress></div>
        <div data-result></div>

        <button type="button" class="btn btn-primary btn-block" data-run>Compress PDF</button>
        <p class="hint" data-status role="status" aria-live="polite"></p>
      </section>
    </div>
  `;

  const dropHost = root.querySelector('[data-drop]');
  const panel = root.querySelector('[data-panel]');
  const nameEl = root.querySelector('[data-name]');
  const metaEl = root.querySelector('[data-meta]');
  const levelSelect = root.querySelector('[data-level]');
  const progressHost = root.querySelector('[data-progress]');
  const result = root.querySelector('[data-result]');
  const runBtn = root.querySelector('[data-run]');
  const status = root.querySelector('[data-status]');

  let state = null; // { file, bytes, pages }
  let lastBlob = null;
  let lastName = 'compressed.pdf';

  const dropzone = createDropzone({
    accept: 'application/pdf',
    types: ['application/pdf', '.pdf'],
    multiple: false,
    maxSizeMB: LIMITS.pdfMB,
    typeLabel: 'a PDF file',
    title: 'Drop a large PDF here, or <span class="browse">browse</span>',
    hint: `PDF only · up to ${LIMITS.pdfMB} MB`,
    iconName: 'compress',
    onFiles: (files) => load(files[0]),
  });
  dropHost.append(dropzone.element);

  function reset() {
    state = null;
    lastBlob = null;
    panel.classList.add('hidden');
    progressHost.innerHTML = '';
    result.innerHTML = '';
    setStatus(status, '');
    dropzone.clearError();
  }

  root.querySelector('[data-reset]').addEventListener('click', reset);

  async function load(file) {
    reset();
    setStatus(status, 'Reading the document…');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(bytes, { updateMetadata: false });
      const pages = doc.getPageCount();
      if (!pages) throw new Error('This PDF has no pages.');
      if (pages > 300) throw new Error('This PDF has more than 300 pages. Split it first, then compress each part.');
      state = { file, bytes, pages };
      nameEl.textContent = file.name;
      metaEl.textContent = `${pages} page${pages === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
      panel.classList.remove('hidden');
      setStatus(status, 'Choose a level, then compress.');
    } catch (error) {
      console.error(error);
      setStatus(status, friendlyPdfError(error), 'error');
      toast(friendlyPdfError(error), 'error');
    }
  }

  runBtn.addEventListener('click', () => {
    if (!state) return;
    const level = LEVELS[levelSelect.value] || LEVELS.balanced;
    result.innerHTML = '';
    lastBlob = null;

    const progress = createProgress(`Preparing ${state.pages} page${state.pages === 1 ? '' : 's'}…`);
    progressHost.replaceChildren(progress.element);

    withBusy(
      runBtn,
      async () => {
        try {
          setStatus(status, 'Rendering pages on your device…');
          const pdf = await pdfjsLib.getDocument({ data: state.bytes.slice(), isEvalSupported: false }).promise;
          const { PDFDocument } = await import('pdf-lib');
          const out = await PDFDocument.create();

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: level.scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.floor(viewport.width));
            canvas.height = Math.max(1, Math.floor(viewport.height));
            const context = canvas.getContext('2d', { alpha: false });
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: context, viewport, canvas }).promise;

            const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', level.quality);
            const jpeg = await out.embedJpg(new Uint8Array(await jpegBlob.arrayBuffer()));
            const outputPage = out.addPage([viewport.width, viewport.height]);
            outputPage.drawImage(jpeg, {
              x: 0,
              y: 0,
              width: viewport.width,
              height: viewport.height,
            });

            canvas.width = 0;
            canvas.height = 0;
            page.cleanup();
            progress.set((pageNumber / pdf.numPages) * 100, `Compressing page ${pageNumber} of ${pdf.numPages}…`);
            await new Promise((resolve) => setTimeout(resolve, 0));
          }

          progress.set(100, 'Finishing the PDF…');
          const bytes = await out.save({ useObjectStreams: true });
          const blob = new Blob([bytes], { type: 'application/pdf' });
          lastName = outputName(state.file.name, 'compressed');
          download(blob, lastName);

          const saved = state.file.size - blob.size;
          const percent = state.file.size ? Math.round((saved / state.file.size) * 100) : 0;
          showResult(blob, saved, percent);
          setStatus(
            status,
            saved > 0
              ? `Done — ${percent}% smaller. Text is no longer selectable in this copy.`
              : 'This PDF could not be made smaller without losing more detail. Keep the original.',
            saved > 0 ? 'success' : 'error',
          );
          toast(saved > 0 ? `PDF compressed — ${percent}% smaller.` : 'This PDF could not be made smaller without losing more detail.', saved > 0 ? 'success' : 'error');
        } catch (error) {
          console.error(error);
          setStatus(status, friendlyPdfError(error), 'error');
          toast(friendlyPdfError(error), 'error');
        } finally {
          progressHost.replaceChildren();
          runBtn.disabled = !state;
        }
      },
      'Compressing…',
    );
  });

  function showResult(blob, saved, percent) {
    lastBlob = blob;
    const smaller = saved > 0;
    result.innerHTML = `<div class="space-y-3 rounded-xl border ${smaller ? 'border-accent/30 bg-accent-soft' : 'border-warn/30 bg-warn-soft'} p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="flex items-center gap-1.5 text-sm font-semibold ${smaller ? 'text-accent' : 'text-warn'}">
            ${icon(smaller ? 'check' : 'spark', 'h-4 w-4')} ${smaller ? 'Smaller PDF ready' : 'No size saving'}
          </p>
          <p class="text-xs ${smaller ? 'text-accent' : 'text-warn'}">${formatBytes(state.file.size)} → ${formatBytes(blob.size)}${smaller ? ` (${percent}% smaller)` : ''}</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm shrink-0" data-download>${icon('download', 'h-4 w-4')} Download</button>
      </div>
      <p class="text-xs leading-relaxed ${smaller ? 'text-accent' : 'text-warn'}">${smaller ? 'Images and text are now one flat image per page.' : 'The original is already compressed. The re-rendered copy is larger, so keeping the original is better.'}</p>
    </div>`;
    result.querySelector('[data-download]').addEventListener('click', () => download(lastBlob, lastName));
  }

  setStatus(status, '');
}
