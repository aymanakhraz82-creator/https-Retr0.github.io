/**
 * Affiliate / "Recommended tools" links for the invoice page.
 *
 * TODO: paste your real affiliate URLs below, then set `enabled: true`.
 *
 * Rules the generator enforces:
 *   - Nothing is rendered while `enabled` is false.
 *   - An entry whose `href` is empty, still points at example.com, or is not
 *     https:// is treated as unset, so a half-finished config can never publish
 *     a broken or undisclosed outbound link.
 *   - Rendered links always carry rel="sponsored noopener".
 *
 * Disclosure: the section is labelled "Sponsored" and shows
 * "Affiliate links. We may earn a commission at no extra cost to you."
 */
export const affiliateLinks = {
  enabled: false,
  items: [
    {
      name: 'Invoicing app',
      category: 'Invoicing',
      description: 'Send branded invoices, automatic reminders and payment links from one dashboard.',
      // TODO: replace with your real affiliate URL.
      href: '',
    },
    {
      name: 'Small-business accounting',
      category: 'Accounting',
      description: 'Track expenses, reconcile accounts and produce reports your accountant can use.',
      // TODO: replace with your real affiliate URL.
      href: '',
    },
    {
      name: 'Online payments',
      category: 'Payments',
      description: 'Accept cards and bank transfers with a hosted checkout or a simple payment link.',
      // TODO: replace with your real affiliate URL.
      href: '',
    },
  ],
};

const isRealAffiliateUrl = (href) => {
  const value = String(href || '').trim();
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const { hostname } = new URL(value);
    return Boolean(hostname) && !/(^|\.)example\.(com|org|net)$/i.test(hostname);
  } catch {
    return false;
  }
};

/** The links that may be rendered right now (usually none until configured). */
export function activeAffiliateLinks(config = affiliateLinks) {
  if (!config || config.enabled !== true) return [];
  const items = Array.isArray(config.items) ? config.items : [];
  if (!items.length || !items.every((item) => isRealAffiliateUrl(item.href))) return [];
  return items;
}

/** True when the section can be shown. Used by the static page generator. */
export function hasAffiliateLinks(config = affiliateLinks) {
  return activeAffiliateLinks(config).length > 0;
}
