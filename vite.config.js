import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { site, tools, staticPages } from './tools.config.js';

/**
 * Every page is a real static HTML file, generated from tools.config.js before
 * dev/build. That keeps GitHub Pages happy (no SPA rewrite tricks) and gives
 * crawlers the full title, description, H1, FAQ and JSON-LD without JS.
 */
const candidates = [
  'index.html',
  '404.html',
  ...tools.map((tool) => `${tool.slug}/index.html`),
  ...staticPages.map((page) => `${page}/index.html`),
];
const input = Object.fromEntries(
  candidates
    .filter((file) => existsSync(new URL(`./${file}`, import.meta.url)))
    .map((file) => [file.replace(/\/index\.html$|\.html$/g, '') || 'home', file]),
);

/**
 * GitHub Pages reads the custom domain from a CNAME file inside the published
 * artifact. Generate it from the same switch that sets the base path, so a
 * project deployment can never accidentally ship a stale domain (and a custom
 * domain deployment always gets one).
 */
function pagesCname() {
  return {
    name: 'pages-cname',
    apply: 'build',
    closeBundle() {
      const target = new URL('./dist/CNAME', import.meta.url);
      if (site.customDomain) {
        writeFileSync(target, `${site.customDomain}\n`, 'utf8');
      } else if (existsSync(target)) {
        rmSync(target);
      }
    },
  };
}

/**
 * `public/.nojekyll` exists for GitHub Pages, but static hosts that take a build
 * folder reject hidden files on upload. Strip it from `dist` so every build is
 * deployable as-is; Actions-based Pages does not need it.
 */
function dropHiddenDistFiles() {
  return {
    name: 'drop-hidden-dist-files',
    apply: 'build',
    closeBundle() {
      const target = new URL('./dist/.nojekyll', import.meta.url);
      if (existsSync(target)) rmSync(target);
    },
  };
}

/**
 * Hosting upload limits reject single files over ~10 MB. onnxruntime-web ships an
 * emscripten build of its wasm binary, and Vite copies it into dist — but
 * @imgly/background-removal points onnxruntime at its own publicPath (a CDN)
 * before inference, so the bundled copy is never requested. Drop it so the
 * static site stays inside the upload limit instead of failing to deploy.
 */
function dropUnusedWasm() {
  return {
    name: 'drop-unused-ort-wasm',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && /^assets\/ort-wasm.*\.wasm$/.test(fileName)) {
          delete bundle[fileName];
        }
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  // Project URL -> "/<repo>/"; custom domain -> "/". Switch it once in
  // tools.config.js (or with the CUSTOM_DOMAIN env / repository variable).
  base: command === 'serve' ? '/' : site.basePath,
  plugins: [tailwindcss(), pagesCname(), dropHiddenDistFiles(), dropUnusedWasm()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [process.env.PREVIEW_HOST].filter(Boolean),
  },
  preview: {
    host: true,
    allowedHosts: [process.env.PREVIEW_HOST].filter(Boolean),
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    // pdf-lib, pdf.js and the fontkit shim are large but lazily imported by the
    // pages that need them; the default 500 kB warning is not actionable here.
    chunkSizeWarningLimit: 800,
    rollupOptions: { input },
  },
  worker: {
    format: 'es',
  },
}));
