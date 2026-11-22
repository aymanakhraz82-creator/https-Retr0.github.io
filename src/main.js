import { initChrome } from './site.js';

/**
 * Every file in src/tools/ is an entry point, discovered at build time. Adding
 * a tool is therefore: add it to tools.config.js, drop a module in src/tools/
 * that exports mount(root), and rebuild.
 *
 * The glob is code-split, so a visitor on the QR page never downloads pdf.js or
 * the background-removal runtime.
 */
const toolModules = import.meta.glob('./tools/*.js');

async function boot() {
  initChrome();

  const root = document.querySelector('[data-tool]');
  if (!root) return;

  const slug = root.getAttribute('data-tool');
  const load = toolModules[`./tools/${slug}.js`];

  if (!load) {
    root.innerHTML =
      '<p class="form-error">This tool could not be found. Reload the page or pick another tool from the menu.</p>';
    console.error(`[tool:${slug}] No module found at src/tools/${slug}.js`);
    return;
  }

  try {
    const module = await load();
    await module.mount(root);
  } catch (error) {
    console.error(`[tool:${slug}]`, error);
    root.innerHTML = `
      <div class="space-y-3">
        <p class="form-error">The tool failed to load. Check your connection and reload the page.</p>
        <button type="button" class="btn btn-secondary" data-reload>Reload the page</button>
      </div>`;
    root.querySelector('[data-reload]')?.addEventListener('click', () => window.location.reload());
  }
}

boot();
