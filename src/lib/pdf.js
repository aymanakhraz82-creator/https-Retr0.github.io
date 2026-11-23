/**
 * pdf.js loading. The worker URL is resolved by Vite so the library works both
 * in dev and in the static build, with no CDN request.
 */
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };

/** Loads a File into a pdf.js document (for rendering / page counts). */
export async function openWithPdfjs(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return pdfjsLib.getDocument({ data: bytes, isEvalSupported: false }).promise;
}

/**
 * Releases a pdf.js document. pdf.js v6 moved teardown from the document proxy to
 * its loading task, so try each API in turn instead of assuming `destroy` exists.
 */
export async function closePdfjs(pdf) {
  if (!pdf) return;
  try {
    if (typeof pdf.destroy === 'function') await pdf.destroy();
    else if (typeof pdf.loadingTask?.destroy === 'function') await pdf.loadingTask.destroy();
    else if (typeof pdf.cleanup === 'function') await pdf.cleanup();
  } catch {
    /* Cleanup is best-effort: the pages are already rendered at this point. */
  }
}

/** Loads a File with pdf-lib (for editing). Returns the document and raw bytes. */
export async function openWithPdfLib(file) {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return { doc, bytes };
}

export async function getPdfLib() {
  return import('pdf-lib');
}
