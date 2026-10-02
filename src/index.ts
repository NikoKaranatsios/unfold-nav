import { UnfoldNav } from './element.js';
import type { SelectDetail, UnfoldNavOptions } from './types.js';

export { UnfoldNav, DEFAULT_OPTIONS, DEFAULT_STRINGS } from './element.js';
export { buildTree, findCurrent } from './tree.js';
export { placeFan, layoutGraph, placeLabel } from './layout.js';
export type * from './types.js';

export const TAG = 'unfold-nav';

/** Registers `<unfold-nav>` (idempotent; importing this module already does it). */
export function define(tag = TAG): void {
  if (typeof customElements === 'undefined' || customElements.get(tag)) return;
  // A CustomElementRegistry cannot register the same constructor under two names.
  customElements.define(tag, tag === TAG ? UnfoldNav : class extends UnfoldNav {});
}
define();

/**
 * Creates a navigation, appends it to `container` (default `document.body`) and returns the element.
 *
 *   const nav = createUnfoldNav({ pages, position: 'bottom' });
 *   nav.addEventListener('unfold-select', (e) => console.log(e.detail.page));
 *   nav.remove(); // to tear it down
 */
export function createUnfoldNav(
  options: Partial<UnfoldNavOptions> & Pick<UnfoldNavOptions, 'pages'>,
  container?: Element | DocumentFragment,
): UnfoldNav {
  if (typeof document === 'undefined')
    throw new Error('[unfold-nav] Call createUnfoldNav in a browser after mounting.');
  const parent = container ?? document.body;
  if (!parent) throw new Error('[unfold-nav] Wait for document.body or provide a container.');
  define();
  const el = document.createElement(TAG) as UnfoldNav;
  el.configure(options);
  parent.append(el);
  return el;
}

declare global {
  interface HTMLElementTagNameMap {
    'unfold-nav': UnfoldNav;
  }
  interface HTMLElementEventMap {
    'unfold-select': CustomEvent<SelectDetail>;
    'unfold-open': CustomEvent<{ mode: 'drag' | 'tap' }>;
    'unfold-close': CustomEvent<undefined>;
    'unfold-highlight': CustomEvent<{ page: SelectDetail['page'] | null }>;
  }
}
