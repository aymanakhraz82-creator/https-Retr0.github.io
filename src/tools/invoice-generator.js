/**
 * Invoice generator — 100% client-side.
 *
 * The form state is the single source of truth for three outputs: the live
 * preview, the printed page and the PDF built with pdf-lib. Drafts, saved
 * clients and the numbering sequence live in localStorage only.
 */
import boldFontUrl from '../assets/fonts/DejaVuSans-Bold.ttf?url';
import regularFontUrl from '../assets/fonts/DejaVuSans.ttf?url';
import { icon } from '../icons.js';
import { billableItems, totalsOf } from '../lib/invoice-math.js';
import { wrapText } from '../lib/text.js';
import { download, imageSize, loadImage, toast, withBusy } from '../ui.js';

const STORAGE = {
  draft: 'uft-invoice:draft:v1',
  clients: 'uft-invoice:clients:v1',
  seq: 'uft-invoice:seq:v1',
};

const TEMPLATES = [
  { id: 'classic', name: 'Classic', hint: 'Rules and clear hierarchy' },
  { id: 'modern', name: 'Modern', hint: 'Colour band header' },
  { id: 'compact', name: 'Compact', hint: 'Dense, boxed sections' },
];

const ACCENTS = ['#4f46e5', '#0f766e', '#b45309', '#be123c', '#334155', '#7c3aed'];

const CURRENCIES = [
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'British Pound'],
  ['MAD', 'Moroccan Dirham'],
  ['CAD', 'Canadian Dollar'],
  ['AUD', 'Australian Dollar'],
  ['CHF', 'Swiss Franc'],
  ['JPY', 'Japanese Yen'],
  ['INR', 'Indian Rupee'],
  ['AED', 'UAE Dirham'],
  ['SAR', 'Saudi Riyal'],
  ['ZAR', 'South African Rand'],
  ['NGN', 'Nigerian Naira'],
  ['KES', 'Kenyan Shilling'],
  ['BRL', 'Brazilian Real'],
  ['MXN', 'Mexican Peso'],
  ['SEK', 'Swedish Krona'],
  ['NOK', 'Norwegian Krone'],
  ['DKK', 'Danish Krone'],
  ['PLN', 'Polish Zloty'],
  ['SGD', 'Singapore Dollar'],
  ['CNY', 'Chinese Yuan'],
  ['TRY', 'Turkish Lira'],
];

const PDF_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const pad = (value) => String(value).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const escapeHtml = (value) => {
  const node = document.createElement('span');
  node.textContent = value == null ? '' : String(value);
  return node.innerHTML;
};

const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value));

const moneyCache = new Map();

function formatMoney(amount, currency) {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  try {
    if (!moneyCache.has(currency)) {
      moneyCache.set(
        currency,
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          currencyDisplay: 'narrowSymbol',
        }),
      );
    }
    return moneyCache.get(currency).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * The invoice embeds DejaVu Sans, so Arabic, accented Latin, Cyrillic and Greek
 * text is written as real glyphs instead of "?". Only control characters that
 * PDF cannot encode are stripped.
 */
function unicodeText(value) {
  return String(value == null ? '' : value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
}

/** Fallback for the built-in Helvetica fonts, which can only encode WinAnsi. */
function winAnsiText(value) {
  return String(value == null ? '' : value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF€]/g, '?');
}

function pdfMoney(amount, currency) {
  const value = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = PDF_SYMBOLS[currency] || `${currency} `;
  return `${prefix}${formatted}`;
}

function formatQty(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  if (Number.isInteger(number)) return String(number);
  return number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ------------------------------------------------------------------ Storage */

function readSeq() {
  try {
    const value = Number(localStorage.getItem(STORAGE.seq));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function invoiceNumberFor(seq) {
  return `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
}

function rememberSequence(number) {
  const match = /(\d+)\s*$/.exec(String(number || ''));
  if (!match) return;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= readSeq()) return;
  try {
    localStorage.setItem(STORAGE.seq, String(value));
  } catch {
    /* Storage blocked — the number simply will not advance. */
  }
}

function nextInvoiceNumber() {
  const seq = readSeq() + 1;
  try {
    localStorage.setItem(STORAGE.seq, String(seq));
  } catch {
    /* Ignore: the invoice still gets a number for this session. */
  }
  return invoiceNumberFor(seq);
}

function defaultState() {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 14);
  return {
    business: { name: '', email: '', address: '', logo: '' },
    client: { name: '', email: '', address: '' },
    meta: {
      number: invoiceNumberFor(readSeq() + 1),
      issueDate: toISO(today),
      dueDate: toISO(due),
      currency: 'USD',
      template: 'classic',
      accent: ACCENTS[0],
    },
    items: [{ id: uid(), description: '', quantity: 1, rate: 0 }],
    taxRate: 0,
    discount: 0,
    shipping: 0,
    notes: '',
    terms: 'Payment due within 14 days. Thank you for your business.',
  };
}

function normalizeState(input) {
  const base = defaultState();
  if (!input || typeof input !== 'object') return base;
  const merged = {
    ...base,
    ...input,
    business: { ...base.business, ...(input.business || {}) },
    client: { ...base.client, ...(input.client || {}) },
    meta: { ...base.meta, ...(input.meta || {}) },
  };

  merged.items =
    Array.isArray(input.items) && input.items.length
      ? input.items.map((item) => ({
          id: item?.id || uid(),
          description: String(item?.description || ''),
          quantity: Math.max(0, Number(item?.quantity) || 0),
          rate: Math.max(0, Number(item?.rate) || 0),
        }))
      : base.items.map((item) => ({ ...item }));

  merged.taxRate = Math.max(0, Number(merged.taxRate) || 0);
  merged.discount = Math.max(0, Number(merged.discount) || 0);
  merged.shipping = Math.max(0, Number(merged.shipping) || 0);
  merged.meta.number = String(merged.meta.number || base.meta.number);
  merged.meta.template = TEMPLATES.some((template) => template.id === merged.meta.template)
    ? merged.meta.template
    : 'classic';
  merged.meta.accent = isHex(merged.meta.accent) ? merged.meta.accent : ACCENTS[0];
  merged.meta.currency = CURRENCIES.some(([code]) => code === merged.meta.currency)
    ? merged.meta.currency
    : 'USD';
  merged.business.logo = typeof merged.business.logo === 'string' ? merged.business.logo : '';
  return merged;
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE.draft);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    return { state: normalizeState(parsed.data), savedAt: Number(parsed.savedAt) || 0 };
  } catch {
    return null;
  }
}

function readClients() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE.clients) || '[]');
    if (!Array.isArray(list)) return [];
    return list
      .filter((client) => client && typeof client.name === 'string' && client.name.trim())
      .slice(0, 25)
      .map((client) => ({
        name: client.name,
        email: String(client.email || ''),
        address: String(client.address || ''),
      }));
  } catch {
    return [];
  }
}

function writeClients(list) {
  try {
    localStorage.setItem(STORAGE.clients, JSON.stringify(list.slice(0, 25)));
    return true;
  } catch {
    toast('Clients could not be saved — browser storage may be full.', 'error');
    return false;
  }
}

/* ------------------------------------------------------------------- PDF */

function hexToRgb(hex) {
  const value = String(hex || '').replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function buildInvoicePdf(state) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();

  // A bundled Unicode font covers Arabic and accented text; if the font asset
  // cannot be fetched (for example a stale cache), fall back to the PDF
  // standard fonts with WinAnsi-safe text so exporting still works.
  let regular;
  let bold;
  let unicode = false;
  try {
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    doc.registerFontkit(fontkit);
    const loadFont = async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Font request failed (${response.status})`);
      return new Uint8Array(await response.arrayBuffer());
    };
    const [regularBytes, boldBytes] = await Promise.all([
      loadFont(regularFontUrl),
      loadFont(boldFontUrl),
    ]);
    regular = await doc.embedFont(regularBytes, { subset: true });
    bold = await doc.embedFont(boldBytes, { subset: true });
    unicode = true;
  } catch (error) {
    console.warn('[invoice] Unicode font unavailable, using Helvetica.', error);
    regular = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }
  const safeText = unicode ? unicodeText : winAnsiText;

  const accent = rgb(...hexToRgb(state.meta.accent));
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.42, 0.46, 0.53);
  const lineColor = rgb(0.88, 0.9, 0.94);
  const white = rgb(1, 1, 1);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 46;
  const totals = totalsOf(state);
  const money = (value) => pdfMoney(value, state.meta.currency);

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  let logoImage = null;
  if (state.business.logo) {
    try {
      logoImage = await doc.embedPng(dataUrlToBytes(state.business.logo));
    } catch {
      logoImage = null;
    }
  }

  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const wrap = (text, font, size, maxWidth) =>
    wrapText(safeText(text), (value) => font.widthOfTextAtSize(value, size), maxWidth);

  const drawText = (text, x, baseline, options = {}) => {
    page.drawText(safeText(text), {
      x,
      y: baseline,
      size: options.size ?? 9,
      font: options.font || regular,
      color: options.color || ink,
    });
  };

  const drawRight = (text, xRight, baseline, options = {}) => {
    const safe = safeText(text);
    const font = options.font || regular;
    const size = options.size ?? 9;
    page.drawText(safe, {
      x: xRight - font.widthOfTextAtSize(safe, size),
      y: baseline,
      size,
      font,
      color: options.color || ink,
    });
  };

  const drawWrapped = (text, x, startY, size, maxWidth, lineHeight) => {
    let cursorY = startY;
    safeText(text)
      .split('\n')
      .forEach((paragraph) => {
        wrap(paragraph, regular, size, maxWidth).forEach((line) => {
          if (cursorY < 80) {
            newPage();
            cursorY = pageHeight - margin;
          }
          drawText(line, x, cursorY, { size, color: muted });
          cursorY -= lineHeight;
        });
      });
    return cursorY;
  };

  const issue = formatDate(state.meta.issueDate);
  const due = formatDate(state.meta.dueDate);
  const template = state.meta.template;

  /* ---------------------------------------------------------------- Header */
  if (template === 'modern') {
    page.drawRectangle({ x: 0, y: pageHeight - 92, width: pageWidth, height: 92, color: accent });
    drawText('INVOICE', margin, pageHeight - 48, { size: 26, font: bold, color: white });
    drawText(state.meta.number, margin, pageHeight - 66, { size: 9, color: white });
    drawRight(`Issued ${issue}`, pageWidth - margin, pageHeight - 48, { size: 9, color: white });
    drawRight(`Due ${due}`, pageWidth - margin, pageHeight - 62, { size: 9, color: white });

    y = pageHeight - 116;
    if (logoImage) {
      const dims = logoImage.scaleToFit(120, 40);
      page.drawImage(logoImage, { x: margin, y: y - dims.height, width: dims.width, height: dims.height });
      y -= dims.height + 10;
    }
    drawText(state.business.name || 'Your business', margin, y, { size: 14, font: bold });
    y -= 14;
    [state.business.email, state.business.address].filter(Boolean).forEach((line) => {
      wrap(line, regular, 9, 260).forEach((part) => {
        drawText(part, margin, y, { size: 9, color: muted });
        y -= 11.5;
      });
    });
  } else {
    let leftY = pageHeight - margin;
    if (logoImage) {
      const dims = logoImage.scaleToFit(130, 44);
      page.drawImage(logoImage, { x: margin, y: leftY - dims.height, width: dims.width, height: dims.height });
      leftY -= dims.height + 12;
    }
    drawText(state.business.name || 'Your business', margin, leftY, {
      size: template === 'compact' ? 13 : 16,
      font: bold,
    });
    leftY -= template === 'compact' ? 13 : 16;
    [state.business.email, state.business.address].filter(Boolean).forEach((line) => {
      wrap(line, regular, 9, 240).forEach((part) => {
        drawText(part, margin, leftY, { size: 9, color: muted });
        leftY -= 11.5;
      });
    });

    let rightY = pageHeight - margin - (template === 'compact' ? 8 : 16);
    drawRight('INVOICE', pageWidth - margin, rightY, {
      size: template === 'compact' ? 18 : 26,
      font: bold,
      color: template === 'compact' ? ink : accent,
    });
    rightY -= template === 'compact' ? 16 : 22;
    drawRight(state.meta.number, pageWidth - margin, rightY, { size: 10, font: bold });
    rightY -= 13;
    drawRight(`Issued ${issue}`, pageWidth - margin, rightY, { size: 9, color: muted });
    rightY -= 12;
    drawRight(`Due ${due}`, pageWidth - margin, rightY, { size: 9, color: muted });

    y = Math.min(leftY, rightY) - 12;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: template === 'classic' ? 2 : 0.8,
      color: template === 'classic' ? accent : lineColor,
    });
    y -= 22;
  }

  /* --------------------------------------------------------------- Parties */
  const partiesTop = y;
  drawText('BILL TO', margin, partiesTop, { size: 7.5, font: bold, color: muted });
  let clientY = partiesTop - 14;
  drawText(state.client.name || 'Client name', margin, clientY, { size: 10.5, font: bold });
  clientY -= 13;
  [state.client.email, state.client.address].filter(Boolean).forEach((line) => {
    wrap(line, regular, 9, 230).forEach((part) => {
      drawText(part, margin, clientY, { size: 9, color: muted });
      clientY -= 11.5;
    });
  });

  drawText('AMOUNT DUE', pageWidth - margin - 150, partiesTop, { size: 7.5, font: bold, color: muted });
  drawRight(money(totals.total), pageWidth - margin, partiesTop - 18, {
    size: 14,
    font: bold,
    color: accent,
  });

  y = Math.min(clientY, partiesTop - 24) - 16;

  /* ----------------------------------------------------------------- Table */
  const columns = { desc: margin, qty: 356, rate: 442, amount: pageWidth - margin };

  const tableHead = (topY) => {
    drawText('DESCRIPTION', columns.desc, topY, { size: 7.5, font: bold, color: muted });
    drawRight('QTY', columns.qty, topY, { size: 7.5, font: bold, color: muted });
    drawRight('RATE', columns.rate, topY, { size: 7.5, font: bold, color: muted });
    drawRight('AMOUNT', columns.amount, topY, { size: 7.5, font: bold, color: muted });
    page.drawLine({
      start: { x: margin, y: topY - 6 },
      end: { x: pageWidth - margin, y: topY - 6 },
      thickness: template === 'classic' ? 1.4 : 0.7,
      color: template === 'classic' ? accent : lineColor,
    });
    return topY - 19;
  };

  let rowTop = tableHead(y);

  const printableItems = billableItems(state);
  if (!printableItems.length) {
    drawText('No billable line items on this invoice.', columns.desc, rowTop - 4, {
      size: 9,
      color: muted,
    });
    rowTop -= 24;
  }

  printableItems.forEach((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const descriptionLines = wrap(item.description || 'Item', regular, 9, 250);
    const rowHeight = Math.max(21, descriptionLines.length * 11.5 + 9);

    if (rowTop - rowHeight < 120) {
      newPage();
      rowTop = tableHead(pageHeight - margin);
    }

    descriptionLines.forEach((line, index) => {
      drawText(line, columns.desc, rowTop - 4 - index * 11.5, { size: 9 });
    });
    const baseline = rowTop - 4;
    drawRight(formatQty(quantity), columns.qty, baseline, { size: 9 });
    drawRight(money(rate), columns.rate, baseline, { size: 9 });
    drawRight(money(quantity * rate), columns.amount, baseline, { size: 9, font: bold });

    page.drawLine({
      start: { x: margin, y: rowTop - rowHeight + 6 },
      end: { x: pageWidth - margin, y: rowTop - rowHeight + 6 },
      thickness: 0.6,
      color: lineColor,
    });
    rowTop -= rowHeight;
  });

  /* ---------------------------------------------------------------- Totals */
  const labelX = 350;
  let totalY = rowTop - 10;
  const totalRow = (label, value, strong = false) => {
    drawText(label, labelX, totalY, {
      size: strong ? 9.5 : 8.5,
      font: strong ? bold : regular,
      color: strong ? ink : muted,
    });
    drawRight(value, pageWidth - margin, totalY, {
      size: strong ? 11 : 8.5,
      font: strong ? bold : regular,
      color: strong ? accent : ink,
    });
    totalY -= strong ? 16 : 13;
  };

  totalRow('Subtotal', money(totals.subtotal));
  if (totals.discount > 0) totalRow('Discount', `-${money(totals.discount)}`);
  if (totals.tax > 0) totalRow(`Tax (${formatQty(state.taxRate)}%)`, money(totals.tax));
  if (totals.shipping > 0) totalRow('Shipping', money(totals.shipping));

  page.drawLine({
    start: { x: labelX, y: totalY + 7 },
    end: { x: pageWidth - margin, y: totalY + 7 },
    thickness: 0.7,
    color: lineColor,
  });

  const totalBaseline = totalY - 5;
  if (template === 'modern') {
    page.drawRectangle({
      x: labelX - 10,
      y: totalBaseline - 8,
      width: pageWidth - margin - labelX + 10,
      height: 24,
      color: accent,
    });
    drawText('TOTAL', labelX, totalBaseline, { size: 9, font: bold, color: white });
    drawRight(money(totals.total), pageWidth - margin - 2, totalBaseline, {
      size: 11,
      font: bold,
      color: white,
    });
  } else {
    drawText('TOTAL', labelX, totalBaseline, { size: 9.5, font: bold, color: ink });
    drawRight(money(totals.total), pageWidth - margin, totalBaseline, {
      size: 12,
      font: bold,
      color: accent,
    });
  }

  /* --------------------------------------------------------- Notes / terms */
  let notesY = rowTop - 4;
  if (state.notes) {
    drawText('NOTES', margin, notesY, { size: 7.5, font: bold, color: muted });
    notesY = drawWrapped(state.notes, margin, notesY - 12, 9, 270, 12) - 10;
  }
  if (state.terms) {
    if (notesY < 110) {
      newPage();
      notesY = pageHeight - margin;
    }
    drawText('PAYMENT TERMS', margin, notesY, { size: 7.5, font: bold, color: muted });
    notesY = drawWrapped(state.terms, margin, notesY - 12, 9, 270, 12);
  }

  /* --------------------------------------------------------------- Footer */
  const pages = doc.getPages();
  pages.forEach((currentPage, index) => {
    const label = pages.length > 1 ? `${index + 1} / ${pages.length}` : state.meta.number;
    currentPage.drawText(safeText(label), {
      x: pageWidth - margin - regular.widthOfTextAtSize(safeText(label), 7.5),
      y: 28,
      size: 7.5,
      font: regular,
      color: muted,
    });
  });

  doc.setTitle(safeText(`Invoice ${state.meta.number}`));
  doc.setCreator('Ultimate Free Tool');
  doc.setProducer('Ultimate Free Tool');
  doc.setCreationDate(new Date());

  const bytes = await doc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

/* ------------------------------------------------------------------- Mount */

export function mount(root) {
  const currencyOptions = CURRENCIES.map(
    ([code, name]) => `<option value="${code}">${code} — ${name}</option>`,
  ).join('');

  root.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent-soft/70 px-3.5 py-3 text-xs leading-relaxed text-accent sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-start gap-2 font-medium">
          ${icon('shield', 'h-4 w-4 mt-0.5')}
          <span>Your data never leaves your device. Drafts, clients and numbers are saved only in this browser.</span>
        </p>
        <span class="pill shrink-0">No upload</span>
      </div>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)]">
        <form class="min-w-0 space-y-6" data-form novalidate>
          <section class="space-y-3" aria-labelledby="inv-business-heading">
            <h2 id="inv-business-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Your business</h2>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label class="label" for="inv-biz-name">Business name</label>
                <input id="inv-biz-name" class="input" data-bind="business.name" placeholder="Alex Rivera Studio" autocomplete="organization">
              </div>
              <div class="field">
                <label class="label" for="inv-biz-email">Email</label>
                <input id="inv-biz-email" class="input" type="email" data-bind="business.email" placeholder="you@studio.com" autocomplete="email">
              </div>
            </div>
            <div class="field">
              <label class="label" for="inv-biz-address">Address</label>
              <textarea id="inv-biz-address" class="textarea min-h-16" rows="2" data-bind="business.address" placeholder="Street, city, country"></textarea>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <span class="flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2" data-logo-thumb>${icon('image', 'h-5 w-5 text-muted')}</span>
              <div class="flex flex-wrap gap-2">
                <label class="btn btn-secondary btn-sm cursor-pointer" for="inv-logo">Upload logo</label>
                <input id="inv-logo" class="hidden" type="file" accept="image/png,image/jpeg,image/webp" data-logo-input>
                <button type="button" class="btn btn-ghost btn-sm" data-logo-remove hidden>Remove logo</button>
              </div>
            </div>
            <p class="hint">PNG, JPG or WebP up to 2 MB. Resized in your browser — never uploaded.</p>
          </section>

          <section class="space-y-3" aria-labelledby="inv-client-heading">
            <div class="flex items-center justify-between gap-2">
              <h2 id="inv-client-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Bill to</h2>
              <button type="button" class="btn btn-ghost btn-sm" data-save-client>${icon('check', 'h-3.5 w-3.5')} Save client</button>
            </div>
            <div class="field">
              <label class="label" for="inv-client-pick">Saved clients</label>
              <select id="inv-client-pick" class="select" data-client-select>
                <option value="">Load a saved client…</option>
              </select>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label class="label" for="inv-client-name">Client name</label>
                <input id="inv-client-name" class="input" data-bind="client.name" placeholder="Northwind Coffee Co." autocomplete="off">
              </div>
              <div class="field">
                <label class="label" for="inv-client-email">Client email</label>
                <input id="inv-client-email" class="input" type="email" data-bind="client.email" placeholder="billing@northwind.com" autocomplete="off">
              </div>
              <div class="field sm:col-span-2">
                <label class="label" for="inv-client-address">Client address</label>
                <textarea id="inv-client-address" class="textarea min-h-16" rows="2" data-bind="client.address" placeholder="Street, city, country"></textarea>
              </div>
            </div>
            <div class="flex flex-wrap gap-2" data-client-chips></div>
          </section>

          <section class="space-y-3" aria-labelledby="inv-meta-heading">
            <h2 id="inv-meta-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Invoice details</h2>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="field">
                <label class="label" for="inv-number">Invoice number</label>
                <div class="flex gap-2">
                  <input id="inv-number" class="input font-mono" data-bind="meta.number" placeholder="INV-2026-0001" autocomplete="off">
                  <button type="button" class="btn btn-secondary btn-sm shrink-0" data-next-number title="Use the next automatic invoice number">Next</button>
                </div>
              </div>
              <div class="field">
                <label class="label" for="inv-currency">Currency</label>
                <select id="inv-currency" class="select" data-bind="meta.currency">${currencyOptions}</select>
              </div>
              <div class="field">
                <label class="label" for="inv-issue">Issue date</label>
                <input id="inv-issue" class="input" type="date" data-bind="meta.issueDate">
              </div>
              <div class="field">
                <label class="label" for="inv-due">Due date</label>
                <input id="inv-due" class="input" type="date" data-bind="meta.dueDate">
              </div>
            </div>
          </section>

          <section class="space-y-3" aria-labelledby="inv-items-heading">
            <div class="flex items-center justify-between gap-2">
              <h2 id="inv-items-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Line items</h2>
              <span class="hint" data-item-count></span>
            </div>
            <div class="space-y-2" data-items></div>
            <button type="button" class="btn btn-secondary btn-sm" data-add-item>+ Add line item</button>
          </section>

          <section class="space-y-3" aria-labelledby="inv-totals-heading">
            <h2 id="inv-totals-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Tax, discount & shipping</h2>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="field">
                <label class="label" for="inv-tax">Tax %</label>
                <input id="inv-tax" class="input" type="number" min="0" max="100" step="0.01" inputmode="decimal" data-bind="taxRate">
              </div>
              <div class="field">
                <label class="label" for="inv-discount">Discount amount</label>
                <input id="inv-discount" class="input" type="number" min="0" step="0.01" inputmode="decimal" data-bind="discount">
              </div>
              <div class="field">
                <label class="label" for="inv-shipping">Shipping</label>
                <input id="inv-shipping" class="input" type="number" min="0" step="0.01" inputmode="decimal" data-bind="shipping">
              </div>
            </div>
            <p class="hint">The discount is applied to the subtotal before tax. Amounts use the invoice currency.</p>
          </section>

          <section class="space-y-3" aria-labelledby="inv-design-heading">
            <h2 id="inv-design-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Template & accent</h2>
            <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Invoice template" data-templates>
              ${TEMPLATES.map(
                (template) => `<button type="button" role="radio" aria-checked="false" class="inv-template" data-template="${template.id}" title="${template.hint}">
                  <span class="inv-template-thumb inv-template-thumb--${template.id}" aria-hidden="true">
                    <span class="bar"></span>
                    <span class="line"></span>
                    <span class="line short"></span>
                  </span>
                  <span>${template.name}</span>
                </button>`,
              ).join('')}
            </div>
            <div class="field">
              <span class="label">Accent colour</span>
              <div class="flex flex-wrap items-center gap-2" data-accents>
                ${ACCENTS.map(
                  (color) =>
                    `<button type="button" class="inv-swatch" style="background:${color}" data-accent="${color}" aria-label="Accent colour ${color}" aria-pressed="false"></button>`,
                ).join('')}
                <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted">
                  Custom
                  <input type="color" class="swatch h-8 w-10" value="${ACCENTS[0]}" data-accent-custom aria-label="Custom accent colour">
                </label>
              </div>
            </div>
          </section>

          <section class="space-y-3" aria-labelledby="inv-notes-heading">
            <h2 id="inv-notes-heading" class="text-xs font-bold uppercase tracking-[0.14em] text-muted">Notes & payment terms</h2>
            <div class="field">
              <label class="label" for="inv-notes">Notes</label>
              <textarea id="inv-notes" class="textarea min-h-16" rows="2" data-bind="notes" placeholder="Thank-you note, bank details or a PO reference"></textarea>
            </div>
            <div class="field">
              <label class="label" for="inv-terms">Payment terms</label>
              <textarea id="inv-terms" class="textarea min-h-16" rows="2" data-bind="terms"></textarea>
            </div>
          </section>

          <section class="rounded-xl border border-line bg-surface-2/40 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-sm font-semibold">Data in this browser</h2>
                <p class="hint mt-1">Drafts, saved clients and numbering stay on this device.</p>
              </div>
              <button type="button" class="btn btn-danger btn-sm" data-clear>Clear data</button>
            </div>
            <p class="hint mt-2 hidden" data-clear-hint>Click again to delete the draft, saved clients and numbering history.</p>
          </section>
        </form>

        <div class="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold">Live preview <span class="pill ml-1">A4</span></h2>
            <p class="hint text-right" data-saved></p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary flex-1 sm:flex-none" data-download>${icon('download', 'h-4 w-4')} Download PDF</button>
            <button type="button" class="btn btn-secondary" data-print>Print</button>
            <button type="button" class="btn btn-ghost" data-new>New invoice</button>
          </div>

          <div class="invoice-scroll max-h-[75vh] overflow-auto p-2 sm:p-4 lg:max-h-[calc(100vh-19rem)]">
            <div data-preview></div>
          </div>

          <p class="hint">The PDF and printout use this layout, template and accent colour. On a phone the table reflows — check the preview before sending.</p>
        </div>
      </div>
    </div>
  `;

  const form = root.querySelector('[data-form]');
  const previewHost = root.querySelector('[data-preview]');
  const itemsHost = root.querySelector('[data-items]');
  const itemCount = root.querySelector('[data-item-count]');
  const savedLabel = root.querySelector('[data-saved]');
  const logoInput = root.querySelector('[data-logo-input]');
  const logoThumb = root.querySelector('[data-logo-thumb]');
  const logoRemove = root.querySelector('[data-logo-remove]');
  const clientSelect = root.querySelector('[data-client-select]');
  const clientChips = root.querySelector('[data-client-chips]');
  const clearBtn = root.querySelector('[data-clear]');
  const clearHint = root.querySelector('[data-clear-hint]');
  const downloadBtn = root.querySelector('[data-download]');

  const restored = loadDraft();
  /** @type {ReturnType<typeof defaultState>} */
  let state = restored ? restored.state : defaultState();
  let saveTimer = null;
  let clearArmed = false;
  let clearTimer = null;

  /* ------------------------------------------------------------- Bindings */

  const getPath = (path) => path.split('.').reduce((value, key) => (value ? value[key] : undefined), state);

  const setPath = (path, value) => {
    const keys = path.split('.');
    let target = state;
    keys.slice(0, -1).forEach((key) => {
      target = target[key];
    });
    target[keys[keys.length - 1]] = value;
  };

  const numericValue = (value) => (value === 0 || value === '0' ? '' : String(value));

  function paintForm() {
    root.querySelectorAll('[data-bind]').forEach((input) => {
      const value = getPath(input.dataset.bind);
      if (input.type === 'number') {
        input.value = numericValue(Number(value) || 0);
      } else {
        input.value = value == null ? '' : value;
      }
    });
    renderLogo();
    renderItems();
    syncDesignControls();
  }

  function renderLogo() {
    const hasLogo = Boolean(state.business.logo);
    logoThumb.innerHTML = hasLogo
      ? `<img src="${state.business.logo}" alt="Business logo preview" class="h-full w-full object-contain">`
      : icon('image', 'h-5 w-5 text-muted');
    logoRemove.hidden = !hasLogo;
  }

  function syncDesignControls() {
    root.querySelectorAll('[data-template]').forEach((button) => {
      const active = button.dataset.template === state.meta.template;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    });
    root.querySelectorAll('[data-accent]').forEach((button) => {
      const active = button.dataset.accent.toLowerCase() === String(state.meta.accent).toLowerCase();
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const custom = root.querySelector('[data-accent-custom]');
    if (custom) custom.value = state.meta.accent;
  }

  function itemRow(item, index) {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const amount = formatMoney(quantity * rate, state.meta.currency);
    return `<div class="grid grid-cols-12 items-start gap-2 rounded-xl border border-line bg-surface p-2" data-item-id="${item.id}">
      <div class="col-span-12 sm:col-span-6">
        <label class="sr-only" for="item-desc-${item.id}">Item ${index + 1} description</label>
        <input id="item-desc-${item.id}" class="input" data-item="description" placeholder="Description (e.g. Website redesign)" value="${escapeHtml(item.description)}">
      </div>
      <div class="col-span-4 sm:col-span-2">
        <label class="sr-only" for="item-qty-${item.id}">Item ${index + 1} quantity</label>
        <input id="item-qty-${item.id}" class="input text-right" type="number" min="0" step="0.01" inputmode="decimal" data-item="quantity" placeholder="Qty" value="${numericValue(quantity)}">
      </div>
      <div class="col-span-4 sm:col-span-2">
        <label class="sr-only" for="item-rate-${item.id}">Item ${index + 1} rate</label>
        <input id="item-rate-${item.id}" class="input text-right" type="number" min="0" step="0.01" inputmode="decimal" data-item="rate" placeholder="Rate" value="${numericValue(rate)}">
      </div>
      <div class="col-span-3 flex h-11 items-center justify-end text-xs font-semibold tabular-nums text-ink sm:col-span-1" data-item-amount>${amount}</div>
      <div class="col-span-1 flex h-11 items-center justify-center">
        <button type="button" class="icon-button h-8 w-8 rounded-lg text-danger" data-remove-item aria-label="Remove line item ${index + 1}">
          ${icon('close', 'h-4 w-4')}
        </button>
      </div>
    </div>`;
  }

  function renderItems() {
    itemsHost.innerHTML = state.items.map(itemRow).join('');
    itemCount.textContent = `${state.items.length} item${state.items.length === 1 ? '' : 's'}`;
    updateItemAmounts();
  }

  function updateItemAmounts() {
    itemsHost.querySelectorAll('[data-item-id]').forEach((row) => {
      const item = state.items.find((entry) => entry.id === row.dataset.itemId);
      if (!item) return;
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const amount = row.querySelector('[data-item-amount]');
      if (amount) amount.textContent = formatMoney(quantity * rate, state.meta.currency);
    });
  }

  /* -------------------------------------------------------------- Preview */

  function previewMarkup() {
    const totals = totalsOf(state);
    const business = state.business;
    const client = state.client;
    const meta = state.meta;
    const money = (value) => formatMoney(value, meta.currency);

    const logo = business.logo
      ? `<img src="${business.logo}" alt="" class="inv-logo">`
      : '';

    const rows = state.items
      .map((item) => {
        const quantity = Math.max(0, Number(item.quantity) || 0);
        const rate = Math.max(0, Number(item.rate) || 0);
        return `<tr>
          <td class="inv-desc">${escapeHtml(item.description || '—')}<span class="inv-mobile-calc">${formatQty(quantity)} × ${money(rate)}</span></td>
          <td class="inv-num inv-qty">${formatQty(quantity)}</td>
          <td class="inv-num inv-rate">${money(rate)}</td>
          <td class="inv-num">${money(quantity * rate)}</td>
        </tr>`;
      })
      .join('');

    const totalRows = [
      `<div class="inv-total-row"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>`,
      totals.discount > 0
        ? `<div class="inv-total-row"><span>Discount</span><span>−${money(totals.discount)}</span></div>`
        : '',
      totals.tax > 0
        ? `<div class="inv-total-row"><span>Tax (${formatQty(state.taxRate)}%)</span><span>${money(totals.tax)}</span></div>`
        : '',
      totals.shipping > 0
        ? `<div class="inv-total-row"><span>Shipping</span><span>${money(totals.shipping)}</span></div>`
        : '',
      `<div class="inv-total-row inv-grand"><span>Total</span><span>${money(totals.total)}</span></div>`,
    ].join('');

    return `<article class="invoice-paper inv--${meta.template}" style="--inv-accent: ${meta.accent}" aria-label="Invoice preview">
      <header class="inv-head">
        <div class="inv-business">
          ${logo}
          <p class="inv-biz-name">${escapeHtml(business.name || 'Your business')}</p>
          ${business.email ? `<p class="inv-small">${escapeHtml(business.email)}</p>` : ''}
          ${business.address ? `<p class="inv-small">${escapeHtml(business.address)}</p>` : ''}
        </div>
        <div class="inv-meta">
          <p class="inv-title">INVOICE</p>
          <div class="inv-meta-lines">
            <span>${escapeHtml(meta.number || 'Invoice number')}</span>
            <span>Issued: <strong>${formatDate(meta.issueDate)}</strong></span>
            <span>Due: <strong>${formatDate(meta.dueDate)}</strong></span>
          </div>
        </div>
      </header>

      <div class="inv-rule"></div>

      <div class="inv-parties">
        <div>
          <p class="inv-label">Bill to</p>
          <p class="inv-client-name">${escapeHtml(client.name || 'Client name')}</p>
          ${client.email ? `<p class="inv-small">${escapeHtml(client.email)}</p>` : ''}
          ${client.address ? `<p class="inv-small">${escapeHtml(client.address)}</p>` : ''}
        </div>
        <div class="inv-meta">
          <p class="inv-label">Amount due</p>
          <p class="inv-amount-due">${money(totals.total)}</p>
        </div>
      </div>

      <table class="inv-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="inv-num inv-qty">Qty</th>
            <th class="inv-num inv-rate">Rate</th>
            <th class="inv-num">Amount</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" class="inv-small">No line items yet.</td></tr>'}</tbody>
      </table>

      <div class="inv-bottom">
        <div class="inv-notes">
          ${state.notes ? `<div><p class="inv-label">Notes</p><p>${escapeHtml(state.notes)}</p></div>` : ''}
          ${state.terms ? `<div><p class="inv-label">Payment terms</p><p>${escapeHtml(state.terms)}</p></div>` : ''}
        </div>
        <div class="inv-totals">${totalRows}</div>
      </div>

      <footer class="inv-foot">
        <span>${escapeHtml(meta.number || '')}</span>
        <span>${escapeHtml(business.email || business.name || '')}</span>
      </footer>
    </article>`;
  }

  function renderPreview() {
    previewHost.innerHTML = previewMarkup();
  }

  /* ---------------------------------------------------------------- Saving */

  function saveDraft() {
    try {
      rememberSequence(state.meta.number);
      localStorage.setItem(STORAGE.draft, JSON.stringify({ savedAt: Date.now(), data: state }));
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      savedLabel.textContent = `Draft saved at ${time} · this browser only`;
    } catch {
      savedLabel.textContent = 'Draft could not be saved — browser storage is full or blocked.';
    }
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 450);
  }

  function afterChange({ rerenderItems = false, rerenderLogo = false } = {}) {
    if (rerenderItems) renderItems();
    if (rerenderLogo) renderLogo();
    updateItemAmounts();
    syncDesignControls();
    renderPreview();
    scheduleSave();
  }

  /* ------------------------------------------------------------ Form events */

  form.addEventListener('submit', (event) => event.preventDefault());

  form.addEventListener('input', (event) => {
    const target = event.target;

    if (target.matches('[data-item]')) {
      const row = target.closest('[data-item-id]');
      const item = state.items.find((entry) => entry.id === row?.dataset.itemId);
      if (!item) return;
      const field = target.dataset.item;
      item[field] = field === 'description' ? target.value : Math.max(0, Number(target.value) || 0);
      afterChange();
      return;
    }

    if (target.matches('[data-accent-custom]')) {
      state.meta.accent = isHex(target.value) ? target.value : state.meta.accent;
      renderPreview();
      syncDesignControls();
      scheduleSave();
      return;
    }

    if (target.matches('[data-bind]')) {
      if (target.tagName === 'SELECT') return; // handled on change
      const path = target.dataset.bind;
      if (target.type === 'number') {
        setPath(path, target.value === '' ? 0 : Math.max(0, Number(target.value) || 0));
      } else {
        setPath(path, target.value);
      }
      afterChange({ rerenderItems: path === 'meta.currency' });
    }
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('select[data-bind]')) {
      setPath(target.dataset.bind, target.value);
      afterChange({ rerenderItems: target.dataset.bind === 'meta.currency' });
    }
  });

  /* ------------------------------------------------------------------ Items */

  root.querySelector('[data-add-item]').addEventListener('click', () => {
    const item = { id: uid(), description: '', quantity: 1, rate: 0 };
    state.items.push(item);
    renderItems();
    renderPreview();
    scheduleSave();
    itemsHost.querySelector(`[data-item-id="${item.id}"] [data-item="description"]`)?.focus();
  });

  itemsHost.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-item]');
    if (!button) return;
    const row = button.closest('[data-item-id]');
    const index = state.items.findIndex((entry) => entry.id === row?.dataset.itemId);
    if (index < 0) return;
    if (state.items.length === 1) {
      state.items[0] = { id: state.items[0].id, description: '', quantity: 1, rate: 0 };
      toast('The last row was cleared. Add another row if you need more.', 'info');
    } else {
      state.items.splice(index, 1);
    }
    afterChange({ rerenderItems: true });
  });

  /* ------------------------------------------------------------------ Logo */

  logoInput.addEventListener('change', async () => {
    const file = logoInput.files?.[0];
    logoInput.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast('Use a PNG, JPG or WebP logo.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('The logo must be under 2 MB.', 'error');
      return;
    }
    try {
      const image = await loadImage(file);
      const { width, height } = imageSize(image);
      if (!width || !height) throw new Error('That image could not be read.');
      const scale = Math.min(1, 400 / width, 200 / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close?.();
      state.business.logo = canvas.toDataURL('image/png');
      canvas.width = 0;
      canvas.height = 0;
      afterChange({ rerenderLogo: true });
      toast('Logo added. It stays in this browser.', 'success');
    } catch (error) {
      console.error(error);
      toast(error.message || 'The logo could not be read.', 'error');
    }
  });

  logoRemove.addEventListener('click', () => {
    state.business.logo = '';
    afterChange({ rerenderLogo: true });
  });

  /* --------------------------------------------------------------- Clients */

  function renderClients() {
    const clients = readClients();
    const current = clientSelect.value;
    clientSelect.innerHTML =
      '<option value="">Load a saved client…</option>' +
      clients
        .map(
          (client, index) =>
            `<option value="${index}">${escapeHtml(client.name)}${client.email ? ` — ${escapeHtml(client.email)}` : ''}</option>`,
        )
        .join('');
    clientSelect.value = clients[current] ? current : '';

    clientChips.innerHTML = clients
      .map(
        (client, index) => `<span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs">
          <button type="button" class="font-medium text-ink hover:text-brand" data-load-client="${index}">${escapeHtml(client.name)}</button>
          <button type="button" class="text-muted hover:text-danger" data-remove-client="${index}" aria-label="Delete saved client ${escapeHtml(client.name)}">${icon('close', 'h-3.5 w-3.5')}</button>
        </span>`,
      )
      .join('');
    if (!clients.length) {
      clientChips.innerHTML = '<p class="hint">No saved clients yet. Fill in the client fields and press “Save client”.</p>';
    }
  }

  function applyClient(client) {
    state.client = {
      name: client.name || '',
      email: client.email || '',
      address: client.address || '',
    };
    paintForm();
    renderPreview();
    scheduleSave();
  }

  clientSelect.addEventListener('change', () => {
    const clients = readClients();
    const client = clients[Number(clientSelect.value)];
    if (client) {
      applyClient(client);
      toast(`Loaded “${client.name}”.`, 'success');
    }
  });

  root.querySelector('[data-save-client]').addEventListener('click', () => {
    const name = state.client.name.trim();
    if (!name) {
      toast('Add a client name before saving.', 'error');
      return;
    }
    const clients = readClients().filter((client) => client.name.toLowerCase() !== name.toLowerCase());
    clients.unshift({ name, email: state.client.email.trim(), address: state.client.address.trim() });
    if (writeClients(clients)) {
      renderClients();
      toast(`“${name}” saved in this browser.`, 'success');
    }
  });

  clientChips.addEventListener('click', (event) => {
    const load = event.target.closest('[data-load-client]');
    const remove = event.target.closest('[data-remove-client]');
    const clients = readClients();
    if (load) {
      const client = clients[Number(load.dataset.loadClient)];
      if (client) {
        applyClient(client);
        toast(`Loaded “${client.name}”.`, 'success');
      }
      return;
    }
    if (remove) {
      const index = Number(remove.dataset.removeClient);
      const client = clients[index];
      if (!client) return;
      clients.splice(index, 1);
      writeClients(clients);
      renderClients();
      toast(`Removed “${client.name}”.`, 'info');
    }
  });

  /* ---------------------------------------------------------------- Design */

  root.querySelector('[data-templates]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-template]');
    if (!button) return;
    state.meta.template = button.dataset.template;
    syncDesignControls();
    renderPreview();
    scheduleSave();
  });

  root.querySelector('[data-accents]')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-accent]');
    if (!button) return;
    state.meta.accent = button.dataset.accent;
    syncDesignControls();
    renderPreview();
    scheduleSave();
  });

  /* ------------------------------------------------------------- Actions */

  root.querySelector('[data-next-number]').addEventListener('click', () => {
    state.meta.number = nextInvoiceNumber();
    const input = root.querySelector('[data-bind="meta.number"]');
    if (input) input.value = state.meta.number;
    renderPreview();
    scheduleSave();
    toast(`Invoice number set to ${state.meta.number}.`, 'info');
  });

  root.querySelector('[data-new]').addEventListener('click', () => {
    if (!window.confirm('Start a new invoice? The current draft will be replaced.')) return;
    rememberSequence(state.meta.number);
    const fresh = defaultState();
    fresh.business = { ...state.business };
    fresh.meta = {
      ...fresh.meta,
      number: nextInvoiceNumber(),
      currency: state.meta.currency,
      template: state.meta.template,
      accent: state.meta.accent,
    };
    fresh.notes = state.notes;
    fresh.terms = state.terms;
    state = fresh;
    paintForm();
    renderPreview();
    saveDraft();
    toast(`New invoice started — ${fresh.meta.number}.`, 'success');
  });

  downloadBtn.addEventListener('click', () => {
    withBusy(
      downloadBtn,
      async () => {
        try {
          const blob = await buildInvoicePdf(state);
          const name = (state.meta.number || 'invoice').replace(/[^\w.-]+/g, '-') || 'invoice';
          download(blob, `${name}.pdf`);
          rememberSequence(state.meta.number);
          saveDraft();
          toast('PDF downloaded. Check the totals before sending.', 'success');
        } catch (error) {
          console.error(error);
          toast('The PDF could not be created. Try again with shorter notes.', 'error');
        }
      },
      'Building PDF…',
    );
  });

  root.querySelector('[data-print]').addEventListener('click', () => {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${escapeHtml(link.href)}">`)
      .join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
      <title>${escapeHtml(state.meta.number || 'Invoice')}</title>${styles}
      <style>
        @page { size: A4; margin: 10mm; }
        html, body { background: #fff !important; margin: 0; padding: 0; }
        .invoice-paper { box-shadow: none !important; border-radius: 0 !important; max-width: none !important; width: 100% !important; padding: 0 !important; font-size: 11px; }
        .inv--modern .inv-head { margin: 0 0 18px !important; padding: 18px !important; border-radius: 4px !important; }
        .inv-table .inv-qty, .inv-table .inv-rate { display: table-cell !important; }
        .inv-mobile-calc { display: none !important; }
      </style></head><body>${previewHost.innerHTML}</body></html>`;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;';
    document.body.append(frame);
    frame.srcdoc = html;
    frame.addEventListener('load', () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch (error) {
        console.error(error);
        toast('Printing was blocked. Download the PDF instead.', 'error');
      } finally {
        window.setTimeout(() => frame.remove(), 60000);
      }
    });
  });

  const resetClearButton = () => {
    clearArmed = false;
    clearBtn.textContent = 'Clear data';
    clearHint.classList.add('hidden');
    window.clearTimeout(clearTimer);
  };

  clearBtn.addEventListener('click', () => {
    if (!clearArmed) {
      clearArmed = true;
      clearBtn.textContent = 'Confirm clear';
      clearHint.classList.remove('hidden');
      clearTimer = window.setTimeout(resetClearButton, 5000);
      return;
    }
    resetClearButton();
    try {
      Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
    } catch {
      /* Nothing to clear if storage is blocked. */
    }
    state = defaultState();
    paintForm();
    renderClients();
    renderPreview();
    savedLabel.textContent = 'All local invoice data cleared.';
    toast('Draft, clients and numbering were deleted from this browser.', 'success');
  });

  /* ------------------------------------------------------------------ Init */

  paintForm();
  renderClients();
  renderPreview();
  if (restored) {
    savedLabel.textContent = 'Draft restored from this browser.';
  }
}
