# Ultimate Free Tool

Free, privacy-first file tools that run **100% in the browser**. No backend, no uploads, no accounts — just static files you can host for free on GitHub Pages.

Live tools: Merge PDF, Split PDF, Compress PDF, JPG to PDF, Organize PDF (rotate/delete/reorder), Remove Background, QR Code Generator, Invoice Generator.

---

## Why there is no server

Every tool is a static page. When you add a file, the browser reads it from disk and a JavaScript library processes it in memory:

| Job | Library |
| --- | --- |
| Read + render PDF pages | `pdfjs-dist` (pdf.js) |
| Build + edit PDFs | `pdf-lib` |
| Remove image backgrounds | `@imgly/background-removal` (ONNX + WebAssembly) |
| Draw QR codes | `qrcode` |
| UI, styling | Vanilla JS + Tailwind CSS 4 + Vite |

The result is downloaded straight from the tab. There is no endpoint that could receive a file, which is why the site shows a "Your files never leave your device" badge rather than asking you to trust a policy.

## Stack and structure

Vite multi-page build. Each route is a real HTML file (`/merge-pdf/index.html`), generated from one config file. That means GitHub Pages needs no SPA rewrite tricks and crawlers get complete metadata, H1, FAQ and JSON-LD without executing JavaScript.

```
.
├─ tools.config.js            ← single source of truth: tools, SEO copy, FAQs, related links
├─ vite.config.js             ← MPA inputs, base path, Tailwind plugin
├─ index.html                 ← generated
├─ <tool-slug>/index.html     ← generated (one per tool)
├─ about|privacy|terms|contact/index.html  ← generated
├─ 404.html                   ← generated
├─ scripts/
│  ├─ generate-pages.mjs      ← builds all HTML pages, sitemap.xml, robots.txt
│  └─ content.mjs             ← long-form copy for About / Privacy / Terms / Contact
├─ src/
│  ├─ main.js                 ← chrome + auto-discovered tool entry points
│  ├─ site.js                 ← theme, header tools menu, mobile menu
│  ├─ ui.js                   ← dropzones, validation, downloads, page ranges
│  ├─ icons.js                ← inline SVG icons (no icon font)
│  ├─ styles.css              ← Tailwind 4 + design tokens + component classes
│  ├─ lib/pdf.js              ← pdf.js loader with bundled worker
│  └─ tools/
│     ├─ merge-pdf.js
│     ├─ split-pdf.js
│     ├─ compress-pdf.js
│     ├─ jpg-to-pdf.js
│     ├─ organize-pdf.js
│     ├─ remove-background.js
│     ├─ qr-code-generator.js
│     └─ invoice-generator.js
├─ public/                    ← favicon, og-image, generated sitemap.xml & robots.txt
├─ CNAME                      ← placeholder for a custom domain
└─ .github/workflows/deploy.yml
```

Generated pages (root `index.html`, tool directories, `sitemap.xml`, `robots.txt`) are ignored by git and rebuilt by `npm run pages`, which runs automatically before `dev` and `build`.

## Local setup

Requirements: **Node.js 20.19+ or 22 LTS** and npm.

```bash
npm ci          # or: npm install
npm run dev     # generates pages, then starts Vite on http://localhost:5173
```

Other commands:

```bash
npm run pages    # regenerate HTML pages, sitemap and robots.txt only
npm run build    # generate + production build into dist/
npm run preview  # serve the built site locally
```

The dev server accepts a custom hostname if you need one (for example a remote preview):

```bash
PREVIEW_HOST=my-preview.example.com npm run dev -- --host 0.0.0.0
```

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds the site and publishes `dist/` on every push to `main` using the official `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages` actions.

### 1. Create the repository and push the code

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

No secrets or tokens are needed: the workflow uses the short-lived `GITHUB_TOKEN` that Actions provides.

### 2. Set the deployment URL once

Open `tools.config.js` and check the `deployment` block:

```js
const PROJECT_URL = 'https://<user>.github.io/<repo>';
const customDomain = '';
```

- **Project URL (default):** leave `customDomain` empty. The base path becomes `/<repo>/`, and canonical links, Open Graph URLs, `sitemap.xml` and `robots.txt` use the project URL. No `CNAME` is published.
- **Custom domain:** set `customDomain = 'tools.example.com'` (or set a `CUSTOM_DOMAIN` repository variable). The base path becomes `/`, URLs use `https://tools.example.com`, and the build writes `dist/CNAME`.
- **Forking:** change `PROJECT_URL` to your own Pages address.

This one switch drives the Vite `base`, internal links, canonical/OG tags, sitemap, robots and CNAME, so they cannot drift apart. `npm run dev` always serves from `/`.

### 3. Enable Pages

1. Push to `main` (step 1 already does this).
2. In the repository open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions** — not “Deploy from a branch”.
4. Open the **Actions** tab and watch the **Deploy to GitHub Pages** run. The deploy job prints the live URL.

Every push to `main` now deploys automatically. The workflow also has `workflow_dispatch`, so you can redeploy from **Actions → Deploy to GitHub Pages → Run workflow**.

### 4. Connect a custom domain later

1. Set `customDomain` in `tools.config.js` (or the `CUSTOM_DOMAIN` repository variable) and push.
2. Add DNS at your registrar:
   - **Subdomain (recommended):** `CNAME` record for `www` (or `tools`) pointing to `<user>.github.io`.
   - **Apex domain:** `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, plus the matching `AAAA` records for IPv6.
3. In **Settings → Pages → Custom domain**, enter the domain and click **Save**. Wait for the DNS check to pass.
4. After GitHub issues the TLS certificate (usually minutes; up to 24 hours after DNS resolves), tick **Enforce HTTPS**. The checkbox stays disabled until the certificate is ready.
5. Confirm the live page source uses the new domain: `<link rel="canonical">`, `og:url`, asset paths and `/sitemap.xml`.

The `CNAME` file in the repository root is only a placeholder for reference; the real `dist/CNAME` is generated from `customDomain`. Replace or delete the placeholder once your domain is live.

### 5. Verify the deployment

- `/` loads with styles, and `/merge-pdf/`, `/invoice-generator/` and the other tool URLs work when opened directly.
- `/sitemap.xml` and `/robots.txt` reference the same domain as the browser address bar.
- View source: the canonical URL and hashed asset paths are correct for the deployment type (project URL vs custom domain).

## Troubleshooting deployments

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| **Blank page** | The deploy failed, or the browser cached an old bundle | Check **Actions** for a failed run and **Settings → Pages** for the published URL. Hard-reload (Ctrl/Cmd+Shift+R) and check the console for script errors. |
| **Blank page with 404s in the console** | Wrong base path for the deployment type | Project URL needs `basePath: '/<repo>/'`; a custom domain needs `'/'`. Set `customDomain` correctly in `tools.config.js`, rebuild, and redeploy. |
| **Broken CSS, images or JS** | Assets requested from the wrong prefix (`/assets/...` instead of `/<repo>/assets/...`, or the reverse) | The Vite `base` comes from `site.basePath`; do not hardcode `/assets` in templates. Check that `deployment.customDomain` matches the live URL, then push. |
| **404 on refresh / direct tool URL** | The route HTML was never generated, or the deploy is stale | Every tool has a real `dist/<slug>/index.html`; check the slug in `tools.config.js`, run `npm run pages`, and confirm the file exists in the artifact. Unknown paths intentionally show `404.html`. |
| **404 at `/merge-pdf` without a trailing slash** | GitHub Pages redirects directory URLs to the trailing-slash form | Link with a trailing slash (`/merge-pdf/`); the redirect is normal. |
| **Deploy job fails at configure-pages** | Pages source is still “Deploy from a branch”, or the workflow lacks Pages permissions | Set Source to **GitHub Actions** and keep `permissions: pages: write, id-token: write` in the workflow. |
| **“Enforce HTTPS” is greyed out** | DNS is not verified or the certificate is still being issued | Wait for the Pages DNS check and certificate, then try again; re-save the custom domain if needed. |
| **Site works on the old URL only** | CNAME/domain not rebuilt, or DNS still propagating | Rebuild after changing `customDomain`, confirm `dist/CNAME`, and check `dig <domain>`. |
| **Saved invoice drafts disappeared** | localStorage is scoped to the origin | Moving between the project URL and a custom domain is a different origin. Nothing to fix; data stays on the old origin. |

## Adding a new tool

Three steps, no wiring in menus or sitemap.

1. **Add a config entry** in `tools.config.js` (also update `categories` if you introduce one):

   ```js
   {
     slug: 'rotate-pdf',                 // /rotate-pdf/
     name: 'Rotate PDF',
     category: 'PDF',                    // PDF | Images | Utilities
     icon: 'rotate',                     // any key in src/icons.js
     title: 'Rotate PDF Free — …',       // <title>, OG title (keep under ~60 chars)
     description: '…',                   // meta description + card copy (~150 chars)
     h1: 'Rotate a PDF',
     lead: '…',                          // intro paragraph
     steps: [{ title, body }, …],        // "How to" section
     features: ['…'],
     faqs: [{ q, a }, …],                // rendered + FAQPage JSON-LD
     related: ['merge-pdf', 'split-pdf'],
   }
   ```

2. **Create `src/tools/rotate-pdf.js`** exporting `mount(root)`:

   ```js
   import { createDropzone, withBusy } from '../ui.js';

   export function mount(root) {
     root.innerHTML = '<div data-drop></div>';
     // …build the UI inside root…
   }
   ```

   `src/main.js` discovers tool modules with `import.meta.glob('./tools/*.js')`, so no registration is needed. Each tool is its own JS chunk.

3. **Regenerate and test**:

   ```bash
   npm run dev
   ```

The new tool automatically gets a page at `/<slug>/`, a header/mobile menu entry, a homepage card, a footer link, sitemap and robots entries, breadcrumb + WebApplication + FAQ structured data, and a reserved ad layout.

If the tool needs a new icon, add a path string to `src/icons.js`. If you add a category, add it to `categories` in `tools.config.js`.

## Customising the site

| What | Where |
| --- | --- |
| Site name, tagline | `site` object in `tools.config.js` |
| Deployment URL, custom domain, base path | `deployment` block in `tools.config.js` |
| Homepage FAQ | `homeFaqs` in `tools.config.js` |
| About / Privacy / Terms / Contact copy | `scripts/content.mjs` |
| Contact link | `site.contactUrl` in `tools.config.js` |
| Social share image | replace `public/og-image.jpg` (1200×630-ish) and `site.ogImage` |
| Favicon | `public/favicon.svg` |
| Colours, buttons, cards, ad slots | design tokens and `@layer components` in `src/styles.css` |
| File limits | `LIMITS` in `src/ui.js` (PDF 50 MB, images 20 MB/15 MB, counts) |
| Ads | search the generated markup for `AD SLOT` in `scripts/generate-pages.mjs` and paste your ad unit markup inside the matching `<aside class="ad-slot …">` |
| Affiliate links | the `recommended` array on the Invoice Generator entry in `tools.config.js` |

### Ad slots

There are reserved, labelled slots below the header, in the desktop sidebar, and below each tool. Their heights are fixed in CSS (`.ad-slot--header`, `--box`, `--footer`) so the layout does not jump when an ad loads, and none of them overlap or push the main action button. If a slot is empty, the reserved space stays labelled "Advertisement".

## SEO

- Unique `<title>`, meta description and one `<h1>` per page
- Canonical URL on every page (trailing-slash form, matching GitHub Pages)
- Open Graph + Twitter card tags with a share image
- JSON-LD: `WebSite`, `Organization`, `ItemList`, `BreadcrumbList`, `WebApplication` (free offer) and `FAQPage`
- `sitemap.xml` and `robots.txt` generated from the same config
- Static HTML per route, so content is visible without JavaScript
- `404.html` for GitHub Pages, with `noindex`

### Invoice generator data and affiliate links

The Invoice Generator keeps its working draft, saved clients and invoice-number sequence in `localStorage` (`uft-invoice:*`). "Clear data" removes all three after a second confirmation click. PDFs are drawn with pdf-lib, so line items and totals stay selectable text; the preview, print output and PDF all use the same state.

The **Recommended tools** block on `/invoice-generator/` is a labelled affiliate section (`Sponsored` badge, disclosure line, `rel="sponsored nofollow noopener"`). Replace the three `href` values and copy in the `recommended` array of that tool in `tools.config.js`. Delete the array to hide the section entirely.

## Known limits (by design)

- **Compress PDF** re-renders pages as JPEGs, so text stops being selectable. That is the trade-off for compressing without a server. The UI says so and reports when a file cannot be made smaller.
- **Remove Background** downloads a ~40 MB model from IMG.LY's CDN on first use, then the browser caches it. The photo itself is never sent anywhere.
- **JPG to PDF** accepts JPG, PNG and WebP. iPhone HEIC files must be exported as JPG first.
- **Organize PDF** previews up to 300 pages. Rendering hundreds of thumbnails needs memory, so very large documents are rejected with a message.
- Per-file size limits keep mobile browsers stable. They are not paywalls.
- **Invoice Generator** stores drafts, clients and numbering in the browser only, so they do not sync between devices and disappear if site data is cleared. PDF text uses the standard Helvetica fonts, which cover Latin characters; other scripts are transliterated to `?` in the PDF. It is not legal or tax advice.
- `@imgly/background-removal` is AGPL-licensed. Review its licence if you redistribute this project or the model.

## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile. The background remover and PDF compression need WebAssembly and modern canvas APIs; everything else degrades with a friendly error rather than failing silently.

## License

The site code is yours to modify and publish. Third-party libraries keep their own licences (`pdf-lib` MIT, `pdfjs-dist` Apache-2.0, `qrcode` MIT, `@imgly/background-removal` AGPL).
