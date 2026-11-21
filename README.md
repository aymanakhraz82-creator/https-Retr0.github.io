# InvoiceKit — Free Invoice Generator

A complete, static, no-backend invoice generator for freelancers. Pure HTML, CSS and vanilla JavaScript. Built to be published on GitHub Pages as-is.

## Features

- Live invoice preview with line items, quantity × rate totals, tax and discount
- 23 currencies including USD, EUR, GBP and MAD
- Optional logo upload (resized in the browser before saving)
- Download PDF via the html2pdf.js CDN, or print with the browser's print dialog
- Draft saved to `localStorage` — no account, no server
- Mobile-first responsive layout, printable A4 invoice
- SEO: unique titles/descriptions, one `<h1>`, 400+ word guide, 6-question FAQ, Open Graph tags, WebApplication + FAQPage JSON-LD
- Monetization slots: three ad placeholders and three labelled "Sponsored" affiliate cards

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Generator, guide, FAQ, sponsored section, structured data |
| `about.html` | About the project |
| `privacy.html` | Privacy policy (cookies, ads, affiliate links) |
| `contact.html` | Contact details |
| `style.css` | All styles, including print rules |
| `script.js` | Calculations, preview, PDF, logo handling, localStorage |
| `sitemap.xml` | Sitemap for search engines |
| `robots.txt` | Crawl rules and sitemap location |
| `README.md` | This file |

## Publish on GitHub Pages

1. Create a GitHub account and a new **public** repository, for example `invoice-generator`.
2. Upload every file from this folder to the root of the repository (drag and drop on the GitHub web UI, or use git):
   ```bash
   git init
   git add .
   git commit -m "Add InvoiceKit invoice generator"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/invoice-generator.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Choose branch **main** and folder **/ (root)**, then click **Save**.
6. Wait 1–3 minutes. The site appears at `https://YOURUSERNAME.github.io/invoice-generator/`.
7. Add a custom domain later under **Settings → Pages → Custom domain** if you want one. If you use a custom domain, add a `CNAME` file containing the domain.

Every push to `main` republishes the site automatically. No build step, no npm install.

## Replace these placeholders before publishing

Search the files for each placeholder and update it:

- `yourusername` — in `index.html`, `about.html`, `privacy.html`, `contact.html`, `sitemap.xml`, `robots.txt`. Replace the canonical/OG URLs and sitemap entries with your real site URL.
- `AFFILIATE_LINK_1`, `AFFILIATE_LINK_2`, `AFFILIATE_LINK_3` — in `index.html`, the three sponsored cards. Card 1 is international payments, card 2 is accounting software, card 3 is freelance platforms. Keep `rel="sponsored nofollow noopener"` on affiliate links.
- `hello@example.com` — in `contact.html` and `privacy.html`. Use an address you actually monitor.
- `InvoiceKit` — optional branding. Replace it in the page headers, footers, `<title>` tags and JSON-LD if you choose another name.
- Ad slots — each `<!-- AD SLOT: paste AdSense code here -->` comment marks a placement. Paste your AdSense unit inside the surrounding `<aside class="ad-slot">` (or replace the aside entirely). The slots are below the header, below the tool and above the footer.
- `lastmod` dates in `sitemap.xml` — update when you change the pages.
- `YOUR_BUTTON_ID` and `yourname` — in `index.html`, the donation links (PayPal hosted button ID and Buy Me a Coffee handle). Replace both before publishing, or remove the support section if you do not want donations.

## Test locally

Because everything is static, opening `index.html` directly works. A local server is closer to the real thing:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Check:

- typing updates the preview and the totals
- currency changes the symbols
- Add/remove line items works
- Download PDF produces a file named after the invoice number
- Print preview shows only the invoice
- reloading keeps your draft (localStorage)
- Reset clears the form and stored draft

## Notes and limitations

- **The PDF library is loaded from cdnjs.** If the visitor is offline or the CDN is blocked, the Print button still works and the browser can "Save as PDF".
- **Drafts are per browser and per device.** They are not synced, and clearing site data deletes them.
- **No backend.** Nothing is submitted anywhere; there is no contact form, only `mailto:` links.
- **Tax rules vary by country.** The guide and FAQ say so; keep that caveat if you edit them.
- **AdSense approval** typically requires a privacy policy (included), real content (the 400+ word guide and FAQ), and your own domain is recommended for approval.
- **Performance:** no frameworks, no fonts, no images. The only heavy request is the PDF bundle, loaded on every page view; you can add `defer` or move it to load on first click if you prefer.

## License

Use and modify this project freely for your own site. Replace the placeholder content, links and contact details before publishing.
