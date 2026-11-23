/**
 * Pure payload + contrast logic for the QR code generator.
 * Escaping follows the MECARD/WIFI convention: \ ; , : " are backslash-escaped.
 */

export const CONTRAST_RATIO_MIN = 3;

export function escapeWifi(value) {
  return String(value ?? '').replace(/([\\;,:"])/g, '\\$1');
}

export function buildUrlPayload(raw) {
  let url = String(raw ?? '').trim();
  if (!url) throw new Error('Enter the link you want the code to open.');
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  if (!/^(https?|mailto|tel):/i.test(url)) {
    throw new Error('Use an http:// or https:// link, or a mailto: / tel: address.');
  }
  return url;
}

export function buildTextPayload(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('Enter the text you want to encode.');
  return String(raw);
}

export function buildWifiPayload({ ssid, password, security = 'WPA', hidden = false } = {}) {
  const name = String(ssid ?? '').trim();
  if (!name) throw new Error('Enter the network name (SSID).');
  const type = security || 'WPA';
  const secret = type === 'nopass' ? '' : String(password ?? '');
  if (type !== 'nopass' && !secret) {
    throw new Error('Enter the Wi-Fi password, or choose "Open — no password".');
  }
  const hiddenField = hidden ? 'H:true;' : '';
  return `WIFI:T:${type};S:${escapeWifi(name)};P:${escapeWifi(secret)};${hiddenField};`;
}

export function buildEmailPayload({ email, subject, body } = {}) {
  const address = String(email ?? '').trim();
  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
    throw new Error('Enter a valid email address, for example name@example.com.');
  }
  const params = [];
  if (String(subject ?? '').trim()) params.push(`subject=${encodeURIComponent(String(subject).trim())}`);
  if (String(body ?? '').trim()) params.push(`body=${encodeURIComponent(String(body).trim())}`);
  return `mailto:${address}${params.length ? `?${params.join('&')}` : ''}`;
}

export function buildPhonePayload(raw) {
  const phone = String(raw ?? '').replace(/[^\d+]/g, '');
  if (phone.replace(/\D/g, '').length < 3) {
    throw new Error('Enter a phone number, including the country code if possible.');
  }
  return `tel:${phone}`;
}

export function relativeLuminance(hex) {
  const value = String(hex ?? '').replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Returns the warning to show, or '' when the colours are safe. */
export function contrastWarning(foreground, background) {
  const darkLuminance = relativeLuminance(foreground);
  const lightLuminance = relativeLuminance(background);
  if (darkLuminance > lightLuminance) {
    return 'The foreground is lighter than the background. Inverted codes often fail to scan — swap the two colours for reliable results.';
  }
  if (contrastRatio(foreground, background) < CONTRAST_RATIO_MIN) {
    return 'Low contrast between these colours. Some phone cameras will struggle; a darker foreground on a lighter background scans best.';
  }
  return '';
}
