import { describe, expect, it } from 'vitest';
import { describeBackgroundError } from '../src/lib/background.js';
import { activeAffiliateLinks, affiliateLinks, hasAffiliateLinks } from '../src/config/affiliates.js';

describe('describeBackgroundError', () => {
  it('explains offline mode and the cached model', () => {
    const message = describeBackgroundError(new Error('x'), { online: false });
    expect(message).toMatch(/offline/i);
    expect(message).toMatch(/cached|downloaded once/i);
  });

  it('explains a model download failure', () => {
    expect(describeBackgroundError(new Error('Failed to fetch'))).toMatch(/could not be downloaded/i);
    expect(describeBackgroundError(new Error('NetworkError when attempting to fetch resource'))).toMatch(
      /downloaded/i,
    );
  });

  it('explains memory pressure on mobile', () => {
    expect(describeBackgroundError(new Error('RuntimeError: memory access out of bounds'))).toMatch(
      /out of memory/i,
    );
  });

  it('falls back to generic advice', () => {
    expect(describeBackgroundError(new Error('unexpected'))).toMatch(/could not be removed/i);
  });
});

describe('affiliate config', () => {
  it('renders nothing while disabled', () => {
    expect(hasAffiliateLinks()).toBe(false);
    expect(activeAffiliateLinks()).toEqual([]);
  });

  it('still renders nothing when enabled with placeholder URLs', () => {
    const config = {
      enabled: true,
      items: [{ name: 'x', href: 'https://example.com/affiliate' }],
    };
    expect(activeAffiliateLinks(config)).toEqual([]);
  });

  it('renders only complete https links once enabled', () => {
    const config = {
      enabled: true,
      items: [{ name: 'x', href: 'https://partner.test/go' }],
    };
    expect(activeAffiliateLinks(config)).toHaveLength(1);
    expect(affiliateLinks.enabled).toBe(false);
  });
});
