/**
 * Shared site chrome: theme switching, the header tools menu, the mobile menu
 * and the footer year.
 */

const THEME_KEY = 'uft-theme';

function applyThemeLabel(toggle, dark) {
  if (!toggle) return;
  toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  toggle.setAttribute('aria-pressed', String(dark));
}

export function initChrome() {
  const root = document.documentElement;

  /* ---------------------------------------------------------------- Theme */
  const toggle = document.querySelector('[data-theme-toggle]');
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const setTheme = (dark, persist) => {
    root.classList.toggle('dark', dark);
    applyThemeLabel(toggle, dark);
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
      } catch {
        /* Private mode: the theme just will not persist. */
      }
    }
  };

  let stored = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    stored = null;
  }
  setTheme(stored ? stored === 'dark' : media.matches, false);

  toggle?.addEventListener('click', () => setTheme(!root.classList.contains('dark'), true));
  media.addEventListener?.('change', (event) => {
    let hasStored = null;
    try {
      hasStored = localStorage.getItem(THEME_KEY);
    } catch {
      hasStored = null;
    }
    if (!hasStored) setTheme(event.matches, false);
  });

  /* -------------------------------------------------------- Header panels */
  const toolsToggle = document.querySelector('[data-tools-toggle]');
  const toolsPanel = document.querySelector('[data-tools-panel]');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  const setPanel = (button, panel, open) => {
    if (!button || !panel) return;
    panel.classList.toggle('hidden', !open);
    button.setAttribute('aria-expanded', String(open));
  };

  const closeMenus = (except) => {
    if (except !== 'tools') setPanel(toolsToggle, toolsPanel, false);
    if (except !== 'mobile') setPanel(menuToggle, mobileMenu, false);
  };

  toolsToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = toolsPanel?.classList.contains('hidden');
    closeMenus('tools');
    setPanel(toolsToggle, toolsPanel, Boolean(open));
  });

  menuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = mobileMenu?.classList.contains('hidden');
    closeMenus('mobile');
    setPanel(menuToggle, mobileMenu, Boolean(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuToggle.innerHTML = open
      ? '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
      : '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  });

  document.addEventListener('click', (event) => {
    if (toolsPanel?.contains(event.target) || toolsToggle?.contains(event.target)) return;
    if (mobileMenu?.contains(event.target) || menuToggle?.contains(event.target)) return;
    closeMenus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeMenus();
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      menuToggle?.focus();
      menuToggle?.setAttribute('aria-label', 'Open menu');
    }
  });

  /* Any link tap closes an open menu so the next page is clean. */
  [...(toolsPanel?.querySelectorAll('a') || []), ...(mobileMenu?.querySelectorAll('a') || [])].forEach((link) => {
    link.addEventListener('click', () => closeMenus());
  });

  document.querySelector('[data-tools-panel] a')?.addEventListener('click', () => closeMenus());

  /* -------------------------------------------------------------- Footer */
  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}
