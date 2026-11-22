/**
 * Site + tool configuration.
 *
 * This file is the single source of truth for the header tools menu, the
 * homepage cards, the static pages that get generated, the sitemap and every
 * page's SEO tags. Add an object to `tools` and run `npm run pages` to get a
 * new page at /<slug>/.
 */

/**
 * Deployment — the single switch.
 *
 * Leave `customDomain` empty for a GitHub Pages project URL:
 *   https://<user>.github.io/<repo>/   → base path /<repo>/
 * Set it to a domain to publish at the root:
 *   https://tools.example.com/          → base path /
 *
 * The Vite base path, canonical links, Open Graph URLs, sitemap, robots.txt
 * and the dist/CNAME file are all derived from these two values, so they can
 * never disagree. In GitHub Actions you can also set a CUSTOM_DOMAIN
 * repository variable to override `customDomain` without editing code.
 *
 * If you fork this repository, change PROJECT_URL to your own Pages URL.
 */
const PROJECT_URL = 'https://aymanakhraz82-creator.github.io/https-Retr0.github.io';

const customDomain = String(process.env.CUSTOM_DOMAIN || '')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/\/.*$/, '');

const projectPath = new URL(PROJECT_URL).pathname.replace(/\/+$/, '');

export const deployment = {
  projectUrl: PROJECT_URL,
  customDomain,
  baseUrl: customDomain ? `https://${customDomain}` : PROJECT_URL,
  basePath: customDomain ? '/' : `${projectPath}/`,
};

export const site = {
  name: 'Ultimate Free Tool',
  tagline: 'Free tools that never upload your files',
  description:
    'Free online PDF, image, invoice and QR tools that run entirely in your browser. Merge and compress PDFs, remove image backgrounds, generate QR codes and create invoices — no uploads, no sign-up.',
  // Derived from `deployment` above. Used for canonical URLs, Open Graph tags,
  // the sitemap and robots.txt.
  baseUrl: deployment.baseUrl,
  basePath: deployment.basePath,
  customDomain: deployment.customDomain,
  ogImage: 'og-image.jpg',
  repoUrl: 'https://github.com/aymanakhraz82-creator/https-Retr0.github.io',
  contactUrl: 'https://github.com/aymanakhraz82-creator/https-Retr0.github.io/issues/new',
  launchYear: 2026,
};

/** Extra pages that are not tools. Rendered from scripts/content.mjs. */
export const staticPages = ['about', 'privacy', 'terms', 'contact'];

export const tools = [
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'PDF',
    icon: 'merge',
    title: 'Merge PDF Files Free — Combine PDFs in Your Browser',
    description:
      'Merge multiple PDF files into one document for free. Drag to reorder, combine in seconds and download — files are processed on your device, never uploaded.',
    h1: 'Merge PDF files',
    lead:
      'Combine two or more PDFs into a single document. Drag the files into the order you want, then merge. No upload, no sign-up and no watermark.',
    flags: ['drag-reorder', 'no-upload'],
    steps: [
      {
        title: 'Add your PDFs',
        body:
          'Drag and drop two or more PDF files, or tap the drop area to browse. Nothing is sent anywhere — each file is read straight from your device.',
      },
      {
        title: 'Set the order',
        body:
          'Drag rows to reorder the documents, or use the arrow buttons on touch screens. The list runs from the first page to the last.',
      },
      {
        title: 'Merge and download',
        body:
          'Press Merge PDFs, wait a moment while the pages are copied, then save the combined file. Original page quality is kept.',
      },
    ],
    features: [
      'No daily limits, watermarks or accounts',
      'Drag to reorder, with arrow buttons for touch screens',
      'Pages are copied, not re-rendered, so quality stays the same',
      'Works offline after the page has loaded',
    ],
    faqs: [
      {
        q: 'Is merging PDFs really free?',
        a: 'Yes. There are no limits, no watermarks and no account. The site is supported by the clearly labelled ad slots around the tool.',
      },
      {
        q: 'Are my PDFs uploaded to a server?',
        a: 'No. Files are read with the browser File API and merged in memory with pdf-lib. You can watch the network tab in your browser dev tools while merging: no file data is sent.',
      },
      {
        q: 'Can I merge password-protected PDFs?',
        a: 'Not directly. Remove the password in your PDF reader first, then merge the unlocked copy. Encrypted files are rejected with a clear message so the merge never fails silently.',
      },
      {
        q: 'Is there a file size limit?',
        a: 'Each PDF can be up to 50 MB and you can merge up to 20 files at once. The limits keep mobile browsers stable; they are not paywalls.',
      },
      {
        q: 'Does merging reduce quality?',
        a: 'No. Pages are copied from the source documents without re-encoding images or fonts. Interactive form fields and some bookmarks may not carry over, because those features are document-wide rather than per page.',
      },
    ],
    related: ['split-pdf', 'organize-pdf', 'compress-pdf'],
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    category: 'PDF',
    icon: 'split',
    title: 'Split PDF Free — Extract Pages or Page Ranges Online',
    description:
      'Split a PDF by page range or extract just the pages you need. Enter pages like 1-3, 5, 8-10 and download a new PDF. Free, private and browser-based.',
    h1: 'Split a PDF',
    lead:
      'Pull a page range out of a long document, or export every selected page as a new PDF. Enter the pages you want and download in one click.',
    flags: ['page-ranges', 'no-upload'],
    steps: [
      {
        title: 'Choose a PDF',
        body:
          'Drop a PDF into the area above or tap to browse. The page count is read in your browser and shown before you split anything.',
      },
      {
        title: 'Enter the pages',
        body:
          'Type a range such as 1-3, 5 or 8-10. Use the quick buttons for the first page, the last page or the whole document.',
      },
      {
        title: 'Download the result',
        body:
          'Extract the selection into one PDF, or switch to separate files to get one PDF per range. Everything is generated locally.',
      },
    ],
    features: [
      'Flexible ranges such as 1-3, 5, 8-10',
      'One combined PDF or separate files per range',
      'Page count validation before anything is processed',
      'Original file is never modified',
    ],
    faqs: [
      {
        q: 'How do I extract pages from a PDF?',
        a: 'Load the PDF, type the pages you want (for example 2-4, 9) and press Extract pages. The selected pages are copied, in the order you typed, into a new PDF that you can download.',
      },
      {
        q: 'What happens if I enter a page that does not exist?',
        a: 'The tool checks your input against the document page count and tells you which token is out of range. Nothing is processed until the range is valid.',
      },
      {
        q: 'Can I split a PDF into many separate files?',
        a: 'Yes. Switch to the separate-files mode and each comma-separated range becomes its own PDF. Browsers may ask permission before saving multiple files in a row.',
      },
      {
        q: 'Does splitting keep the quality?',
        a: 'Yes. Pages are copied unchanged into the new document, so text, images and vectors are identical to the original.',
      },
      {
        q: 'Are my files uploaded?',
        a: 'No. The PDF is opened and split in your browser tab. No file data leaves your device, which is why the tool also works while offline.',
      },
    ],
    related: ['merge-pdf', 'organize-pdf', 'compress-pdf'],
  },
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'PDF',
    icon: 'compress',
    title: 'Compress PDF Free — Reduce PDF File Size in Your Browser',
    description:
      'Reduce PDF file size for free without uploading. Choose a compression level, compare before and after sizes, and download a smaller PDF in seconds.',
    h1: 'Compress a PDF',
    lead:
      'Shrink a heavy PDF by re-rendering its pages at a lower resolution. Pick a level, see the size difference, then download.',
    flags: ['size-compare', 'no-upload'],
    notice:
      'Compression re-renders each page as a JPEG, so text stops being selectable. It works best on scanned documents, image-heavy exports and slide decks. Keep the original if you need searchable text.',
    steps: [
      {
        title: 'Load the PDF',
        body:
          'Drop the file you want to shrink. Its current size and page count are shown so you know what you are starting from.',
      },
      {
        title: 'Pick a level',
        body:
          'Light keeps more detail, Balanced suits most documents, Strong produces the smallest file. Higher compression takes a little longer.',
      },
      {
        title: 'Compare and download',
        body:
          'The result shows the new size and the saving. If the file did not get smaller, the tool says so instead of pretending it worked.',
      },
    ],
    features: [
      'Three compression levels with visible size comparison',
      'Per-page progress for long documents',
      'No upload, no email address, no daily quota',
      'Honest result: warns when a file cannot be compressed further',
    ],
    faqs: [
      {
        q: 'How much smaller will my PDF be?',
        a: 'It depends on the document. Scanned PDFs and screenshot-heavy exports often shrink by 50–80%. Text-only PDFs that are already small may barely change, and occasionally a file gets slightly larger because every page is re-encoded.',
      },
      {
        q: 'Why does the compressed PDF lose selectable text?',
        a: 'True PDF compression without a server means re-rendering each page into an image. That removes text layers, links and form fields, but it also makes the result predictable and small. If you need searchable text, keep the original.',
      },
      {
        q: 'Which level should I choose?',
        a: 'Use Light for documents that will be printed or zoomed, Balanced for email attachments, and Strong for strict upload limits such as forms that cap files at 2 MB.',
      },
      {
        q: 'Are my files uploaded to compress them?',
        a: 'No. Pages are rendered with pdf.js on your device and rebuilt with pdf-lib. Nothing is sent to a server.',
      },
      {
        q: 'Can it compress password-protected PDFs?',
        a: 'No. Unlock the document in your PDF reader first, then compress the unlocked copy.',
      },
    ],
    related: ['merge-pdf', 'split-pdf', 'jpg-to-pdf'],
  },
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'PDF',
    icon: 'image',
    title: 'JPG to PDF Converter Free — Turn Images Into a PDF',
    description:
      'Convert JPG, PNG and WebP images into a single PDF in your browser. Reorder pages, choose A4 or Letter, set margins and download. No upload required.',
    h1: 'JPG and PNG to PDF',
    lead:
      'Turn photos, scans and screenshots into one tidy PDF. Arrange the images, pick a page size and margin, then download.',
    flags: ['drag-reorder', 'no-upload'],
    steps: [
      {
        title: 'Add your images',
        body:
          'Drop JPG, PNG or WebP files, or tap to browse. Up to 25 images and 20 MB each. Photos are converted in the browser, never uploaded.',
      },
      {
        title: 'Arrange and set up the page',
        body:
          'Drag the thumbnails into order, then choose A4 or Letter, portrait or landscape, and a margin. Fit-to-image keeps each photo at its own aspect ratio.',
      },
      {
        title: 'Create the PDF',
        body:
          'Press Create PDF and download the result. Images are placed at high resolution with no visible compression artefacts at normal zoom.',
      },
    ],
    features: [
      'JPG, PNG and WebP input, converted through canvas',
      'A4, Letter or fit-to-image page sizes',
      'Portrait, landscape and auto orientation',
      'Drag to reorder pages before converting',
    ],
    faqs: [
      {
        q: 'Which image formats can I use?',
        a: 'JPG/JPEG, PNG and WebP. iPhone HEIC files are not supported by browsers directly — export them as JPG first. Very large images are scaled down to keep the PDF a sensible size.',
      },
      {
        q: 'Will my photos lose quality?',
        a: 'Images are re-encoded as high-quality JPEG at up to 2400 pixels on the long edge, which is sharp for A4 printing while keeping the file portable. For archival use, keep the originals.',
      },
      {
        q: 'Can I mix portrait and landscape photos?',
        a: 'Yes. Choose Auto orientation and each page follows its image. Choose portrait or landscape if you want every page identical for printing and binding.',
      },
      {
        q: 'How many images can I convert at once?',
        a: 'Up to 25 images per PDF, 20 MB each, for a maximum of 200 MB of input. Larger batches can exhaust memory on phones.',
      },
      {
        q: 'Do I need to upload my photos?',
        a: 'No. Canvas reads each file locally and the PDF is assembled in memory. Nothing is transmitted, so private documents and ID scans stay on your device.',
      },
    ],
    related: ['merge-pdf', 'compress-pdf', 'organize-pdf'],
  },
  {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    category: 'PDF',
    icon: 'layers',
    title: 'Rotate & Delete PDF Pages Free — Organize a PDF Online',
    description:
      'Rotate, delete and reorder PDF pages visually, then save a clean copy. A free page organizer that runs entirely in your browser with no uploads.',
    h1: 'Rotate, delete and reorder PDF pages',
    lead:
      'Load a PDF, preview every page, then fix it: rotate sideways scans, delete blank pages and drag pages into place before saving.',
    flags: ['thumbnails', 'no-upload'],
    steps: [
      {
        title: 'Load a PDF',
        body:
          'Drop a PDF to render page thumbnails. Only the page previews are drawn in your browser; the file itself stays on your device.',
      },
      {
        title: 'Fix the pages',
        body:
          'Use the rotate buttons on any page, delete pages you do not need, and drag thumbnails to reorder them. Every change is only a preview.',
      },
      {
        title: 'Save a new copy',
        body:
          'Press Save PDF to build a fresh document with your changes applied. Your original file is never modified.',
      },
    ],
    features: [
      'Visual page thumbnails, not just page numbers',
      'Rotate each page in 90° steps',
      'Delete and reorder pages before exporting',
      'Original PDF remains untouched',
    ],
    faqs: [
      {
        q: 'Can I delete pages from a PDF permanently?',
        a: 'This tool creates a new PDF without the pages you removed. Your original file on disk is untouched, so keep it if you might need those pages later.',
      },
      {
        q: 'Does rotating pages lose quality?',
        a: 'No. Rotation is stored as page metadata and the content is copied as-is, so nothing is re-rendered or re-compressed.',
      },
      {
        q: 'Can I undo a change?',
        a: 'Yes, press Reset to restore the original page order, rotation and deletions while the file is still loaded. Reloading the file also starts fresh.',
      },
      {
        q: 'Why is a large PDF slow to preview?',
        a: 'Every thumbnail is rendered by pdf.js on your device. Documents with hundreds of pages take longer and use more memory, so the tool caps input at 50 MB and 300 pages.',
      },
      {
        q: 'Is this safe for confidential documents?',
        a: 'Yes. There is no backend to send files to. The page is plain static files and JavaScript, and all processing happens inside your browser tab.',
      },
    ],
    related: ['merge-pdf', 'split-pdf', 'compress-pdf'],
  },
  {
    slug: 'remove-background',
    name: 'Remove Background',
    category: 'Images',
    icon: 'wand',
    title: 'Remove Image Background Free — Transparent PNG, No Upload',
    description:
      'Remove the background from any photo in your browser with AI. Compare before and after, then download a transparent PNG or a solid background color. Free.',
    h1: 'Remove image background',
    lead:
      'Cut the subject out of a photo and download a transparent PNG, or place it on a solid colour. The AI model runs on your device, not on a server.',
    flags: ['before-after', 'no-upload'],
    notice:
      'The first run downloads a roughly 40 MB AI model, which is then cached by your browser. Keep the tab open while it loads, and expect the cut-out itself to take a few seconds on a phone.',
    steps: [
      {
        title: 'Add a photo',
        body:
          'Drag and drop, paste from the clipboard with Ctrl+V, or browse for a JPG, PNG or WebP up to 15 MB. The image is never uploaded.',
      },
      {
        title: 'Wait for the model',
        body:
          'The first run downloads the segmentation model and shows real progress. Later runs reuse the cached model and start immediately.',
      },
      {
        title: 'Compare and download',
        body:
          'Drag the before/after slider to check the edges, pick transparent or a background colour, then download the PNG.',
      },
    ],
    features: [
      'Before/after slider to inspect the cut-out',
      'Transparent PNG or any solid background colour',
      'Paste from clipboard, drag and drop, or browse',
      'Download progress for the model on first use',
    ],
    faqs: [
      {
        q: 'Why does the first background removal take so long?',
        a: 'The tool has to download a neural network (about 40 MB) and start a WebAssembly runtime in your browser. The browser caches the model, so the next image is much faster. There is no server doing the work.',
      },
      {
        q: 'Is background removal free?',
        a: 'Yes, with no watermark, account or per-image limit. The tool is client-side, so it costs us nothing per image, and the labelled ad slots keep the site running.',
      },
      {
        q: 'How good are the edges?',
        a: 'The model handles people, products and pets well, including soft hair edges. Very fine detail such as flyaway hair, transparent glass or motion blur can still need a touch-up in an image editor.',
      },
      {
        q: 'What image formats are supported?',
        a: 'JPG, PNG and WebP up to 15 MB. The output is always a PNG so transparency is preserved. HEIC files from iPhones need to be exported as JPG first.',
      },
      {
        q: 'Can I use the result commercially?',
        a: 'The tool does not add any licence restriction to your output. You are responsible for having the rights to the original photo and for following the model licence if you redistribute the model itself.',
      },
    ],
    related: ['jpg-to-pdf', 'qr-code-generator', 'merge-pdf'],
  },
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    category: 'Utilities',
    icon: 'qr',
    title: 'Free QR Code Generator — Custom Colors, PNG & SVG',
    description:
      'Create QR codes for links, Wi-Fi, email, phone and text. Customize colours, size and error correction, then download PNG or SVG. Free, no sign-up.',
    h1: 'QR code generator',
    lead:
      'Make a QR code that scans reliably. Choose what it should contain, tune the colours and download a crisp PNG or a vector SVG.',
    flags: ['live-preview', 'png-svg'],
    steps: [
      {
        title: 'Choose a type',
        body:
          'Pick a link, plain text, Wi-Fi network, email or phone number. Each type shows only the fields it needs and builds the right payload.',
      },
      {
        title: 'Style the code',
        body:
          'Set foreground and background colours, size and error correction. The preview updates as you type, and a contrast warning appears if the code may not scan.',
      },
      {
        title: 'Download PNG or SVG',
        body:
          'PNG is ready for documents and social posts. SVG is a vector that stays sharp when printed large. Codes are static and never expire.',
      },
    ],
    features: [
      'URL, text, Wi-Fi, email and phone payloads',
      'Live preview with custom colours and size',
      'PNG at up to 1024 px, plus vector SVG',
      'Error correction levels L, M, Q and H',
    ],
    faqs: [
      {
        q: 'Do these QR codes expire?',
        a: 'No. The code contains your data directly, with no redirect service, so it works forever as long as the destination exists. Nothing is tracked or counted.',
      },
      {
        q: 'Why does my QR code not scan?',
        a: 'Low contrast is the usual reason: keep the foreground dark and the background light, and leave the quiet zone around the code. Avoid putting an inverted (light-on-dark) code on a dark poster, and test at the final print size.',
      },
      {
        q: 'Which error correction level should I use?',
        a: 'M (medium, about 15% recovery) suits most uses. Use Q or H if the code will be printed on a curved surface, covered by a logo area, or may get scuffed. Higher levels make the pattern denser.',
      },
      {
        q: 'How do I create a Wi-Fi QR code?',
        a: 'Choose the Wi-Fi type, enter the network name, password and security type. Guests can then join without typing the password. Double-check the password and note that the code exposes it to anyone who scans it.',
      },
      {
        q: 'Is the QR generator private?',
        a: 'Yes. The code is generated in your browser with a JavaScript library. Your URL or Wi-Fi password is never sent to this site or anyone else.',
      },
    ],
    related: ['remove-background', 'merge-pdf', 'jpg-to-pdf'],
  },
  {
    slug: 'invoice-generator',
    name: 'Invoice Generator',
    category: 'Business',
    icon: 'invoice',
    badge: 'Your data never leaves your device',
    title: 'Free Invoice Generator — Create & Download PDF Invoices',
    description:
      'Create a professional invoice free in your browser. Add your logo, line items, tax and discount, then download a PDF or print. No sign-up, no watermark.',
    h1: 'Free invoice generator',
    lead:
      'Create a clean, professional invoice in minutes. Add your details and line items, watch the preview update, then download a PDF or print it. Your data never leaves your device.',
    flags: ['live-preview', 'templates', 'no-upload'],
    steps: [
      {
        title: 'Add your details',
        body:
          'Fill in your business name, email and address, upload a logo, then add the client you are billing. Nothing is uploaded — the form writes straight into the preview.',
      },
      {
        title: 'Build the invoice',
        body:
          'Add line items with quantity and rate, then set tax, discount, shipping and currency. Choose one of three templates and an accent colour; totals update as you type.',
      },
      {
        title: 'Download, print or come back later',
        body:
          'Press Download PDF for a selectable-text A4 invoice, or print it directly. Your draft and client list are saved in this browser, so you can reopen the page and keep editing.',
      },
    ],
    features: [
      'Live A4 preview with three templates and a custom accent colour',
      'Tax, discount, shipping and 23 currencies with automatic totals',
      'PDF download, print, auto-saved drafts and a reusable client list',
      'Automatic invoice numbering and a one-click clear-data button',
    ],
    faqs: [
      {
        q: 'What should an invoice include?',
        a: 'A complete invoice normally includes your business name, address and contact details; a unique invoice number and the issue date; the client’s name, address and email; a description of each item or service with quantity and unit price; the subtotal, any tax, discount or shipping, and the total due; the payment due date and payment terms; and how to pay. A logo, purchase-order reference and tax registration number are optional but common. Rules differ between countries, so check local requirements if the invoice is for tax purposes.',
      },
      {
        q: 'Is this invoice generator really free?',
        a: 'Yes. There is no account, no watermark and no export limit. The site is supported by the labelled ad slots around the tool and by disclosed affiliate links in the recommended-tools section.',
      },
      {
        q: 'Where is my invoice data stored?',
        a: 'In your browser only. Drafts, saved clients and the invoice-number sequence use localStorage on this device, and the PDF is generated locally with pdf-lib. Nothing is sent to a server. Use the “Clear data” button to delete all of it, or clear site data in your browser settings.',
      },
      {
        q: 'Does the downloaded PDF have selectable text?',
        a: 'Yes. The PDF is drawn with embedded fonts rather than a screenshot, so totals and line items stay sharp and selectable at any zoom. Your logo is embedded as an image, and the page is A4.',
      },
      {
        q: 'Can I reuse clients and invoice numbers?',
        a: 'Yes. “Save client” keeps a client in the saved-clients list for next time, and the invoice number advances automatically when you start a new invoice. You can still type a custom number at any time.',
      },
      {
        q: 'Is an invoice from this tool legally valid?',
        a: 'The tool produces a standard PDF invoice, but it is not legal, tax or accounting advice. Requirements for a valid tax invoice vary by country and business structure. Keep your own records and check with an accountant if you are unsure.',
      },
    ],
    related: ['qr-code-generator', 'jpg-to-pdf', 'merge-pdf'],
    recommended: [
      {
        name: 'Invoicing app',
        category: 'Invoicing',
        description: 'Send branded invoices, automatic reminders and payment links from one dashboard.',
        href: 'https://example.com/invoicing-affiliate',
      },
      {
        name: 'Small-business accounting',
        category: 'Accounting',
        description: 'Track expenses, reconcile accounts and produce reports your accountant can use.',
        href: 'https://example.com/accounting-affiliate',
      },
      {
        name: 'Online payments',
        category: 'Payments',
        description: 'Accept cards and bank transfers with a hosted checkout or a simple payment link.',
        href: 'https://example.com/payments-affiliate',
      },
    ],
  },
];

/** Homepage FAQ (also emitted as FAQPage structured data). */
export const homeFaqs = [
  {
    q: 'Are these tools really free?',
    a: 'Yes. Every tool is free to use with no sign-up, watermark or daily limit. The site is supported by clearly labelled ad slots and nothing else.',
  },
  {
    q: 'Do I need to upload my files?',
    a: 'No. All processing happens inside your browser tab using JavaScript and WebAssembly. Your PDFs, photos and Wi-Fi passwords never leave your device, and most tools keep working offline once the page has loaded.',
  },
  {
    q: 'Can I use the tools on a phone?',
    a: 'Yes. Every page is mobile-first, with tap targets sized for thumbs and drag alternatives such as arrow buttons for reordering. Large files are easier on a desktop, but cropping, compressing and QR generation work well on phones.',
  },
  {
    q: 'Do you store anything about me?',
    a: 'No accounts, no file storage and no analytics profile. Your theme choice is stored locally in your browser. See the privacy policy for details about advertising cookies.',
  },
];

export const toolBySlug = (slug) => tools.find((tool) => tool.slug === slug);

export const categories = ['PDF', 'Images', 'Business', 'Utilities'];
