import { describe, expect, it } from 'vitest';
import {
  buildEmailPayload,
  buildPhonePayload,
  buildTextPayload,
  buildUrlPayload,
  buildWifiPayload,
  contrastRatio,
  contrastWarning,
  escapeWifi,
} from '../src/lib/qr.js';

describe('QR payloads', () => {
  it('rejects empty input for every type', () => {
    expect(() => buildUrlPayload('  ')).toThrow(/Enter the link/i);
    expect(() => buildTextPayload('')).toThrow(/Enter the text/i);
    expect(() => buildWifiPayload({ ssid: ' ' })).toThrow(/network name/i);
    expect(() => buildEmailPayload({ email: '' })).toThrow(/valid email/i);
    expect(() => buildPhonePayload('')).toThrow(/phone number/i);
  });

  it('adds https:// and rejects unsafe schemes', () => {
    expect(buildUrlPayload('example.com')).toBe('https://example.com');
    expect(() => buildUrlPayload('javascript:alert(1)')).toThrow(/http:\/\/ or https:\/\//i);
  });

  it('keeps very long text intact', () => {
    const long = 'a'.repeat(2000);
    expect(buildTextPayload(long)).toBe(long);
  });

  it('escapes every reserved Wi-Fi character', () => {
    expect(escapeWifi('a;b,c:d\\e"f')).toBe('a\\;b\\,c\\:d\\\\e\\"f');
  });

  it('builds a WPA payload with escaped SSID and password', () => {
    expect(buildWifiPayload({ ssid: 'Cafe;Guest', password: 'p:a,ss', security: 'WPA' })).toBe(
      'WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\,ss;;',
    );
  });

  it('supports open networks and hidden flags', () => {
    expect(buildWifiPayload({ ssid: 'Free', security: 'nopass', hidden: true })).toBe(
      'WIFI:T:nopass;S:Free;P:;H:true;;',
    );
  });

  it('encodes email subject and body', () => {
    expect(
      buildEmailPayload({ email: 'a@b.co', subject: 'Hi there', body: 'Line one' }),
    ).toBe('mailto:a@b.co?subject=Hi%20there&body=Line%20one');
  });

  it('normalises phone numbers', () => {
    expect(buildPhonePayload('+1 (555) 010-9999')).toBe('tel:+15550109999');
  });
});

describe('contrast warnings', () => {
  it('computes the standard black/white ratio', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
  });

  it('warns about inverted codes', () => {
    expect(contrastWarning('#ffffff', '#000000')).toMatch(/lighter than the background/i);
  });

  it('warns about low contrast but not about a safe palette', () => {
    expect(contrastWarning('#999999', '#ffffff')).toMatch(/Low contrast/i);
    expect(contrastWarning('#111827', '#ffffff')).toBe('');
  });
});
