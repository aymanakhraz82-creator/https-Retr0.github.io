/**
 * Prose for the non-tool pages. Each entry becomes a static page at /<slug>/.
 * The generator renders these with the same shared header, footer and ad slots.
 */

export const pages = {
  about: {
    title: 'About Ultimate Free Tool — Browser-Only File Tools',
    description:
      'Ultimate Free Tool is a collection of free PDF, image and QR tools that run entirely in your browser. Learn how it works, why nothing is uploaded and what is next.',
    h1: 'About Ultimate Free Tool',
    lead:
      'A small collection of everyday file tools built on one rule: your files stay on your device.',
    updated: 'November 2026',
    sections: [
      {
        h: 'Why this exists',
        body: [
          'Most "free" online converters follow the same pattern: upload your file to someone else\'s server, wait in a queue, get a watermarked download, and hope the file is deleted. Some ask for an email address first. Others cap you at two files a day and then show a paywall. For a passport scan, a signed contract or a photo of your family, that trade is a bad one.',
          'Ultimate Free Tool takes the opposite approach. Every tool on this site is a static web page. There is no backend, no database and no queue. The work is done by JavaScript running in your browser, and the result is handed straight back to you.',
        ],
      },
      {
        h: 'How the tools work',
        body: [
          'PDF pages are opened with pdf.js and rebuilt with pdf-lib. Background removal runs a small segmentation network through WebAssembly and ONNX Runtime. QR codes are drawn locally by a JavaScript encoder. The site itself is plain HTML, CSS and JavaScript built with Vite, and it is hosted for free on GitHub Pages.',
          'Because there is no server, there is nothing to upload to. If you open your browser developer tools while using a tool, you will see the page load once and then no further file traffic. You can disconnect from the internet after the page has loaded and most tools will keep working.',
        ],
      },
      {
        h: 'What that means for you',
        list: [
          'Privacy: your PDFs, photos and Wi-Fi passwords never leave your device.',
          'Speed: no upload or download wait, so a 20 MB file is processed at disk speed rather than broadband speed.',
          'No account: nothing to sign up for, nothing to remember, no marketing email.',
          'No artificial scarcity: the file limits exist to keep mobile browsers stable, not to sell you a bigger plan.',
        ],
      },
      {
        h: 'How the site is funded',
        body: [
          'The site is supported by a small number of clearly labelled ad slots — one below the header, one in the sidebar on desktop, and one below each tool. They are reserved spaces so the page does not jump around while an ad loads, and they never cover the button you are trying to press.',
          'There is no paid tier, no affiliate-driven ranking and no sponsored tool. If an ad slot is empty, the space simply stays reserved and labelled.',
        ],
      },
      {
        h: 'Honest limitations',
        body: [
          'Compressing a PDF in the browser works by re-rendering pages as images, so the output is no longer searchable text. The background remover downloads a roughly 40 MB model the first time you use it, which is slow on a mobile connection. Very large files can exhaust memory on older phones. iPhone HEIC photos are not supported by browsers and need exporting as JPG first.',
          'These are real constraints of doing the work on your device instead of a server. They are described on each tool page rather than hidden behind a spinner.',
        ],
      },
      {
        h: 'Suggestions and bugs',
        body: [
          'The project is open source and the issue tracker is the best place to report a broken file or ask for a tool. If a PDF fails, mention the app that created it and roughly how large it is — that is usually enough to reproduce the problem.',
        ],
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy — Ultimate Free Tool',
    description:
      'How Ultimate Free Tool handles your data: files are processed locally and never uploaded, no accounts, no analytics profiles, and clear details about advertising cookies.',
    h1: 'Privacy Policy',
    lead:
      'Short version: your files are processed in your browser and are never uploaded. This page explains the small amount of data that does exist.',
    updated: '22 November 2026',
    sections: [
      {
        h: '1. Files you process',
        body: [
          'Files you open in any tool are read directly from your device by your browser. They are not transmitted to us or to any third party. There is no server-side component that could receive them.',
          'Files and generated results exist only in your browser\'s memory while the tab is open. Reloading or closing the page discards them. We do not store copies, and we cannot recover a file for you.',
        ],
      },
      {
        h: '2. Information stored on your device',
        body: [
          'The site stores one preference in your browser\'s localStorage: your choice of light or dark theme, under the key "uft-theme". It stays on your device and is never sent anywhere.',
          'The invoice generator stores the invoice draft you are working on, a list of clients you explicitly save, and an invoice-number counter in localStorage, under keys beginning with "uft-invoice:". This is what lets the tool restore your work and reuse client details. It is never transmitted, and the generator\'s "Clear data" button deletes all of it.',
          'We do not set first-party cookies, we do not use fingerprinting, and there are no accounts, newsletters or contact forms that collect your details.',
        ],
      },
      {
        h: '3. Analytics',
        body: [
          'This site does not load an analytics script and does not build visitor profiles. If aggregate, privacy-friendly measurement is added in the future, this policy will be updated first and the change noted below.',
        ],
      },
      {
        h: '4. Advertising',
        body: [
          'The site contains clearly labelled ad slots. If advertising is enabled, third-party advertising vendors — which may include Google — can use cookies or similar technologies to serve ads based on your visits to this and other websites.',
          'Google\'s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the internet. You can opt out of personalised advertising by visiting Google\'s Ads Settings, or opt out of participating vendors via aboutads.info. Where required by law, a consent prompt will appear before any non-essential cookie is set.',
          'We never pass your files or their contents to advertisers. Advertising code has no access to the file-processing parts of the page.',
        ],
      },
      {
        h: '5. Hosting logs',
        body: [
          'The site is served as static files by GitHub Pages. GitHub may record standard technical information such as IP addresses and requested URLs for security and abuse prevention, as described in GitHub\'s privacy statement. We do not receive or analyse those logs.',
        ],
      },
      {
        h: '6. Third-party downloads',
        body: [
          'The background removal tool downloads an AI model and WebAssembly runtime from IMG.LY\'s content delivery network (staticimgly.com) the first time you use it. That request reveals your IP address and browser details to that CDN, in the same way any external asset would. Your image is not part of that request and is not sent anywhere.',
          'All other libraries used by the tools are bundled with the site itself.',
        ],
      },
      {
        h: '7. Your rights',
        body: [
          'Because we do not collect personal data, there is no profile to access, export or delete. If you believe we hold information about you, or you have a question about this policy, contact us through the issue tracker and we will respond.',
          'Depending on where you live, you may have rights under the GDPR, UK GDPR or CCPA. Those rights apply to personal data held by an organisation; this site holds none.',
        ],
      },
      {
        h: '8. Children',
        body: [
          'The tools are intended for general use and are not directed at children under 13. We do not knowingly collect information from anyone.',
        ],
      },
      {
        h: '9. Changes to this policy',
        body: [
          'If the site starts using a new third-party service, this page will be updated before that change takes effect, and the date at the top will change. Continuing to use the site after an update means you accept the revised policy.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Use — Ultimate Free Tool',
    description:
      'The terms for using Ultimate Free Tool: free browser-based file tools provided as-is, acceptable use, no warranty, and clarity about your ownership of the files you process.',
    h1: 'Terms of Use',
    lead:
      'These terms keep expectations clear. The tools are free, run on your device, and are provided as-is.',
    updated: '22 November 2026',
    sections: [
      {
        h: '1. Acceptance',
        body: [
          'By using Ultimate Free Tool you agree to these terms. If you do not agree, please do not use the site.',
        ],
      },
      {
        h: '2. The service',
        body: [
          'Ultimate Free Tool provides browser-based utilities for working with PDF files, images and QR codes. All processing happens on your device. We do not provide storage, accounts or a file-hosting service.',
          'The tools are free to use. Ad slots on the site support hosting costs. No payment is required and no paid features are offered.',
        ],
      },
      {
        h: '3. Acceptable use',
        list: [
          'Do not use the tools to process material you do not have the right to use, or to infringe anyone\'s copyright, privacy or other rights.',
          'Do not use the site to create or distribute unlawful, harmful or deceptive content.',
          'Do not attempt to disrupt the site, probe it for vulnerabilities without permission, or use automated requests that degrade service for others.',
          'You are responsible for the files you choose to process and for how you use the results.',
        ],
      },
      {
        h: '4. Your content',
        body: [
          'You keep all rights to the files you process. Because the files never reach us, no licence to your content is granted to us — there is nothing for us to licence.',
        ],
      },
      {
        h: '5. No warranty',
        body: [
          'The tools are provided "as is" and "as available", without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy or non-infringement. File conversion is inherently imperfect: compression can remove text layers, background removal can miss fine edges, and malformed files can fail to open.',
          'Always keep a copy of your original files. Do not use output from these tools as the only copy of a legal, medical, financial or otherwise important document.',
        ],
      },
      {
        h: '6. Limitation of liability',
        body: [
          'To the maximum extent permitted by law, we are not liable for any indirect, incidental, special or consequential damages, or for lost data, profits or business, arising from the use of or inability to use the site. Where liability cannot be excluded, it is limited to the amount you paid to use the service, which is zero.',
        ],
      },
      {
        h: '7. Third-party services and links',
        body: [
          'The site may display advertising or link to third-party websites. We do not control those services and are not responsible for their content, terms or privacy practices. Visiting a third-party site is at your own risk and subject to its own terms.',
        ],
      },
      {
        h: '8. Intellectual property',
        body: [
          'The site\'s design, layout and original code are protected by copyright. The open-source libraries used by the tools remain under their own licences, including the AGPL licence of the background removal library. You may not copy the site wholesale and present it as your own.',
        ],
      },
      {
        h: '9. Availability and changes',
        body: [
          'We may add, change or remove tools at any time, and the site may be unavailable during hosting maintenance. These terms may be updated; the revision date above will change when they are.',
        ],
      },
      {
        h: '10. Governing law',
        body: [
          'These terms are governed by the laws applicable at the operator\'s place of establishment, without regard to conflict-of-law rules. Nothing in these terms limits mandatory consumer protections available to you where you live.',
        ],
      },
      {
        h: '11. Contact',
        body: [
          'Questions about these terms can be raised through the project\'s issue tracker. See the contact page for the link.',
        ],
      },
    ],
  },

  contact: {
    title: 'Contact — Ultimate Free Tool',
    description:
      'Get in touch about Ultimate Free Tool: report a file that would not process, request a new tool, or ask a privacy question through the GitHub issue tracker.',
    h1: 'Contact',
    lead:
      'Questions, bug reports and tool requests are welcome. Because there is no backend, the issue tracker is the fastest way to reach the project.',
    updated: 'November 2026',
    contactCard: true,
    sections: [
      {
        h: 'Reporting a problem with a file',
        body: [
          'If a PDF or image fails to process, please include the app that created the file, the file size, and any error message shown by the tool. Do not attach confidential documents to a public issue — describe the file instead, or reproduce the problem with a sample.',
        ],
      },
      {
        h: 'Requesting a new tool',
        body: [
          'Tell us what you were trying to do and which tool you used instead. Requests that can be solved entirely in the browser are the easiest to add, because the site has no server to run code on.',
        ],
      },
      {
        h: 'Privacy questions',
        body: [
          'If anything in the privacy policy is unclear, ask. There is no stored user data to look up, but we can explain exactly what a tool does with your file — usually, nothing beyond reading it into memory.',
        ],
      },
      {
        h: 'Response times',
        body: [
          'This is a small independent project, so replies are best-effort rather than guaranteed. Clear reports with a reproducible example get answered first.',
        ],
      },
    ],
  },
};
