import type { IconSource, NavPage } from './types.js';

export type IconResolver = ((name: string, page?: NavPage) => Node | string | null | undefined) | undefined;

const URL_LIKE = /^(https?:|data:|blob:|\/|\.\.?\/)|\.(svg|png|jpe?g|gif|webp|avif)(\?.*)?$/i;
const ICON_NAME = /^[a-z][\w-]{2,}$/i;

/**
 * Turns an `IconSource` into DOM. Returns null when there is nothing to show (the caller falls back to a
 * monogram). Markup strings are inserted as-is, so only pass markup you trust.
 */
export function renderIcon(src: IconSource | undefined, resolve: IconResolver, page?: NavPage, depth = 0): Node | null {
  try {
    return buildIcon(src, resolve, page, depth);
  } catch (error) {
    console.warn('[unfold-nav] Could not render icon:', error);
    return null;
  }
}

function buildIcon(
  src: IconSource | undefined,
  resolve: IconResolver,
  page: NavPage | undefined,
  depth: number,
): Node | null {
  if (src == null || src === '' || depth > 3) return null;
  if (typeof src === 'function') return renderIcon(src(), resolve, page, depth + 1);
  if (typeof src !== 'string') return src.cloneNode(true);

  const s = src.trim();
  if (s.startsWith('<')) {
    const t = document.createElement('template');
    t.innerHTML = s;
    return t.content;
  }
  if (URL_LIKE.test(s)) {
    const img = document.createElement('img');
    img.src = s;
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    return img;
  }
  if (ICON_NAME.test(s)) {
    const resolved = resolve?.(s, page);
    return resolved == null || resolved === s ? null : renderIcon(resolved, undefined, page, depth + 1);
  }
  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.textContent = s;
  return glyph;
}

export function monogram(label: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'mono';
  el.textContent = Array.from(label.trim())[0]?.toUpperCase() ?? '•';
  return el;
}

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** A small graph unfolding upwards; rotated towards wherever the graph will open. */
export const GRAPH_ICON = svg(
  '<path d="M12 17.5 6 8.6M12 17.5V6.2M12 17.5l6-8.9"/>' +
    '<circle cx="12" cy="18.2" r="2.5" fill="currentColor" stroke="none"/>' +
    '<circle cx="5.6" cy="8" r="2" fill="currentColor" stroke="none"/>' +
    '<circle cx="12" cy="5.4" r="2" fill="currentColor" stroke="none"/>' +
    '<circle cx="18.4" cy="8" r="2" fill="currentColor" stroke="none"/>',
);
export const CLOSE_ICON = svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>');
export const BACK_ICON = svg('<path d="M19 12H5.5M11 6l-6 6 6 6"/>');
