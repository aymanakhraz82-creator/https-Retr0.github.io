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

export default defineConfig(({ command }) => ({
  // Project URL -> "/<repo>/"; custom domain -> "/". Switch it once in
  // tools.config.js (or with the CUSTOM_DOMAIN env / repository variable).
  base: command === 'serve' ? '/' : site.basePath,
  plugins: [tailwindcss(), pagesCname()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [process.env.PREVIEW_HOST].filter(Boolean),
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    rollupOptions: { input },
  },
  worker: {
    format: 'es',
  },
}));
