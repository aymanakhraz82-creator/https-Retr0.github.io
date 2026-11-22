import QRCode from 'qrcode';
import { icon } from '../icons.js';
import { canvasToBlob, download, toast, withBusy } from '../ui.js';

const TYPES = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Text' },
  { id: 'wifi', label: 'Wi-Fi' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
];

const FIELDS = {
  url: [
    {
      name: 'url',
      label: 'Destination URL',
      type: 'url',
      placeholder: 'https://example.com',
      value: 'https://example.com',
      hint: 'If you leave out the scheme, https:// is added for you.',
    },
  ],
  text: [
    {
      name: 'text',
      label: 'Text',
      type: 'textarea',
      placeholder: 'Any text you want to encode',
      value: '',
    },
  ],
  wifi: [
    { name: 'ssid', label: 'Network name (SSID)', type: 'text', placeholder: 'Cafe-WiFi', value: '' },
    {
      name: 'password',
      label: 'Password',
      type: 'text',
      placeholder: 'Your Wi-Fi password',
      value: '',
      autocomplete: 'off',
      hint: 'Anyone who scans the code can read this password.',
    },
    {
      name: 'security',
      label: 'Security',
      type: 'select',
      value: 'WPA',
      options: [
        ['WPA', 'WPA2 / WPA3'],
        ['WEP', 'WEP'],
        ['nopass', 'Open — no password'],
      ],
    },
    { name: 'hidden', label: 'Hidden network', type: 'checkbox', value: false },
  ],
  email: [
    { name: 'email', label: 'Email address', type: 'email', placeholder: 'name@example.com', value: '' },
    { name: 'subject', label: 'Subject (optional)', type: 'text', value: '' },
    { name: 'body', label: 'Message (optional)', type: 'textarea', value: '' },
  ],
  phone: [
    { name: 'phone', label: 'Phone number', type: 'tel', placeholder: '+1 555 010 9999', value: '' },
  ],
};

const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value);

const CONTRAST_RATIO_MIN = 3;

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

const escapeWifi = (value) => String(value).replace(/([\\;,:"])/g, '\\$1');

function fieldHtml(field) {
  if (field.type === 'checkbox') {
    return `<label class="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input type="checkbox" class="h-4 w-4 accent-[var(--brand-solid)]" data-field="${field.name}" ${field.value ? 'checked' : ''}>
      ${field.label}
    </label>`;
  }

  const id = `qr-field-${field.name}`;
  let control;
  if (field.type === 'select') {
    control = `<select id="${id}" class="select" data-field="${field.name}">
      ${field.options
        .map(
          ([value, label]) =>
            `<option value="${value}" ${value === field.value ? 'selected' : ''}>${label}</option>`,
        )
        .join('')}
    </select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea id="${id}" class="textarea min-h-20" rows="3" data-field="${field.name}" placeholder="${field.placeholder || ''}" spellcheck="false">${field.value || ''}</textarea>`;
  } else {
    control = `<input id="${id}" class="input" type="${field.type}" data-field="${field.name}" value="${field.value || ''}" placeholder="${field.placeholder || ''}" ${field.autocomplete ? `autocomplete="${field.autocomplete}"` : ''} spellcheck="false">`;
  }

  return `<div class="field">
    <label class="label" for="${id}">${field.label}</label>
    ${control}
    ${field.hint ? `<p class="hint">${field.hint}</p>` : ''}
  </div>`;
}

export function mount(root) {
  root.innerHTML = `
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="order-2 space-y-4 lg:order-1">
        <div>
          <span class="label">What should the code contain?</span>
          <div class="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="QR code type" data-types>
            ${TYPES.map(
              (type) =>
                `<button type="button" class="btn btn-secondary btn-sm" data-type="${type.id}" aria-pressed="${type.id === 'url'}">${type.label}</button>`,
            ).join('')}
          </div>
        </div>

        <div class="space-y-3" data-fields></div>

        <div class="divider"></div>

        <div class="space-y-3">
          <h2 class="text-sm font-semibold">Style</h2>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="field">
              <label class="label" for="qr-fg">Foreground colour</label>
              <div class="flex items-center gap-2">
                <input id="qr-fg" type="color" class="swatch h-11 w-16" value="#111827" data-fg>
                <span class="font-mono text-xs text-muted" data-fg-label>#111827</span>
              </div>
            </div>
            <div class="field">
              <label class="label" for="qr-bg">Background colour</label>
              <div class="flex items-center gap-2">
                <input id="qr-bg" type="color" class="swatch h-11 w-16" value="#ffffff" data-bg>
                <span class="font-mono text-xs text-muted" data-bg-label>#FFFFFF</span>
              </div>
            </div>
            <div class="field">
              <label class="label" for="qr-size">PNG size</label>
              <select id="qr-size" class="select" data-size>
                <option value="256">256 × 256 px</option>
                <option value="512" selected>512 × 512 px</option>
                <option value="1024">1024 × 1024 px</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="qr-ec">Error correction</label>
              <select id="qr-ec" class="select" data-ec>
                <option value="L">L — 7% recovery</option>
                <option value="M" selected>M — 15% (recommended)</option>
                <option value="Q">Q — 25%</option>
                <option value="H">H — 30% (densest)</option>
              </select>
            </div>
          </div>
          <p class="hint">SVG output is vector, so it stays sharp at any print size.</p>
        </div>
      </div>

      <aside class="order-1 space-y-3 lg:order-2 lg:sticky lg:top-24">
        <div class="qr-stage">
          <canvas data-canvas width="480" height="480" role="img" aria-label="QR code preview"></canvas>
        </div>
        <p class="form-error hidden" data-error role="alert"></p>
        <p class="hidden rounded-xl border border-warn/30 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn" data-warning></p>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="btn btn-primary" data-png>${icon('download', 'h-4 w-4')} PNG</button>
          <button type="button" class="btn btn-secondary" data-svg>SVG</button>
        </div>
        <p class="hint">Static code: no redirect service, no expiry, no scan tracking. Test it with your phone before printing.</p>
      </aside>
    </div>
  `;

  const typesHost = root.querySelector('[data-types]');
  const fieldsHost = root.querySelector('[data-fields]');
  const canvas = root.querySelector('[data-canvas]');
  const errorEl = root.querySelector('[data-error]');
  const warningEl = root.querySelector('[data-warning]');
  const fgInput = root.querySelector('[data-fg]');
  const bgInput = root.querySelector('[data-bg]');
  const fgLabel = root.querySelector('[data-fg-label]');
  const bgLabel = root.querySelector('[data-bg-label]');
  const sizeSelect = root.querySelector('[data-size]');
  const ecSelect = root.querySelector('[data-ec]');
  const pngBtn = root.querySelector('[data-png]');
  const svgBtn = root.querySelector('[data-svg]');

  let type = 'url';
  let renderId = 0;
  let canDownload = false;
  let debounce = null;

  function readValues() {
    const values = {};
    fieldsHost.querySelectorAll('[data-field]').forEach((input) => {
      values[input.dataset.field] = input.type === 'checkbox' ? input.checked : input.value;
    });
    return values;
  }

  function buildPayload() {
    const values = readValues();
    if (type === 'url') {
      let url = String(values.url || '').trim();
      if (!url) throw new Error('Enter the link you want the code to open.');
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
      if (!/^(https?|mailto|tel):/i.test(url)) {
        throw new Error('Use an http:// or https:// link, or a mailto: / tel: address.');
      }
      return url;
    }
    if (type === 'text') {
      const text = String(values.text || '').trim();
      if (!text) throw new Error('Enter the text you want to encode.');
      return values.text;
    }
    if (type === 'wifi') {
      const ssid = String(values.ssid || '').trim();
      if (!ssid) throw new Error('Enter the network name (SSID).');
      const security = values.security || 'WPA';
      const password = security === 'nopass' ? '' : String(values.password || '');
      if (security !== 'nopass' && !password) {
        throw new Error('Enter the Wi-Fi password, or choose "Open — no password".');
      }
      const hidden = values.hidden ? 'H:true;' : '';
      return `WIFI:T:${security};S:${escapeWifi(ssid)};P:${escapeWifi(password)};${hidden};`;
    }
    if (type === 'email') {
      const email = String(values.email || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        throw new Error('Enter a valid email address, for example name@example.com.');
      }
      const params = [];
      if (String(values.subject || '').trim()) {
        params.push(`subject=${encodeURIComponent(String(values.subject).trim())}`);
      }
      if (String(values.body || '').trim()) {
        params.push(`body=${encodeURIComponent(String(values.body).trim())}`);
      }
      return `mailto:${email}${params.length ? `?${params.join('&')}` : ''}`;
    }
    if (type === 'phone') {
      const phone = String(values.phone || '').replace(/[^\d+]/g, '');
      if (phone.replace(/\D/g, '').length < 3) {
        throw new Error('Enter a phone number, including the country code if possible.');
      }
      return `tel:${phone}`;
    }
    throw new Error('Choose a QR code type first.');
  }

  const colors = () => ({
    dark: isHex(fgInput.value) ? fgInput.value : '#111827',
    light: isHex(bgInput.value) ? bgInput.value : '#ffffff',
  });

  const renderOptions = (width) => ({
    errorCorrectionLevel: ecSelect.value,
    margin: 2,
    width,
    color: colors(),
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.toggle('hidden', !message);
    pngBtn.disabled = Boolean(message);
    svgBtn.disabled = Boolean(message);
    canDownload = !message;
  }

  function updateContrast() {
    const { dark, light } = colors();
    const darkLuminance = relativeLuminance(dark);
    const lightLuminance = relativeLuminance(light);
    const ratio =
      (Math.max(darkLuminance, lightLuminance) + 0.05) /
      (Math.min(darkLuminance, lightLuminance) + 0.05);

    let message = '';
    if (darkLuminance > lightLuminance) {
      message =
        'The foreground is lighter than the background. Inverted codes often fail to scan — swap the two colours for reliable results.';
    } else if (ratio < 3) {
      message =
        'Low contrast between these colours. Some phone cameras will struggle; a darker foreground on a lighter background scans best.';
    }
    warningEl.textContent = message;
    warningEl.classList.toggle('hidden', !message);
  }

  async function render() {
    const current = ++renderId;
    try {
      const payload = buildPayload();
      await QRCode.toCanvas(canvas, payload, renderOptions(480));
      if (current !== renderId) return;
      showError('');
    } catch (error) {
      if (current !== renderId) return;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      showError(friendlyError(error?.message));
    }
    updateContrast();
  }

  function friendlyError(message = '') {
    if (/too big|too long|amount of data|code length overflow/i.test(message)) {
      return 'This content is too long for a QR code at the selected error-correction level. Shorten it or choose level L.';
    }
    if (/No input text/i.test(message)) return 'Enter some content to generate a QR code.';
    if (/low contrast|contrast/i.test(message)) return message;
    return message || 'This QR code could not be generated.';
  }

const CONTRAST_RATIO_MIN = 3;


  const schedule = () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(render, 180);
  };

  function renderFields() {
    fieldsHost.innerHTML = FIELDS[type].map(fieldHtml).join('');
  }

  typesHost.addEventListener('click', (event) => {
    const button = event.target.closest('[data-type]');
    if (!button) return;
    type = button.dataset.type;
    typesHost.querySelectorAll('[data-type]').forEach((item) => {
      const active = item === button;
      item.setAttribute('aria-pressed', String(active));
      item.classList.toggle('btn-primary', active);
      item.classList.toggle('btn-secondary', !active);
    });
    renderFields();
    render();
  });

  fieldsHost.addEventListener('input', schedule);
  fieldsHost.addEventListener('change', schedule);

  [fgInput, bgInput].forEach((input) => {
    input.addEventListener('input', () => {
      fgLabel.textContent = fgInput.value.toUpperCase();
      bgLabel.textContent = bgInput.value.toUpperCase();
      updateContrast();
      schedule();
    });
  });

  ecSelect.addEventListener('change', render);
  sizeSelect.addEventListener('change', () => {
    if (canDownload) toast('PNG size affects the download, not the preview.', 'info');
  });

  pngBtn.addEventListener('click', () => {
    if (!canDownload) return;
    withBusy(
      pngBtn,
      async () => {
        try {
          const payload = buildPayload();
          const target = document.createElement('canvas');
          await QRCode.toCanvas(target, payload, renderOptions(Number(sizeSelect.value)));
          const blob = await canvasToBlob(target, 'image/png');
          target.width = 0;
          target.height = 0;
          download(blob, `qr-code-${type}.png`);
        } catch (error) {
          console.error(error);
          toast(friendlyError(error?.message), 'error');
        }
      },
      'Rendering…',
    );
  });

  svgBtn.addEventListener('click', () => {
    if (!canDownload) return;
    withBusy(
      svgBtn,
      async () => {
        try {
          const payload = buildPayload();
          const svg = await QRCode.toString(payload, {
            type: 'svg',
            ...renderOptions(Number(sizeSelect.value)),
          });
          download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `qr-code-${type}.svg`);
        } catch (error) {
          console.error(error);
          toast(friendlyError(error?.message), 'error');
        }
      },
      'Rendering…',
    );
  });

  typesHost.querySelectorAll('[data-type]').forEach((item) => {
    const active = item.dataset.type === type;
    item.classList.toggle('btn-primary', active);
    item.classList.toggle('btn-secondary', !active);
  });

  renderFields();
  render();
}
