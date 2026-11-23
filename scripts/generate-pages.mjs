/**
 * Generates every static HTML page, the sitemap and robots.txt from
 * tools.config.js. Runs automatically before `npm run dev` and `npm run build`.
 *
 * Every route is a real HTML file (<slug>/index.html) rather than a client-side
 * route, so GitHub Pages can serve it directly and crawlers get the full page
 * content, metadata and structured data without running JavaScript.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeAffiliateLinks } from '../src/config/affiliates.js';
import { site, tools, staticPages, homeFaqs } from '../tools.config.js';
import { icon, brandMark } from '../src/icons.js';
import { pages as staticContent } from './content.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
// Canonical URLs, Open Graph URLs, sitemap.xml and robots.txt all come from
// this single value, derived from `deployment` in tools.config.js.
const SITE_URL = site.baseUrl.replace(/\/+$/, '');
const today = new Date().toISOString().slice(0, 10);
const year = new Date().getFullYear();

const esc = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const abs = (route) => `${SITE_URL}${route}`;
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

const faqSchema = (faqs) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
});

const organization = {
  '@type': 'Organization',
  name: site.name,
  url: abs('/'),
  description: site.description,
};

/* ------------------------------------------------------------------ Chrome */

const themeScript = `<script>
  (function () {
    try {
      var stored = localStorage.getItem('uft-theme');
      var dark = stored ? stored === 'dark' : true;
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.classList.toggle('light', !dark);
    } catch (error) {}
  })();
</script>`;

function head({ title, description, route, type = 'website', robots = 'index,follow', schema = null }) {
  const canonical = abs(route);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#fbf6ee" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a0f1c" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs('/' + site.ogImage)}">
<meta property="og:image:width" content="1392">
<meta property="og:image:height" content="752">
<meta property="og:image:alt" content="${esc(site.name)} — ${esc(site.tagline)}">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${abs('/' + site.ogImage)}">
<link rel="icon" href="%BASE_URL%favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/src/styles.css">
${themeScript}
<script type="module" src="/src/main.js"></script>
${schema ? jsonLd(schema) : ''}
</head>`;
}

const toolLink = (tool, extra = '') => `<a href="%BASE_URL%${tool.slug}/" class="${extra}">
  <span class="icon-tile">${icon(tool.icon, 'h-5 w-5')}</span>
  <span class="min-w-0">
    <span class="block text-sm font-semibold text-ink">${esc(tool.name)}</span>
    <span class="block truncate text-xs text-muted">${esc(tool.category)} tool</span>
  </span>
</a>`;

const toolsMenu = () => `<div id="tools-panel" class="tools-panel hidden" data-tools-panel>
  <div class="container-page grid gap-1 p-3 sm:grid-cols-2 lg:grid-cols-3">
    ${tools.map((tool) => toolLink(tool, 'flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-surface-2')).join('\n    ')}
  </div>
  <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-4 py-3 sm:px-6">
    <p class="text-xs text-muted">Every tool runs in your browser. Nothing is uploaded.</p>
    <a href="%BASE_URL%#tools" class="inline-flex items-center gap-1 text-sm font-semibold text-brand">All tools ${icon('arrow', 'h-4 w-4')}</a>
  </div>
</div>`;

function header(active = '') {
  const nav = (href, label, key) =>
    `<a class="nav-link" href="${href}"${active === key ? ' aria-current="page"' : ''}>${esc(label)}</a>`;

  return `<header class="site-header relative">
  <div class="container-page flex h-16 items-center justify-between gap-2">
    <a class="brand-link" href="%BASE_URL%" aria-label="${esc(site.name)} home">
      ${brandMark('h-8 w-8 shrink-0')}
      <span class="brand-word">Ultimate <span class="text-brand">Free</span> Tool</span>
    </a>

    <nav class="hidden items-center gap-1 md:flex" aria-label="Main">
      <button type="button" class="nav-link inline-flex items-center gap-1" data-tools-toggle aria-expanded="false" aria-controls="tools-panel">
        Tools ${icon('chevron', 'h-4 w-4')}
      </button>
      ${nav('%BASE_URL%#tools', 'All tools', 'home')}
      ${nav('%BASE_URL%about/', 'About', 'about')}
      ${nav('%BASE_URL%contact/', 'Contact', 'contact')}
    </nav>

    <div class="flex items-center gap-2">
      <button type="button" class="icon-button" data-theme-toggle aria-label="Switch to dark theme">
        <span class="dark:hidden">${icon('moon', 'h-5 w-5')}</span>
        <span class="hidden dark:block">${icon('sun', 'h-5 w-5')}</span>
      </button>
      <button type="button" class="icon-button md:hidden" data-menu-toggle aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
        ${icon('menu', 'h-5 w-5')}
      </button>
    </div>
  </div>

  <div id="mobile-menu" class="hidden border-t border-line bg-surface md:hidden" data-mobile-menu>
    <div class="container-page space-y-1 py-3">
      <p class="px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Tools</p>
      ${tools.map((tool) => toolLink(tool, 'flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2')).join('\n      ')}
      <p class="px-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Site</p>
      <a class="nav-link block" href="%BASE_URL%#tools">All tools</a>
      <a class="nav-link block" href="%BASE_URL%about/">About</a>
      <a class="nav-link block" href="%BASE_URL%contact/">Contact</a>
      <a class="nav-link block" href="%BASE_URL%privacy/">Privacy</a>
      <a class="nav-link block" href="%BASE_URL%terms/">Terms</a>
    </div>
  </div>

  ${toolsMenu()}
</header>

<div class="container-page pt-3">
  <aside class="ad-slot ad-slot--header" aria-label="Advertisement">
    <!-- AD SLOT (header): replace this comment with your ad unit markup. -->
  </aside>
</div>`;
}

const donateButton = () =>
  `<a class="btn-donate" href="${esc(site.donateUrl)}" target="_blank" rel="noopener noreferrer">Support this project</a>`;

const footer = () => `<footer class="site-footer">
  <div class="container-page grid gap-8 py-10 md:grid-cols-4">
    <div class="md:col-span-2">
      <a class="brand-link" href="%BASE_URL%">
        ${brandMark('h-8 w-8')}
        <span class="brand-word">Ultimate <span class="text-brand">Free</span> Tool</span>
      </a>
      <p class="mt-3 max-w-sm text-sm leading-relaxed text-muted">${esc(site.description)}</p>
      <p class="pill pill-accent mt-4 font-semibold">
        ${icon('shield', 'h-4 w-4')} 100% client-side · no uploads
      </p>
      <p class="mt-5">${donateButton()}</p>
    </div>
    <div>
      <h2 class="footer-heading">Tools</h2>
      <ul class="mt-3 space-y-2 text-sm">
        ${tools.map((tool) => `<li><a class="footer-link" href="%BASE_URL%${tool.slug}/">${esc(tool.name)}</a></li>`).join('\n        ')}
      </ul>
    </div>
    <div>
      <h2 class="footer-heading">Site</h2>
      <ul class="mt-3 space-y-2 text-sm">
        <li><a class="footer-link" href="%BASE_URL%about/">About</a></li>
        <li><a class="footer-link" href="%BASE_URL%contact/">Contact</a></li>
        <li><a class="footer-link" href="%BASE_URL%privacy/">Privacy policy</a></li>
        <li><a class="footer-link" href="%BASE_URL%terms/">Terms of use</a></li>
        <li><a class="footer-link" href="%BASE_URL%sitemap.xml">Sitemap</a></li>
        <li><a class="footer-link" href="${site.repoUrl}" target="_blank" rel="noopener">Source code</a></li>
        <li><a class="footer-link" href="${site.licenseUrl}" target="_blank" rel="noopener">License (${esc(site.license)})</a></li>
        ${site.contactEmail ? `<li><a class="footer-link" href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a></li>` : ''}
      </ul>
    </div>
  </div>
  <div class="border-t border-line">
    <div class="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>© <span data-year>${year}</span> ${esc(site.name)}. Free tools, no accounts.</p>
      <p class="inline-flex items-center gap-1.5">${icon('lock', 'h-4 w-4')} Your files never leave your device.</p>
    </div>
  </div>
</footer>`;

const pageShell = ({ head: headHtml, active, body, footerExtra = '' }) => `${headHtml}
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(active)}
${body}
${footer()}
${footerExtra}
</body>
</html>
`;

/* ------------------------------------------------------------------- Cards */

const cardAccent = { PDF: 'pdf', Images: 'images', Business: 'business', Utilities: 'utilities' };

const toolCard = (tool) => `<a href="%BASE_URL%${tool.slug}/" class="tool-card tool-card--${cardAccent[tool.category] || 'pdf'}">
  <span class="tool-card__top">
    <span class="icon-tile">${icon(tool.icon, 'h-5 w-5')}</span>
    <span class="tool-card__tag">${esc(tool.category)}</span>
  </span>
  <span class="tool-card__name">${esc(tool.name)}</span>
  <span class="tool-card__desc">${esc(tool.description)}</span>
  <span class="tool-card__more">Open tool ${icon('arrow', 'h-4 w-4')}</span>
</a>`;

const faqBlock = (faqs, heading = 'Frequently asked questions') => `<section class="card card-pad" aria-labelledby="faq-heading">
  <h2 id="faq-heading" class="text-lg font-bold tracking-tight">${esc(heading)}</h2>
  <div class="mt-2 divide-y divide-line">
    ${faqs
      .map(
        (item) => `<details class="faq">
      <summary>${esc(item.q)} ${icon('chevron', 'h-5 w-5 faq-icon')}</summary>
      <p>${esc(item.a)}</p>
    </details>`,
      )
      .join('\n    ')}
  </div>
</section>`;

const relatedBlock = (tool) => {
  const related = tool.related.map((slug) => tools.find((item) => item.slug === slug)).filter(Boolean);
  if (!related.length) return '';
  return `<section aria-labelledby="related-heading">
    <h2 id="related-heading" class="text-lg font-bold tracking-tight">Related tools</h2>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      ${related
        .map(
          (item) => `<a href="%BASE_URL%${item.slug}/" class="card flex items-center gap-3 p-4 transition hover:border-brand/45">
        <span class="icon-tile">${icon(item.icon, 'h-5 w-5')}</span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-ink">${esc(item.name)}</span>
          <span class="block truncate text-xs text-muted">${esc(item.title.split(' — ')[0])}</span>
        </span>
      </a>`,
        )
        .join('\n      ')}
    </div>
  </section>`;
};

const recommendedBlock = (tool) => {
  // Rendered only for the invoice page and only once real affiliate URLs are
  // configured in src/config/affiliates.js. No placeholder links ever ship.
  const links = activeAffiliateLinks();
  if (tool.slug !== 'invoice-generator' || !links.length) return '';
  return `<section class="card card-pad" aria-labelledby="recommended-heading">
    <div class="flex flex-wrap items-center gap-2">
      <h2 id="recommended-heading" class="text-lg font-bold tracking-tight">Recommended tools</h2>
      <span class="pill">Sponsored</span>
    </div>
    <p class="mt-1 text-xs text-muted">Affiliate links. We may earn a commission at no extra cost to you.</p>
    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      ${links
        .map(
          (item) => `<a href="${esc(item.href)}" target="_blank" rel="sponsored noopener" class="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-2/40 p-4 transition hover:border-brand/45">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted">${esc(item.category)}</span>
        <span class="text-sm font-semibold text-ink">${esc(item.name)}</span>
        <span class="text-xs leading-relaxed text-muted">${esc(item.description)}</span>
        <span class="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-brand">Visit site ${icon('arrow', 'h-3.5 w-3.5')}</span>
      </a>`,
        )
        .join('\n      ')}
    </div>
  </section>`;
};

/* ------------------------------------------------------------------ Builders */

function buildHome() {
  const route = '/';
  const title = `${site.name} — Free PDF, Invoice, Image & QR Tools`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: site.name,
        url: abs('/'),
        description: site.description,
        inLanguage: 'en',
        publisher: organization,
      },
      {
        '@type': 'ItemList',
        name: 'Free browser tools',
        itemListElement: tools.map((tool, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: tool.name,
          url: abs(`/${tool.slug}/`),
        })),
      },
      faqSchema(homeFaqs),
    ],
  };

  const body = `<main id="main">
  <section class="hero">
    <div class="hero-sky" aria-hidden="true"></div>
    <div class="container-page hero-inner">
      <span class="pill pill-accent">${icon('shield', 'h-4 w-4')} Your files never leave your device</span>
      <h1 class="hero-title">Everyday file tools, <span class="text-brand">without the upload</span>.</h1>
      <p class="hero-lead">Merge and split PDFs, shrink a scan, remove a photo background, make a QR code or write an invoice — free, in your browser. No sign-up, no watermark, no waiting in a queue.</p>
      <div class="hero-actions">
        <a class="btn btn-primary btn-block sm:w-auto" href="#tools">Browse the tools ${icon('arrow', 'h-4 w-4')}</a>
        <a class="btn btn-secondary" href="%BASE_URL%about/">How it works</a>
      </div>
      <ul class="trust-chips">
        <li class="trust-chip">${icon('check', 'h-4 w-4')} No uploads</li>
        <li class="trust-chip">${icon('check', 'h-4 w-4')} No account</li>
        <li class="trust-chip">${icon('check', 'h-4 w-4')} No watermark</li>
        <li class="trust-chip">${icon('check', 'h-4 w-4')} Mobile friendly</li>
      </ul>
    </div>
  </section>

  <section id="tools" class="container-page section scroll-mt-24" aria-labelledby="tools-heading">
    <div class="section-head">
      <div>
        <h2 id="tools-heading" class="section-title">All tools</h2>
        <p class="section-sub">${tools.length} tools. Every one runs locally in your browser.</p>
      </div>
      <p class="section-note">No limits, no watermarks</p>
    </div>

    <div class="tools-grid">
      ${tools.map(toolCard).join('\n      ')}
    </div>
  </section>

  <section class="container-page section" aria-labelledby="how-heading">
    <div class="card card-pad sm:p-8">
      <h2 id="how-heading" class="section-title">How a browser-only tool works</h2>
      <div class="step-list mt-6">
        <div class="space-y-2">
          <span class="step-number">1</span>
          <h3 class="text-sm font-semibold">Pick a tool and add your file</h3>
          <p class="text-sm leading-relaxed text-muted">Your browser reads the file from disk. Nothing is sent over the network, so there is no upload bar to watch.</p>
        </div>
        <div class="space-y-2">
          <span class="step-number">2</span>
          <h3 class="text-sm font-semibold">The work happens on your device</h3>
          <p class="text-sm leading-relaxed text-muted">JavaScript libraries open and rebuild the file in memory. The privacy badge on each tool explains what runs.</p>
        </div>
        <div class="space-y-2">
          <span class="step-number">3</span>
          <h3 class="text-sm font-semibold">Download the result</h3>
          <p class="text-sm leading-relaxed text-muted">The generated file is handed straight back to you. Reload the page and every trace of it is gone.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="container-page section" aria-labelledby="privacy-heading">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="card card-pad">
        <span class="icon-tile mb-3">${icon('lock', 'h-5 w-5')}</span>
        <h2 id="privacy-heading" class="font-sans text-sm font-semibold">Private by architecture</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-muted">There is no backend to receive a file. That is a design choice, not a promise in a policy.</p>
      </div>
      <div class="card card-pad">
        <span class="icon-tile mb-3">${icon('zap', 'h-5 w-5')}</span>
        <h2 class="text-sm font-semibold">Fast, even on bad Wi-Fi</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-muted">No upload means no waiting. A 30 MB PDF is processed at disk speed, not connection speed.</p>
      </div>
      <div class="card card-pad">
        <span class="icon-tile mb-3">${icon('spark', 'h-5 w-5')}</span>
        <h2 class="text-sm font-semibold">Free without a catch</h2>
        <p class="mt-1.5 text-sm leading-relaxed text-muted">No trial, account or export fee. Labelled ads cover hosting; the tools stay free.</p>
      </div>
    </div>
  </section>

  <div class="container-page section">
    ${faqBlock(homeFaqs, 'Questions about the tools')}
  </div>

  <div class="container-page pb-12">
    <aside class="ad-slot ad-slot--footer" aria-label="Advertisement">
      <!-- AD SLOT (below content): replace this comment with your ad unit markup. -->
    </aside>
  </div>
</main>`;

  return pageShell({
    head: head({ title, description: site.description, route }),
    active: 'home',
    body,
  });
}

function buildToolPage(tool) {
  const route = `/${tool.slug}/`;
  const title = tool.title;
  const url = abs(route);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
          { '@type': 'ListItem', position: 2, name: tool.name, item: url },
        ],
      },
      {
        '@type': 'WebApplication',
        name: `${tool.name} — ${site.name}`,
        url,
        description: tool.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript. Works in modern desktop and mobile browsers.',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        featureList: tool.features,
        publisher: organization,
      },
      faqSchema(tool.faqs),
    ],
  };

  const sidebarRelated = tool.related
    .map((slug) => tools.find((item) => item.slug === slug))
    .filter(Boolean)
    .map(
      (item) => `<li><a class="flex items-center gap-2 text-sm text-ink/80 hover:text-brand" href="%BASE_URL%${item.slug}/">${icon(item.icon, 'h-4 w-4 text-muted')} ${esc(item.name)}</a></li>`,
    )
    .join('');

  const body = `<main id="main">
  <div class="container-page pt-4">
    <nav aria-label="Breadcrumb" class="text-xs text-muted">
      <ol class="flex items-center gap-1.5">
        <li><a class="hover:text-brand" href="%BASE_URL%">Home</a></li>
        <li aria-hidden="true">/</li>
        <li><span class="text-ink">${esc(tool.name)}</span></li>
      </ol>
    </nav>
  </div>

  <section class="container-page pb-6 pt-4 sm:pt-6">
    <div class="tool-head">
      <div class="flex flex-wrap gap-2">
        <span class="pill">${esc(tool.category)}</span>
        <span class="pill pill-accent">${icon('shield', 'h-4 w-4')} ${esc(tool.badge || 'Your files never leave your device')}</span>
      </div>
      <h1 class="tool-title">${esc(tool.h1)}</h1>
      <p class="tool-lead">${esc(tool.lead)}</p>
      ${tool.notice ? `<p class="rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-3 text-sm leading-relaxed text-warn">${esc(tool.notice)}</p>` : ''}
    </div>
  </section>

  <div class="container-page pb-12">
    <div class="tool-layout">
      <div class="min-w-0 space-y-6">
        <div id="tool-root" class="card card-pad tool-surface" data-tool="${tool.slug}">
          <div class="tool-loading" data-tool-loading>
            <span class="spinner"></span> Loading ${esc(tool.name)}…
          </div>
          <noscript>
            <style>[data-tool-loading]{display:none !important}</style>
            <p class="form-error">This tool needs JavaScript because all processing happens in your browser. Enable JavaScript and reload the page.</p>
          </noscript>
        </div>
        <script>
          // If the tool's JavaScript bundle never arrives (offline load, blocked
          // script, CDN hiccup) replace the endless spinner with a real error
          // and a reload button.
          (function () {
            window.setTimeout(function () {
              var root = document.querySelector('[data-tool]');
              if (!root || !root.querySelector('[data-tool-loading]')) return;
              root.innerHTML = '<div class="space-y-3"><p class="form-error">This tool did not finish loading. That usually means the page was opened while offline or a script was blocked.</p><button type="button" class="btn btn-secondary" data-tool-reload>Reload the page</button></div>';
              var button = root.querySelector('[data-tool-reload]');
              if (button) button.addEventListener('click', function () { window.location.reload(); });
            }, 20000);
          })();
        </script>

        <aside class="ad-slot ad-slot--footer" aria-label="Advertisement">
          <!-- AD SLOT (below tool): replace this comment with your ad unit markup. -->
        </aside>

        <section class="card card-pad" aria-labelledby="how-heading">
          <h2 id="how-heading" class="text-lg font-bold tracking-tight">How to ${esc(tool.name.toLowerCase())}</h2>
          <div class="step-list mt-5">
            ${tool.steps
              .map(
                (step, index) => `<div class="space-y-2">
              <span class="step-number">${index + 1}</span>
              <h3 class="text-sm font-semibold">${esc(step.title)}</h3>
              <p class="text-sm leading-relaxed text-muted">${esc(step.body)}</p>
            </div>`,
              )
              .join('\n            ')}
          </div>
        </section>

        <section class="card card-pad" aria-labelledby="features-heading">
          <h2 id="features-heading" class="text-lg font-bold tracking-tight">What you get</h2>
          <ul class="mt-4 grid gap-2.5 sm:grid-cols-2">
            ${tool.features
              .map(
                (feature) => `<li class="flex items-start gap-2 text-sm text-muted">${icon('check', 'mt-0.5 h-4 w-4 text-accent')} <span>${esc(feature)}</span></li>`,
              )
              .join('\n            ')}
          </ul>
        </section>

        ${faqBlock(tool.faqs)}

        ${relatedBlock(tool)}

        ${recommendedBlock(tool)}

        <aside class="ad-slot ad-slot--footer" aria-label="Advertisement">
          <!-- AD SLOT (below tool, second unit): replace this comment with your ad unit markup. -->
        </aside>
      </div>

      <aside class="tool-sidebar">
        <div class="ad-slot ad-slot--box" role="complementary" aria-label="Advertisement">
          <!-- AD SLOT (sidebar): replace this comment with your ad unit markup. -->
        </div>

        <div class="card card-pad">
          <h2 class="flex items-center gap-2 text-sm font-semibold">${icon('shield', 'h-5 w-5 text-accent')} Private by design</h2>
          <ul class="mt-3 space-y-2.5 text-xs leading-relaxed text-muted">
            <li class="flex items-start gap-2">${icon('check', 'mt-0.5 h-3.5 w-3.5 text-accent')} Files are processed in your browser tab.</li>
            <li class="flex items-start gap-2">${icon('check', 'mt-0.5 h-3.5 w-3.5 text-accent')} No upload, no account, no file storage.</li>
            <li class="flex items-start gap-2">${icon('check', 'mt-0.5 h-3.5 w-3.5 text-accent')} ${esc(tool.offline || 'Works offline once the page has loaded.')}</li>
          </ul>
          <a class="link mt-4 inline-flex items-center gap-1 text-xs" href="%BASE_URL%privacy/">Read the privacy policy ${icon('arrow', 'h-3.5 w-3.5')}</a>
        </div>

        <div class="card card-pad">
          <h2 class="text-sm font-semibold">More free tools</h2>
          <ul class="mt-3 space-y-2.5">${sidebarRelated}</ul>
        </div>
      </aside>
    </div>
  </div>
</main>`;

  return pageShell({
    head: head({ title, description: tool.description, route, schema }),
    active: tool.slug,
    body,
  });
}

function buildStaticPage(slug) {
  const page = staticContent[slug];
  const route = `/${slug}/`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
          { '@type': 'ListItem', position: 2, name: page.h1, item: abs(route) },
        ],
      },
      {
        '@type': slug === 'about' ? 'AboutPage' : slug === 'contact' ? 'ContactPage' : 'WebPage',
        name: page.h1,
        description: page.description,
        url: abs(route),
        inLanguage: 'en',
        isPartOf: { '@type': 'WebSite', name: site.name, url: abs('/') },
        publisher: organization,
      },
    ],
  };

  const contact = page.contactCard
    ? `<div class="card card-pad border-brand/30 bg-brand-soft/40">
        <h2 class="text-base font-semibold">Send a message</h2>
        <p class="mt-2 text-sm leading-relaxed text-muted">The project is hosted on GitHub, so the issue tracker is the contact form. A free GitHub account is required to post.</p>
        <a class="btn btn-primary mt-4" href="${site.contactUrl}" target="_blank" rel="noopener">Open the issue tracker ${icon('arrow', 'h-4 w-4')}</a>
        ${
          site.contactEmail
            ? `<p class="mt-4 text-sm text-muted">Prefer email? Write to <a class="link font-medium" href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>. Replies are best-effort; never send confidential documents by email.</p>`
            : ''
        }
        <p class="hint mt-3">Please do not attach confidential documents or personal data to a public issue.</p>
      </div>`
    : '';

  const body = `<main id="main">
  <section class="container-page pb-6 pt-8 sm:pt-10">
    <nav aria-label="Breadcrumb" class="text-xs text-muted">
      <ol class="flex items-center gap-1.5">
        <li><a class="hover:text-brand" href="%BASE_URL%">Home</a></li>
        <li aria-hidden="true">/</li>
        <li><span class="text-ink">${esc(page.h1)}</span></li>
      </ol>
    </nav>
    <h1 class="mt-3 page-title">${esc(page.h1)}</h1>
    <p class="mt-3 max-w-2xl text-base leading-relaxed text-muted">${esc(page.lead)}</p>
    <p class="mt-3 text-xs text-muted">Last updated ${esc(page.updated)}</p>
  </section>

  <div class="container-page pb-12">
    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article class="card card-pad rich sm:p-8">
        ${contact}
        ${page.sections
          .map(
            (section) => `<h2>${esc(section.h)}</h2>
        ${(section.body || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join('\n        ')}
        ${section.list ? `<ul>${section.list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}`,
          )
          .join('\n        ')}
        ${
          slug === 'about' ? `<p class="mt-8">${donateButton()}</p>` : ''
        }
        ${
          slug === 'contact'
            ? ''
            : `<p class="mt-6"><a href="%BASE_URL%contact/">Questions? Contact the project →</a></p>`
        }
      </article>

      <aside class="tool-sidebar">
        <div class="ad-slot ad-slot--box" role="complementary" aria-label="Advertisement">
          <!-- AD SLOT (sidebar): replace this comment with your ad unit markup. -->
        </div>
        <div class="card card-pad">
          <h2 class="text-sm font-semibold">Quick links</h2>
          <ul class="mt-3 space-y-2 text-sm">
            <li><a class="footer-link" href="%BASE_URL%#tools">All tools</a></li>
            <li><a class="footer-link" href="%BASE_URL%about/">About</a></li>
            <li><a class="footer-link" href="%BASE_URL%contact/">Contact</a></li>
            <li><a class="footer-link" href="%BASE_URL%privacy/">Privacy policy</a></li>
            <li><a class="footer-link" href="%BASE_URL%terms/">Terms of use</a></li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</main>`;

  return pageShell({
    head: head({ title: page.title, description: page.description, route, schema }),
    active: slug,
    body,
  });
}

function buildNotFound() {
  const body = `<main id="main" class="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
    <p class="text-sm font-semibold uppercase tracking-widest text-brand">404</p>
    <h1 class="mt-3 page-title">Page not found</h1>
    <p class="mt-3 max-w-md text-sm leading-relaxed text-muted">The page you are looking for does not exist or has moved. Every tool is listed on the home page.</p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
      <a class="btn btn-primary" href="%BASE_URL%">Go to the tools</a>
      <a class="btn btn-secondary" href="%BASE_URL%contact/">Contact</a>
    </div>
  </main>`;

  return pageShell({
    head: head({
      title: `Page not found — ${site.name}`,
      description: 'The page you are looking for could not be found.',
      route: '/404/',
      robots: 'noindex,follow',
    }),
    body,
  });
}

/* -------------------------------------------------------------------- Write */

async function write(relativePath, contents) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents, 'utf8');
  return relativePath;
}

async function main() {
  const written = [];

  written.push(await write('index.html', buildHome()));
  for (const tool of tools) {
    written.push(await write(`${tool.slug}/index.html`, buildToolPage(tool)));
  }
  for (const slug of staticPages) {
    written.push(await write(`${slug}/index.html`, buildStaticPage(slug)));
  }
  written.push(await write('404.html', buildNotFound()));

  const urls = [
    { loc: abs('/'), priority: '1.0', changefreq: 'weekly' },
    ...tools.map((tool) => ({ loc: abs(`/${tool.slug}/`), priority: '0.9', changefreq: 'monthly' })),
    ...staticPages.map((slug) => ({
      loc: abs(`/${slug}/`),
      priority: slug === 'about' || slug === 'contact' ? '0.5' : '0.3',
      changefreq: 'yearly',
    })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
  written.push(await write('public/sitemap.xml', sitemap));
  written.push(
    await write(
      'public/robots.txt',
      `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`,
    ),
  );

  console.log(`Generated ${written.length} files from ${tools.length} tools:`);
  for (const file of written) console.log(`  ${file}`);
}

await main();
