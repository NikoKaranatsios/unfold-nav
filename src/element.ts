import { BACK_ICON, CLOSE_ICON, GRAPH_ICON, monogram, renderIcon } from './icons.js';
import {
  hitTest,
  layoutGraph,
  placeLabel,
  rectContains,
  rectsTouch,
  edgeShape,
  type Circle,
  type Fan,
  type LabelContext,
  type Level,
  type PlacedNode,
  type Rect,
  type Size,
  type Sizes,
  type Vec,
} from './layout.js';
import { STYLES } from './styles.js';
import { buildTree, findCurrent, pathTo, type Tree, type TreeNode } from './tree.js';
import type { NavPage, SelectDetail, UnfoldNavOptions, UnfoldNavStrings } from './types.js';

import { DEFAULT_OPTIONS, DEFAULT_STRINGS, normalizeOptions } from './options.js';
import { updateInsets } from './insets.js';
import { navigationUrl } from './navigation.js';
export { DEFAULT_OPTIONS, DEFAULT_STRINGS } from './options.js';

type OptionKey = keyof UnfoldNavOptions;
const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as OptionKey[];

const ATTRIBUTES: Record<string, OptionKey> = {
  pages: 'pages',
  position: 'position',
  dock: 'dock',
  offset: 'offset',
  'hold-delay': 'holdDelay',
  'expand-delay': 'expandDelay',
  'open-on-tap': 'openOnTap',
  'node-size': 'nodeSize',
  'trigger-size': 'triggerSize',
  spacing: 'spacing',
  gap: 'gap',
  labels: 'labels',
  edges: 'edges',
  backdrop: 'backdrop',
  haptics: 'haptics',
  theme: 'theme',
  current: 'current',
  label: 'label',
  'arrow-keys': 'arrowKeys',
  'trigger-icon': 'triggerIcon',
};

function parseAttribute(key: OptionKey, value: string | null): unknown {
  if (value === null) return DEFAULT_OPTIONS[key];
  if (key === 'offset') {
    const [x, y = x] = value
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    return { x, y };
  }
  if (key === 'pages') {
    return JSON.parse(value);
  }
  switch (typeof DEFAULT_OPTIONS[key]) {
    case 'number': {
      const n = Number(value);
      return n;
    }
    case 'boolean':
      return !/^(false|0|off|no)$/i.test(value.trim());
  }
  return value;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEVEL_SEP = '\u001f';
const INSET_EDGES = ['top', 'right', 'bottom', 'left'] as const;
const SUPPORTS_POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const Base: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

const ARROWS: Record<string, Vec> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function toggleAttr(el: Element, name: string, on: boolean, value = '') {
  if (on) el.setAttribute(name, value);
  else el.removeAttribute(name);
}

/** `part="node node-active node-current"`: states as part names, since `::part()` can't match attributes. */
function setParts(el: Element, base: string, states: Record<string, boolean>) {
  const parts = [base];
  for (const [state, on] of Object.entries(states)) if (on) parts.push(`${base}-${state}`);
  const value = parts.join(' ');
  if (el.getAttribute('part') !== value) el.setAttribute('part', value);
}

interface View {
  tree: TreeNode;
  node: HTMLButtonElement;
  label: HTMLDivElement;
  edge: SVGPathElement;
  /** Where the node grows from / folds back to. */
  from: Vec;
  leaveTimer: number;
  /** Where the label is shown, if it is. */
  shownAt: Rect | null;
}

type Via = SelectDetail['via'];
type FocusMode = 'keyboard' | 'pointer' | 'none';

export interface UnfoldNav extends UnfoldNavOptions {}

/**
 * `<unfold-nav>`: press and hold the button, the site map unfolds around it as a graph. Drag along the
 * graph and release on a page to go there, or tap to open it and tap your way through.
 *
 * While open for tapping or the keyboard it is a modal dialog: the rest of the page is inert, focus moves
 * into a tree of pages (standard tree keys), and returns to the button when it closes.
 *
 * Events (all bubble and cross shadow boundaries):
 * - `unfold-select` (cancelable) `detail: SelectDetail`: call `preventDefault()` to handle navigation yourself
 * - `unfold-open` `detail: { mode: 'drag' | 'tap' }`
 * - `unfold-close`
 * - `unfold-highlight` `detail: { page: NavPage | null }`
 */
export class UnfoldNav extends Base {
  static get observedAttributes() {
    return Object.keys(ATTRIBUTES);
  }

  private opts: UnfoldNavOptions = { ...DEFAULT_OPTIONS };
  private text: UnfoldNavStrings = DEFAULT_STRINGS;
  private tree: Tree = buildTree([]);
  private currentId: string | null = null;
  private currentTrail = new Set<string>();

  private state: 'closed' | 'open' | 'closing' = 'closed';
  private mode: 'drag' | 'tap' = 'tap';
  private path: string[] = [];
  private active: string | null = null;
  private focusId: string | null = null;
  private views = new Map<string, View>();
  private placed = new Map<string, PlacedNode>();
  private fanCache = new Map<string, Fan>();
  private labelSizes = new Map<string, Size>();
  /** Open branches with a page show a "→" hint: their label is measured with it. */
  private branchLabelSizes = new Map<string, Size>();
  /** Wrapped (narrower, taller) variants, for labels wider than the narrow width. Same keys as above. */
  private narrowSizes = new Map<string, Size>();
  private narrowBranchSizes = new Map<string, Size>();
  private hub: Circle = { x: 0, y: 0, r: 30 };
  private bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private animationTimers = new Set<number>();

  private pointerId: number | null = null;
  private pointerType = 'mouse';
  private downAt: Vec = { x: 0, y: 0 };
  private lastPoint: Vec = { x: 0, y: 0 };
  private leftHub = false;
  private holdTimer = 0;
  private dwellTimer = 0;
  private dwellTarget: string | null = null;
  private closeTimer = 0;
  private resizeFrame = 0;
  private openedAt = 0;
  private lastPointerUp = -Infinity;
  private typeahead = { text: '', at: 0 };
  private lastKeyActivation = -Infinity;

  private readonly els: {
    root: HTMLDivElement;
    dockBar: HTMLDivElement;
    dock: HTMLDivElement;
    trigger: HTMLButtonElement;
    triggerIcon: HTMLSpanElement;
    iconSlot: HTMLSlotElement;
    iconOwn: HTMLSpanElement;
    overlay: HTMLDialogElement;
    edges: SVGSVGElement;
    layer: HTMLDivElement;
    labels: HTMLDivElement;
    measure: HTMLDivElement;
    hub: HTMLButtonElement;
    hubIcon: HTMLSpanElement;
    probe: HTMLDivElement;
  };

  constructor() {
    if (typeof document === 'undefined')
      throw new Error('[unfold-nav] Create navigation elements in a browser after mounting.');
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${STYLES}</style>
<div class="root" part="root">
  <div class="dock-bar" part="dock-bar" aria-hidden="true"></div>
  <div class="dock" part="dock">
    <button class="trigger" part="trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="graph">
      <svg class="hold" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" pathLength="1"/></svg>
      <span class="trigger-icon" part="trigger-icon" aria-hidden="true"><slot name="icon"></slot><span class="icon-own"></span></span>
    </button>
  </div>
  <dialog class="overlay" part="overlay" id="graph">
    <div class="backdrop" part="backdrop" aria-hidden="true"></div>
    <svg class="edges" part="edges" aria-hidden="true"></svg>
    <div class="layer" role="tree"></div>
    <div class="labels" aria-hidden="true"><div class="measure"></div></div>
    <button class="hub" part="hub" type="button"><span class="hub-icon" aria-hidden="true"></span></button>
  </dialog>
  <div class="safe-probe" aria-hidden="true"></div>
</div>`;
    const $ = <T extends Element>(sel: string) => shadow.querySelector(sel) as T;
    this.els = {
      root: $('.root'),
      dockBar: $('.dock-bar'),
      dock: $('.dock'),
      trigger: $('.trigger'),
      triggerIcon: $('.trigger-icon'),
      iconSlot: $('slot[name="icon"]'),
      iconOwn: $('.icon-own'),
      overlay: $('.overlay'),
      edges: $('.edges'),
      layer: $('.layer'),
      labels: $('.labels'),
      measure: $('.measure'),
      hub: $('.hub'),
      hubIcon: $('.hub-icon'),
      probe: $('.safe-probe'),
    };
    // Drag mode shows the dialog as a (non-modal) top-layer popover; tapping and keyboard use showModal().
    if (SUPPORTS_POPOVER) this.els.overlay.setAttribute('popover', 'manual');
    // Only toggles attributes: touching the slot's own children would fire slotchange again.
    this.els.iconSlot.addEventListener('slotchange', () => this.syncSlotted());

    const { trigger, overlay } = this.els;
    trigger.addEventListener('pointerdown', this.onPointerDown);
    trigger.addEventListener('pointermove', this.onPointerMove);
    trigger.addEventListener('pointerup', this.onPointerUp);
    trigger.addEventListener('pointercancel', this.onPointerCancel);
    trigger.addEventListener('lostpointercapture', this.onLostCapture);
    trigger.addEventListener('click', this.onTriggerClick);
    trigger.addEventListener('keydown', this.onTriggerKey);
    trigger.addEventListener('contextmenu', (e) => e.preventDefault());
    overlay.addEventListener('click', this.onOverlayClick);
    overlay.addEventListener('pointermove', this.onOverlayHover);
    overlay.addEventListener('keydown', this.onOverlayKey);
    overlay.addEventListener('cancel', this.onCancel);
    overlay.addEventListener('close', this.onDialogClose);
    overlay.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
    overlay.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());
    this.applyOptions();
  }

  /* -------------------------------------------------------------- public API */

  /** Update several options at once. */
  configure(options: Partial<UnfoldNavOptions>): this {
    const next = normalizeOptions(this.opts, options);
    const pagesChanged = Object.hasOwn(options, 'pages');
    const tree = pagesChanged ? buildTree(next.pages) : this.tree;
    this.opts = next;
    this.tree = tree;
    if (pagesChanged && this.state !== 'closed') {
      const wasOpen = this.state === 'open';
      const hadFocus = this.focusInside();
      this.finishClose();
      if (hadFocus && this.isConnected) this.els.trigger.focus({ preventScroll: true });
      if (wasOpen) this.emit('unfold-close');
    }
    this.fanCache.clear();
    this.clearLabelSizes();
    this.applyOptions();
    if (this.state === 'open') {
      this.measure();
      this.render();
    }
    return this;
  }

  get isOpen(): boolean {
    return this.state === 'open';
  }

  /** Open for tapping. With `focus`, the first page shows keyboard focus. */
  open({ focus = false }: { focus?: boolean } = {}): void {
    this.show('tap', focus ? 'keyboard' : 'pointer');
  }

  close({ focusTrigger = false }: { focusTrigger?: boolean } = {}): void {
    if (this.state !== 'open') return;
    const hadFocus = this.focusInside();
    this.state = 'closing';
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.dwellTimer);
    this.holdTimer = this.dwellTimer = 0;
    this.dwellTarget = null;
    this.pointerId = null;
    window.removeEventListener('keydown', this.onWindowKey, true);

    const { overlay, trigger, hub } = this.els;
    overlay.dataset.state = 'closing';
    overlay.setAttribute('aria-hidden', 'true');
    hub.tabIndex = -1;
    // Leave the modal state right away, so the page and the button are usable during the exit animation.
    if (overlay.open) {
      overlay.close();
      if (SUPPORTS_POPOVER) {
        try {
          overlay.showPopover();
        } catch {
          /* already showing */
        }
      }
    }
    trigger.setAttribute('aria-expanded', 'false');

    const views = [...this.views.values()].filter((v) => !v.leaveTimer).reverse();
    const stagger = this.reducedMotion ? 0 : Math.min(12, 120 / Math.max(1, views.length));
    views.forEach((v, i) => this.leave(v, this.hub, i * stagger));
    this.closeTimer = window.setTimeout(() => this.finishClose(), this.duration + views.length * stagger + 60);

    if (focusTrigger || hadFocus) trigger.focus({ preventScroll: true });
    this.emit('unfold-close');
  }

  toggle(): void {
    if (this.state === 'open') this.close();
    else this.open();
  }

  /* --------------------------------------------------------------- lifecycle */

  connectedCallback() {
    for (const key of OPTION_KEYS) this.upgradeProperty(key);
    if (!this.tree.root.children.length) {
      const script = this.querySelector('script[type="application/json"]');
      if (script?.textContent?.trim()) {
        try {
          this.configure({ pages: JSON.parse(script.textContent) });
        } catch (error) {
          console.warn('[unfold-nav] Invalid inline pages:', error);
        }
      }
    }
    window.addEventListener('resize', this.onResize);
    document.fonts?.addEventListener('loadingdone', this.onFontsLoaded);
    this.publishInsets();
    this.onResize();
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onWindowKey, true);
    document.fonts?.removeEventListener('loadingdone', this.onFontsLoaded);
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.dwellTimer);
    this.holdTimer = this.dwellTimer = 0;
    this.pointerId = null;
    this.els.trigger.removeAttribute('data-pressing');
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    this.finishClose();
    this.publishInsets();
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null) {
    if (oldValue === value) return;
    const key = ATTRIBUTES[name];
    if (!key) return;
    try {
      this.configure({ [key]: parseAttribute(key, value) });
    } catch (error) {
      console.warn(`[unfold-nav] Ignoring invalid ${name} attribute:`, error);
    }
  }

  /** Properties set before the element was defined shadow the accessors; re-apply them. */
  private upgradeProperty(key: OptionKey) {
    if (Object.prototype.hasOwnProperty.call(this, key)) {
      const value = (this as unknown as Record<string, unknown>)[key];
      delete (this as unknown as Record<string, unknown>)[key];
      this.configure({ [key]: value });
    }
  }

  private applyOptions() {
    const o = this.opts;
    const { root, dock, dockBar, trigger, layer, overlay } = this.els;
    this.text = { ...DEFAULT_STRINGS, ...o.strings };
    root.dataset.theme = o.theme;
    root.dataset.edges = o.edges;
    root.dataset.dock = o.dock;
    toggleAttr(root, 'data-backdrop', o.backdrop);
    dock.dataset.position = o.position;
    const edge = this.dockEdge();
    toggleAttr(dockBar, 'data-edge', !!edge, edge ?? '');
    const off = this.offsets;
    root.style.setProperty('--_offset-x', `${off.x}px`);
    root.style.setProperty('--_offset-y', `${off.y}px`);
    root.style.setProperty('--_trigger-size', `${o.triggerSize}px`);
    root.style.setProperty('--_node-size', `${o.nodeSize}px`);
    root.style.setProperty('--_hold', `${o.holdDelay}ms`);
    trigger.setAttribute('aria-label', o.label);
    overlay.setAttribute('aria-label', o.label);
    layer.setAttribute('aria-label', this.text.pages);

    this.syncIcon();
    this.publishInsets();
  }

  private get offsets(): Vec {
    const o = this.opts.offset;
    return typeof o === 'number' ? { x: o, y: o } : o;
  }

  /** The screen edge the button is docked to, if any. */
  private dockEdge(): (typeof INSET_EDGES)[number] | null {
    const p = this.opts.position;
    if (p === 'center' || p === 'inline') return null;
    if (p.startsWith('top')) return 'top';
    if (p.startsWith('bottom')) return 'bottom';
    return p as 'left' | 'right';
  }

  /**
   * Publishes the space the button takes as `--unfold-inset-{top,right,bottom,left}` on `<html>`, so a
   * page can keep its content clear: `body { padding-bottom: var(--unfold-inset-bottom, 0px) }`.
   */
  private publishInsets() {
    const edge = this.isConnected ? this.dockEdge() : null;
    const off = this.offsets;
    const thickness = this.opts.triggerSize + 2 * (edge === 'top' || edge === 'bottom' ? off.y : off.x);
    updateInsets(this, this.ownerDocument, edge, thickness);
  }

  private syncIcon() {
    const o = this.opts;
    const custom = renderIcon(o.triggerIcon ?? this.tree.root.page.icon, o.iconResolver);
    this.els.iconOwn.replaceChildren(custom ?? renderIcon(GRAPH_ICON, undefined)!);
    this.els.iconOwn.toggleAttribute('data-custom', !!custom);
    this.syncSlotted();
  }

  private syncSlotted() {
    const slotted = this.els.iconSlot.assignedNodes().length > 0;
    toggleAttr(this.els.triggerIcon, 'data-slotted', slotted);
    toggleAttr(this.els.triggerIcon, 'data-default', !slotted && !this.els.iconOwn.hasAttribute('data-custom'));
    if (this.isConnected) this.orientIcon();
  }

  /* --------------------------------------------------------- open & close */

  private show(mode: 'drag' | 'tap', focus: FocusMode) {
    if (this.state === 'open' || !this.isConnected) return;
    window.clearTimeout(this.closeTimer);
    this.state = 'open';
    this.mode = mode;
    this.path = [];
    this.active = null;
    this.focusId = null;
    this.dwellTarget = null;
    this.computeCurrent();

    const { overlay, trigger, hub } = this.els;
    overlay.dataset.state = 'open';
    overlay.dataset.mode = mode;
    overlay.removeAttribute('aria-hidden');
    hub.tabIndex = 0;
    this.present(mode === 'tap');
    trigger.setAttribute('aria-expanded', 'true');
    this.openedAt = performance.now();
    this.measure();
    this.render();
    this.haptic(10);
    if (mode === 'drag') window.addEventListener('keydown', this.onWindowKey, true);
    this.emit('unfold-open', { mode });

    if (mode === 'tap' && focus !== 'none') {
      const first = this.initialFocusId();
      if (first) this.focusNode(first, focus === 'keyboard');
    }
  }

  /** Modal (tap/keyboard) or a non-modal top-layer popover (drag, where the button keeps the pointer). */
  private present(modal: boolean) {
    const ov = this.els.overlay;
    try {
      if (modal) {
        if (SUPPORTS_POPOVER && ov.matches(':popover-open')) ov.hidePopover();
        if (!ov.open) ov.showModal();
      } else if (!ov.open && !(SUPPORTS_POPOVER && ov.matches(':popover-open'))) {
        if (SUPPORTS_POPOVER) ov.showPopover();
        else ov.show();
      }
    } catch {
      /* already in that state */
    }
  }

  private finishClose() {
    window.clearTimeout(this.closeTimer);
    this.state = 'closed';
    window.removeEventListener('keydown', this.onWindowKey, true);
    window.clearTimeout(this.holdTimer);
    window.clearTimeout(this.dwellTimer);
    this.holdTimer = this.dwellTimer = 0;
    this.dwellTarget = null;
    this.pointerId = null;
    this.els.trigger.removeAttribute('data-pressing');
    for (const timer of this.animationTimers) window.clearTimeout(timer);
    this.animationTimers.clear();
    for (const v of this.views.values()) {
      window.clearTimeout(v.leaveTimer);
      v.node.remove();
      v.label.remove();
      v.edge.remove();
    }
    this.views.clear();
    this.placed.clear();
    const { overlay } = this.els;
    try {
      if (overlay.open) overlay.close();
      if (SUPPORTS_POPOVER && overlay.matches(':popover-open')) overlay.hidePopover();
    } catch {
      /* not open */
    }
    overlay.removeAttribute('data-state');
    overlay.removeAttribute('aria-hidden');
    this.els.trigger.setAttribute('aria-expanded', 'false');
  }

  /** Escape, or the Android back gesture, on the modal dialog. */
  private onCancel = (e: Event) => {
    e.preventDefault();
    if (this.state !== 'open') return;
    if (this.path.length) this.goUp(true);
    else this.close({ focusTrigger: true });
  };

  /** The browser closed the dialog by itself (a close request without user activation). */
  private onDialogClose = () => {
    if (
      this.state === 'open' &&
      !this.els.overlay.open &&
      !(SUPPORTS_POPOVER && this.els.overlay.matches(':popover-open'))
    ) {
      this.finishClose();
      this.emit('unfold-close');
      this.els.trigger.focus({ preventScroll: true });
    }
  };

  /** Escape cancels a drag (the pointer is held, so focus is wherever it was). */
  private onWindowKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.state === 'open' && this.mode === 'drag') {
      e.preventDefault();
      this.close();
    }
  };

  private focusInside(): boolean {
    const active = this.shadowRoot?.activeElement;
    return !!active && this.els.overlay.contains(active);
  }

  private computeCurrent() {
    const cur = this.opts.current === undefined ? location.href : this.opts.current;
    const node = cur ? findCurrent(this.tree, cur, location.href) : null;
    this.currentId = node?.id ?? null;
    this.currentTrail = new Set(pathTo(node));
  }

  private initialFocusId(): string | null {
    const trail = this.currentId ? pathTo(this.tree.byId.get(this.currentId)) : [];
    return trail[0] ?? this.tree.root.children[0]?.id ?? null;
  }

  /** Reads the button position, the viewport and safe-area insets. */
  private measure() {
    const { trigger, hub, probe, overlay } = this.els;
    const rect = trigger.getBoundingClientRect();
    const r = trigger.offsetWidth / 2;
    const next = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r };
    if (next.x !== this.hub.x || next.y !== this.hub.y || next.r !== this.hub.r) this.fanCache.clear();
    this.hub = next;
    Object.assign(hub.style, {
      left: `${next.x - r}px`,
      top: `${next.y - r}px`,
      width: `${r * 2}px`,
      height: `${r * 2}px`,
    });

    const view = overlay.getBoundingClientRect();
    const w = view.width || document.documentElement.clientWidth;
    const h = view.height || window.innerHeight;
    const cs = getComputedStyle(probe);
    const inset = {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0,
    };
    const pad = 8;
    const bounds = {
      x: inset.l + pad,
      y: inset.t + pad,
      w: w - inset.l - inset.r - pad * 2,
      h: h - inset.t - inset.b - pad * 2,
    };
    if (bounds.w !== this.bounds.w || bounds.h !== this.bounds.h) this.fanCache.clear();
    this.bounds = bounds;
  }

  /** Points the default glyph towards where the graph will open. */
  private orientIcon() {
    const rect = this.els.trigger.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = document.documentElement.clientWidth / 2 - cx;
    const dy = window.innerHeight / 2 - cy;
    const deg = Math.hypot(dx, dy) < 2 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    this.els.root.style.setProperty('--_icon-rotate', `${deg.toFixed(1)}deg`);
  }

  private onResize = () => {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      if (!this.isConnected) return;
      this.orientIcon();
      if (this.state === 'open') {
        this.measure();
        this.render();
      }
    });
  };

  private clearLabelSizes() {
    for (const m of [this.labelSizes, this.branchLabelSizes, this.narrowSizes, this.narrowBranchSizes]) m.clear();
  }

  /** Web fonts change label sizes: measure again and re-plan. */
  private onFontsLoaded = () => {
    this.clearLabelSizes();
    this.fanCache.clear();
    if (this.state === 'open') this.render();
  };

  /* ------------------------------------------------------------- rendering */

  private render() {
    if (this.state !== 'open') return;
    const { root, byId } = this.tree;
    const r = this.opts.nodeSize / 2;

    const levels: Level[] = [{ key: '', parentId: null, childIds: root.children.map((c) => c.id) }];
    const path: string[] = [];
    for (const id of this.path) {
      const tn = byId.get(id);
      if (!tn || !tn.children.length || (tn.parent?.id ?? '') !== (path[path.length - 1] ?? '')) break;
      path.push(id);
      levels.push({ key: path.join(LEVEL_SEP), parentId: id, childIds: tn.children.map((c) => c.id) });
    }
    this.path = path;
    const onPath = new Set(path);
    const frontier = levels[levels.length - 1].parentId ?? '';

    const withLabels = this.opts.labels !== 'none';
    if (withLabels) this.measureLabels(levels.flatMap((l) => l.childIds));
    this.placed = layoutGraph(
      {
        hub: this.hub,
        bounds: this.bounds,
        levels,
        nodeRadius: r,
        distance: this.opts.spacing,
        gap: this.opts.gap,
        edgeStyle: this.opts.edges,
        labelSize: withLabels ? (id) => this.sizesOf(id, false) : undefined,
        branchLabelSize: withLabels ? (id) => this.sizesOf(id, true) : undefined,
        labelPad: this.labelPad,
      },
      this.fanCache,
    );

    for (const view of this.views.values()) {
      if (!this.placed.has(view.tree.id) && !view.leaveTimer) this.leave(view, view.from, 0);
    }

    const tabStop = this.focusId && this.placed.has(this.focusId) ? this.focusId : this.initialFocusId();
    const entering: View[] = [];
    for (const level of levels) {
      const parentView = level.parentId ? this.views.get(level.parentId) : null;
      let insertAfter: Element | null = parentView?.node ?? null;
      for (const id of level.childIds) {
        const pl = this.placed.get(id)!;
        let view = this.views.get(id);
        if (!view) {
          view = this.createView(byId.get(id)!, pl);
          this.views.set(id, view);
          if (insertAfter) insertAfter.after(view.node);
          else this.els.layer.append(view.node);
          entering.push(view);
        } else if (view.leaveTimer) {
          window.clearTimeout(view.leaveTimer);
          view.leaveTimer = 0;
          view.node.removeAttribute('data-leave');
          view.edge.setAttribute('data-shown', '');
        }
        insertAfter = view.node;
        view.from = pl.from;

        const { node, edge, tree: tn } = view;
        const state = onPath.has(id) ? 'path' : (tn.parent?.id ?? '') === frontier ? 'frontier' : 'dim';
        node.dataset.state = state;
        toggleAttr(node, 'data-active', id === this.active);
        toggleAttr(node, 'data-current', id === this.currentId);
        toggleAttr(node, 'data-current-trail', this.currentTrail.has(id) && id !== this.currentId);
        if (id === this.currentId) node.setAttribute('aria-current', 'page');
        else node.removeAttribute('aria-current');
        if (tn.children.length) node.setAttribute('aria-expanded', String(onPath.has(id)));
        node.tabIndex = id === tabStop ? 0 : -1;
        node.style.setProperty('--_a', `${pl.angle.toFixed(4)}rad`);
        if (!entering.includes(view)) node.style.translate = `${pl.x}px ${pl.y}px`;

        setParts(node, 'node', {
          active: id === this.active,
          current: id === this.currentId,
          trail: this.currentTrail.has(id) && id !== this.currentId,
          path: state === 'path',
          frontier: state === 'frontier',
          dim: state === 'dim',
          branch: tn.children.length > 0,
          disabled: !!tn.page.disabled,
        });

        const parent = level.parentId == null ? this.hub : { ...this.placed.get(level.parentId)!, r };
        const lit = onPath.has(id) || id === this.active;
        const dimEdge = state === 'dim' && id !== this.active;
        edge.setAttribute('d', edgeShape(parent, { x: pl.x, y: pl.y, r }, this.opts.edges, pl.parentAngle).d);
        toggleAttr(edge, 'data-lit', lit);
        toggleAttr(edge, 'data-dim', dimEdge);
        setParts(edge, 'edge', { lit, dim: dimEdge });
      }
    }

    if (entering.length) this.animateIn(entering);
    this.renderLabels();

    const hub = this.els.hub;
    const icon = path.length ? 'back' : 'close';
    if (hub.dataset.icon !== icon) {
      hub.dataset.icon = icon;
      this.els.hubIcon.innerHTML = path.length ? BACK_ICON : CLOSE_ICON;
    }
    const backTo = path.length > 1 ? byId.get(path[path.length - 2])!.page.label : null;
    hub.setAttribute(
      'aria-label',
      !path.length ? this.text.close : backTo ? this.text.back.replace('{label}', backTo) : this.text.backToTop,
    );
    toggleAttr(hub, 'data-active', this.mode === 'drag' && this.dwellTarget === 'hub');
    setParts(hub, 'hub', { back: path.length > 0, active: hub.hasAttribute('data-active') });
  }

  /** Clearance between node rims and labels: room for the hover growth (`--unfold-active-scale`) and halo. */
  private get labelPad(): number {
    const scale = parseFloat(getComputedStyle(this.els.root).getPropertyValue('--_active-scale')) || 1.14;
    return (this.opts.nodeSize / 2) * Math.max(0, scale - 1) + 8;
  }

  private buildLabel(tn: TreeNode): HTMLDivElement {
    const label = document.createElement('div');
    label.className = 'label';
    label.setAttribute('part', 'label');
    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = tn.page.label;
    label.append(title);
    if (tn.page.description) {
      const desc = document.createElement('span');
      desc.className = 'desc';
      desc.textContent = tn.page.description;
      label.append(desc);
    }
    return label;
  }

  /** Size variants of a label (one line first, then wrapped), at rest or as an open branch. */
  private sizesOf(id: string, open: boolean): Sizes | null {
    const wide = (open ? this.branchLabelSizes.get(id) : null) ?? this.labelSizes.get(id);
    if (!wide) return null;
    const narrow = (open ? this.narrowBranchSizes.get(id) : null) ?? this.narrowSizes.get(id);
    return narrow ? [wide, narrow] : wide;
  }

  /** Measures the resting size of labels not measured yet, in one batch (one layout). */
  private measureLabels(ids: string[]) {
    const missing = ids.filter((id) => !this.labelSizes.has(id));
    if (!missing.length) return;
    const box = this.els.measure;
    // Every label at rest; open branches with their "→"; and each of those wrapped narrow.
    const variantsOf = (tn: TreeNode) => (tn.children.length && tn.page.href ? [false, true] : [false]);
    const els = missing.flatMap((id) => {
      const tn = this.tree.byId.get(id)!;
      return variantsOf(tn).flatMap((go) =>
        [false, true].map((narrow) => {
          const el = this.buildLabel(tn);
          toggleAttr(el, 'data-go', go);
          toggleAttr(el, 'data-narrow', narrow);
          box.append(el);
          return { id, el, go, narrow };
        }),
      );
    });
    const size = (el: HTMLElement): Size => ({ w: Math.ceil(el.offsetWidth) + 1, h: Math.ceil(el.offsetHeight) + 1 });
    for (const { id, el, go, narrow } of els) {
      const target = narrow
        ? go
          ? this.narrowBranchSizes
          : this.narrowSizes
        : go
          ? this.branchLabelSizes
          : this.labelSizes;
      target.set(id, size(el));
    }
    // A narrow variant only counts if it is actually narrower.
    for (const [wide, narrow] of [
      [this.labelSizes, this.narrowSizes],
      [this.branchLabelSizes, this.narrowBranchSizes],
    ] as const) {
      for (const id of missing) {
        const n = narrow.get(id);
        if (n && n.w >= (wide.get(id)?.w ?? 0) - 1) narrow.delete(id);
      }
    }
    box.replaceChildren();
  }

  private createView(tn: TreeNode, pl: PlacedNode): View {
    const page = tn.page;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'node';
    node.setAttribute('part', 'node');
    node.setAttribute('role', 'treeitem');
    node.setAttribute('aria-label', page.label);
    node.setAttribute('aria-level', String(tn.depth));
    node.setAttribute('aria-setsize', String(tn.parent?.children.length ?? 1));
    node.setAttribute('aria-posinset', String(tn.index + 1));
    if (page.description) node.setAttribute('aria-description', page.description);
    if (page.disabled) node.setAttribute('aria-disabled', 'true');
    if (tn.children.length) node.dataset.branch = '';
    if (page.color) node.style.setProperty('--_node-accent', page.color);
    node.dataset.id = tn.id;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.setAttribute('part', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.append(renderIcon(page.icon, this.opts.iconResolver, page) ?? monogram(page.label));
    node.append(icon);

    const label = this.buildLabel(tn);
    this.els.labels.append(label);

    const edge = document.createElementNS(SVG_NS, 'path');
    edge.setAttribute('class', 'edge');
    edge.setAttribute('part', 'edge');
    edge.setAttribute('pathLength', '1');
    if (page.color) edge.style.setProperty('--_lit', page.color);
    this.els.edges.append(edge);

    return { tree: tn, node, label, edge, from: pl.from, leaveTimer: 0, shownAt: null };
  }

  /** New nodes grow out of their parent, staggered, with their edge drawing along. */
  private animateIn(views: View[]) {
    const stagger = this.reducedMotion ? 0 : 22;
    for (const v of views) {
      v.node.style.transition = 'none';
      v.node.style.translate = `${v.from.x}px ${v.from.y}px`;
      v.node.dataset.enter = '';
    }
    void this.els.layer.offsetWidth;
    views.forEach((v, i) => {
      const pl = this.placed.get(v.tree.id)!;
      const delay = i * stagger;
      v.node.style.transition = '';
      v.node.style.setProperty('--_delay', `${delay}ms`);
      v.edge.style.setProperty('--_delay', `${delay}ms`);
      // Labels appear once their node has (nearly) arrived, so nothing moves through them.
      v.label.style.setProperty('--_label-delay', `${delay + this.duration * 0.6}ms`);
      v.node.style.translate = `${pl.x}px ${pl.y}px`;
      v.node.removeAttribute('data-enter');
      v.edge.setAttribute('data-shown', '');
      const timer = window.setTimeout(() => {
        this.animationTimers.delete(timer);
        v.node.style.removeProperty('--_delay');
        v.edge.style.removeProperty('--_delay');
        v.label.style.removeProperty('--_label-delay');
      }, delay + this.duration);
      this.animationTimers.add(timer);
    });
  }

  private leave(view: View, to: Vec, delay: number) {
    const { node, edge, label } = view;
    // Don't let focus fall out of the dialog with the node: hand it to the parent (or the centre button).
    if (this.shadowRoot?.activeElement === node && this.state === 'open') {
      const parent = view.tree.parent ? this.views.get(view.tree.parent.id) : null;
      if (parent && !parent.leaveTimer) {
        this.focusId = parent.tree.id;
        parent.node.tabIndex = 0;
        parent.node.focus({ preventScroll: true });
      } else this.els.hub.focus({ preventScroll: true });
    }
    node.style.setProperty('--_delay', `${delay}ms`);
    edge.style.setProperty('--_delay', `${delay}ms`);
    node.style.translate = `${to.x}px ${to.y}px`;
    node.setAttribute('data-leave', '');
    node.removeAttribute('data-active');
    node.setAttribute('part', 'node node-leaving');
    edge.setAttribute('part', 'edge');
    label.setAttribute('part', 'label');
    node.tabIndex = -1;
    edge.removeAttribute('data-shown');
    label.removeAttribute('data-visible');
    view.shownAt = null;
    view.leaveTimer = window.setTimeout(
      () => {
        node.remove();
        label.remove();
        edge.remove();
        this.views.delete(view.tree.id);
      },
      delay + this.duration * 0.7 + 40,
    );
  }

  /**
   * Shows labels without ever overlapping anything:
   * 1. the level you're looking at (and, with `labels="always"`, every other page) uses the room the
   *    layout reserved for it, or on very crowded screens a spot found on demand;
   * 2. the highlighted page gets its description too, if that fits;
   * 3. open branches show their name in their reserved room, or wherever there's room.
   * A label that doesn't fit on one line may wrap onto two (`data-narrow`). Anything that still doesn't
   * fit stays hidden; the page's name is always on the node for assistive tech.
   */
  private renderLabels() {
    const mode = this.opts.labels;
    const r = this.opts.nodeSize / 2;
    const live = [...this.views.values()].filter((v) => !v.leaveTimer);
    const circleOf = new Map<string, Circle>();
    for (const v of live) {
      const pl = this.placed.get(v.tree.id)!;
      circleOf.set(v.tree.id, { x: pl.x, y: pl.y, r });
    }
    const edges = this.opts.edges === 'none' ? [] : live.map((v) => this.placed.get(v.tree.id)!.edge);
    const shown = new Map<string, Rect>();
    const narrowed = new Set<string>();
    const compact = new Set<string>();
    const pad = this.labelPad;
    const ctx = (except: string | null, withEdges: Vec[][] = edges): LabelContext => ({
      bounds: this.bounds,
      circles: [this.hub, ...circleOf.values()],
      taken: [...shown].filter(([id]) => id !== except).map(([, rect]) => rect),
      edges: withEdges,
      pad,
    });
    /**
     * Tighter spacing for labels placed on demand: other nodes only need a small gap, except the
     * highlighted one, which grows. The label's own node keeps the full clearance.
     */
    const tight = (except: string, withEdges: Vec[][] = edges): LabelContext => {
      const base = ctx(except, withEdges);
      const grown = this.active ? circleOf.get(this.active) : null;
      const own = circleOf.get(except);
      const circles = base.circles.map((c) => (c === grown && c !== own ? { ...c, r: c.r + pad - 6 } : c));
      return { ...base, circles, pad: 6, ownPad: pad };
    };
    const fits = (rect: Rect, except: string) =>
      ![...shown].some(([id, other]) => id !== except && rectsTouch(rect, other, 4));
    /** Shows `id` at `rect`; it's the wrapped variant if narrower than its one-line size. */
    const show = (id: string, rect: Rect, wide: Size) => {
      shown.set(id, rect);
      if (rect.w < wide.w - 1) narrowed.add(id);
      else narrowed.delete(id);
    };
    const covers = (rect: Rect | null | undefined, size: Size | undefined) =>
      !!rect && !!size && rect.w >= size.w - 1 && rect.h >= size.h - 1;

    // Settle every label's state before measuring anything (a leftover highlighted or wrapped state would
    // measure the wrong size).
    for (const v of live) {
      toggleAttr(v.label, 'data-go', this.mode === 'tap' && v.node.dataset.state === 'path' && !!v.tree.page.href);
      if (v.tree.id !== this.active) v.label.removeAttribute('data-active');
      v.label.removeAttribute('data-compact');
      v.label.removeAttribute('data-narrow');
    }

    // 1. Reserved labels: the visible level first (it may have borrowed room from dimmed pages).
    if (mode === 'auto' || mode === 'always') {
      const order = [...live].sort(
        (a, b) => Number(b.node.dataset.state === 'frontier') - Number(a.node.dataset.state === 'frontier'),
      );
      for (const v of order) {
        const id = v.tree.id;
        const state = v.node.dataset.state;
        const rect = this.placed.get(id)!.label;
        const wanted = state === 'frontier' || (state === 'dim' && mode === 'always');
        if (wanted && rect && fits(rect, id)) show(id, rect, this.labelSizes.get(id) ?? rect);
      }
      // 1b. A label of the visible level the layout found no room for (very crowded screens only): placed
      //     on demand with tighter spacing, re-evaluated whenever the highlight changes.
      for (const v of live) {
        const id = v.tree.id;
        if (shown.has(id) || id === this.active || v.node.dataset.state !== 'frontier') continue;
        const pl = this.placed.get(id)!;
        const sizes = this.sizesOf(id, false);
        if (!sizes) continue;
        const node = circleOf.get(id)!;
        const c = tight(id);
        const rect =
          placeLabel(node, sizes, pl.angle, c) ?? placeLabel(node, sizes, pl.angle, { ...c, edges: [pl.edge] });
        if (rect) show(id, rect, this.labelSizes.get(id)!);
      }
    }

    // 2. The highlighted page: with its description if there's room, else just its name. Only this node
    //    grows, so its label may come closer to the others than reserved labels do.
    const activeView = this.active ? this.views.get(this.active) : null;
    if (activeView && !activeView.leaveTimer && mode !== 'none') {
      const id = activeView.tree.id;
      const pl = this.placed.get(id)!;
      const node = circleOf.get(id)!;
      const label = activeView.label;
      const open = activeView.node.dataset.state === 'path';
      // Cleanest first: across no edge; then across other pages' edges; an open branch, whose own edge
      // is the highlighted path, may finally sit on that path like a breadcrumb.
      const attempts = (sizes: Sizes) => {
        const c = tight(id);
        return (
          placeLabel(node, sizes, pl.angle, c) ??
          placeLabel(node, sizes, pl.angle, { ...c, edges: [pl.edge] }) ??
          (open ? placeLabel(node, sizes, pl.angle, { ...c, edges: [] }) : null)
        );
      };
      const measure = (): Size => ({ w: label.offsetWidth + 1, h: label.offsetHeight + 1 });
      label.setAttribute('data-active', '');
      let wide = measure();
      let rect: Rect | null = activeView.tree.page.description ? attempts(wide) : null;
      if (!rect) {
        compact.add(id);
        label.setAttribute('data-compact', '');
        wide = measure();
        const narrow = (open ? this.narrowBranchSizes.get(id) : null) ?? this.narrowSizes.get(id);
        const sizes: Sizes = narrow ? [wide, narrow] : wide;
        const reserved = open ? pl.pathLabel : pl.label;
        const own = shown.get(id) ?? (reserved && fits(reserved, id) ? reserved : null);
        rect = own && (covers(own, wide) || covers(own, narrow)) ? own : attempts(sizes);
        // Crowded (small screens): show the name beside the centre button, like a caption; the lit path
        // connects the two.
        if (!rect) {
          const c = tight(id);
          const toCenter = Math.atan2(
            this.bounds.y + this.bounds.h / 2 - this.hub.y,
            this.bounds.x + this.bounds.w / 2 - this.hub.x,
          );
          rect = placeLabel(this.hub, sizes, toCenter, c) ?? placeLabel(this.hub, sizes, toCenter, { ...c, edges: [] });
        }
      }
      if (rect) show(id, rect, wide);
      else shown.delete(id);
    }

    // 3. Open branches: in the room the layout reserved for them, else wherever there's room.
    if (mode === 'auto' || mode === 'always') {
      for (const id of this.path) {
        if (id === this.active || shown.has(id)) continue;
        const v = this.views.get(id);
        if (!v || v.leaveTimer) continue;
        const pl = this.placed.get(id)!;
        const wide = { w: v.label.offsetWidth + 1, h: v.label.offsetHeight + 1 };
        const narrow = this.narrowBranchSizes.get(id) ?? this.narrowSizes.get(id);
        const sizes: Sizes = narrow ? [wide, narrow] : wide;
        const reserved =
          pl.pathLabel && (covers(pl.pathLabel, wide) || covers(pl.pathLabel, narrow)) && fits(pl.pathLabel, id)
            ? pl.pathLabel
            : null;
        const node = circleOf.get(id)!;
        const rings = [0, 12, 28, 48];
        const rect =
          reserved ??
          placeLabel(node, sizes, pl.angle, { ...tight(id), rings }) ??
          placeLabel(node, sizes, pl.angle + Math.PI, {
            ...tight(
              id,
              edges.filter((e) => e !== pl.edge),
            ),
            rings,
          });
        if (rect) show(id, rect, wide);
      }
    }

    for (const v of this.views.values()) {
      const id = v.tree.id;
      const rect = v.leaveTimer ? null : (shown.get(id) ?? null);
      const isActive = id === this.active && !!rect;
      toggleAttr(v.label, 'data-active', isActive);
      toggleAttr(v.label, 'data-narrow', !!rect && narrowed.has(id));
      if (!compact.has(id)) v.label.removeAttribute('data-compact');
      setParts(v.label, 'label', { active: isActive, path: v.node.dataset.state === 'path' });
      if (!rect) {
        v.label.removeAttribute('data-visible');
        v.shownAt = null;
        continue;
      }
      const moved = v.shownAt && (Math.abs(v.shownAt.x - rect.x) > 1 || Math.abs(v.shownAt.y - rect.y) > 1);
      v.label.style.translate = `${rect.x.toFixed(1)}px ${rect.y.toFixed(1)}px`;
      v.label.setAttribute('data-visible', '');
      // Never slide: reappear at the new spot instead.
      if (moved && !this.reducedMotion)
        v.label.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      v.shownAt = rect;
    }
  }

  /* --------------------------------------------------------------- gestures */

  private onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (this.state === 'open') return;
    e.preventDefault();
    const { trigger } = this.els;
    try {
      trigger.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events */
    }
    this.pointerId = e.pointerId;
    this.pointerType = e.pointerType;
    this.downAt = this.lastPoint = { x: e.clientX, y: e.clientY };
    this.leftHub = false;
    trigger.setAttribute('data-pressing', '');
    this.holdTimer = window.setTimeout(() => this.beginDrag(), this.opts.holdDelay);
  };

  private beginDrag() {
    window.clearTimeout(this.holdTimer);
    this.holdTimer = 0;
    this.els.trigger.removeAttribute('data-pressing');
    this.show('drag', 'none');
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const p = (this.lastPoint = { x: e.clientX, y: e.clientY });
    if (this.state !== 'open') {
      // Moving away early skips the wait: press-and-flick works too.
      if (this.holdTimer && Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y) > 10) this.beginDrag();
      else return;
    }
    if (this.mode === 'drag') this.dragTo(p);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.lastPointerUp = performance.now();
    const tapped = this.holdTimer !== 0;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = 0;
    this.els.trigger.removeAttribute('data-pressing');
    if (this.state !== 'open') {
      if (tapped && this.opts.openOnTap) this.show('tap', 'pointer');
      return;
    }
    if (this.mode === 'drag') this.release({ x: e.clientX, y: e.clientY });
  };

  private onPointerCancel = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = 0;
    this.els.trigger.removeAttribute('data-pressing');
    if (this.state === 'open' && this.mode === 'drag') this.close();
  };

  /** Capture lost without a pointerup (rare, browser-specific): treat it as a release where we last were. */
  private onLostCapture = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = 0;
    this.els.trigger.removeAttribute('data-pressing');
    if (this.state === 'open' && this.mode === 'drag') this.release(this.lastPoint);
  };

  private onTriggerClick = (e: MouseEvent) => {
    // Pointer taps are handled above; this catches keyboard and assistive-technology activation.
    if (performance.now() - this.lastPointerUp < 700) return;
    if (this.state === 'open') this.close({ focusTrigger: true });
    else this.show('tap', e.detail === 0 ? 'keyboard' : 'pointer');
  };

  private onTriggerKey = (e: KeyboardEvent) => {
    if (this.state === 'closed' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.show('tap', 'keyboard');
    }
  };

  /** Node, its visible label, or the centre button under a point. */
  private hitAt(p: Vec): string | null {
    const ids: string[] = [];
    const circles: Circle[] = [];
    const r = this.opts.nodeSize / 2;
    for (const [id, pl] of this.placed) {
      const v = this.views.get(id);
      if (!v || v.leaveTimer) continue;
      ids.push(id);
      circles.push({ x: pl.x, y: pl.y, r });
    }
    ids.push('hub');
    circles.push(this.hub);
    const i = hitTest(p, circles, this.pointerType === 'mouse' ? 6 : 14);
    if (i >= 0) return ids[i];
    // Labels are part of the target: pointing at a page's name counts as pointing at the page.
    for (const v of this.views.values()) if (!v.leaveTimer && v.shownAt && rectContains(v.shownAt, p)) return v.tree.id;
    return null;
  }

  private dragTo(p: Vec) {
    const hit = this.hitAt(p);
    if (hit === 'hub') {
      this.setActive(null);
      this.dwell(this.leftHub && this.path.length ? 'hub' : null);
    } else if (hit) {
      this.leftHub = true;
      this.setActive(hit);
      this.dwell(hit);
    } else {
      if (Math.hypot(p.x - this.hub.x, p.y - this.hub.y) > this.hub.r + 6) this.leftHub = true;
      this.setActive(null);
      // Overshooting a branch outwards keeps it unfolding instead of cancelling.
      const keep = this.dwellTarget && this.dwellTarget !== 'hub' && this.isBeyond(p, this.dwellTarget);
      if (!keep) this.dwell(null);
    }
    toggleAttr(this.els.hub, 'data-active', this.dwellTarget === 'hub');
  }

  private isBeyond(p: Vec, id: string): boolean {
    const pl = this.placed.get(id);
    if (!pl || !this.tree.byId.get(id)?.children.length) return false;
    const dx = pl.x - pl.from.x;
    const dy = pl.y - pl.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const vx = p.x - pl.from.x;
    const vy = p.y - pl.from.y;
    const along = vx * ux + vy * uy;
    const across = Math.abs(vx * uy - vy * ux);
    return along > len && along < len + this.opts.spacing * 1.2 && across < this.opts.spacing * 0.55;
  }

  /** Hovering long enough unfolds a branch (or, for a leaf, folds away whatever its siblings had open). */
  private dwell(target: string | null) {
    if (target === this.dwellTarget) return;
    window.clearTimeout(this.dwellTimer);
    this.dwellTimer = 0;
    this.dwellTarget = target;
    if (!target) return;
    this.dwellTimer = window.setTimeout(() => {
      this.dwellTimer = 0;
      if (target === 'hub') return this.setPath([]);
      const tn = this.tree.byId.get(target);
      if (!tn || tn.page.disabled) return;
      this.setPath(pathTo(tn.children.length ? tn : tn.parent));
    }, this.opts.expandDelay);
  }

  private release(p: Vec) {
    window.clearTimeout(this.dwellTimer);
    this.dwellTimer = 0;
    this.dwellTarget = null;
    const hit = this.hitAt(p);
    if (hit && hit !== 'hub') {
      const tn = this.tree.byId.get(hit)!;
      if (!tn.page.disabled) {
        if (tn.page.href || !tn.children.length) return this.select(tn, 'release');
        this.path = pathTo(tn);
      }
      return this.toTapMode(hit);
    }
    // Held and let go without going anywhere: keep it open for tapping.
    if (!this.leftHub) return this.toTapMode(null);
    this.close();
  }

  /** From drag to tap: the dialog becomes modal and focus moves into it. */
  private toTapMode(focusId: string | null) {
    this.mode = 'tap';
    this.els.overlay.dataset.mode = 'tap';
    window.removeEventListener('keydown', this.onWindowKey, true);
    this.present(true);
    this.render();
    const id = focusId ?? this.initialFocusId();
    if (id) this.focusNode(id, false);
  }

  private onOverlayHover = (e: PointerEvent) => {
    if (this.state !== 'open' || this.mode !== 'tap' || e.pointerType !== 'mouse') return;
    const hit = this.hitAt({ x: e.clientX, y: e.clientY });
    this.setActive(hit === 'hub' ? null : hit);
  };

  private onOverlayClick = (e: MouseEvent) => {
    if (this.state !== 'open' || this.mode !== 'tap') return;
    const now = performance.now();
    if (now - this.openedAt < 250) return; // the click that finished the opening tap
    if (e.detail === 0 && now - this.lastKeyActivation < 500) return; // already handled on keydown
    const target = e.target as Element;
    if (target.closest('.hub')) return this.hubAction(e.detail === 0);
    const node = target.closest<HTMLElement>('.node');
    let id = node?.dataset.id ?? null;
    if (!id && e.detail !== 0) {
      const hit = this.hitAt({ x: e.clientX, y: e.clientY });
      id = hit === 'hub' ? null : hit;
    }
    const tn = id ? this.tree.byId.get(id) : null;
    if (!tn) return this.close();
    const via: Via = e.detail === 0 ? 'keyboard' : 'click';
    this.focusNode(tn.id, via === 'keyboard');
    this.activate(tn, via, e.metaKey || e.ctrlKey || e.button === 1);
  };

  private hubAction(keyboard: boolean) {
    if (this.path.length) this.goUp(keyboard);
    else this.close({ focusTrigger: true });
  }

  /* ---------------------------------------------------------------- keyboard */

  private onOverlayKey = (e: KeyboardEvent) => {
    if (this.state !== 'open') return;
    const key = e.key;
    if (key === 'Escape') {
      // Escape closes the whole dialog (Left / Backspace step back a level).
      e.preventDefault();
      this.close({ focusTrigger: true });
      return;
    }
    if (this.mode !== 'tap') return;
    const target = e.composedPath()[0] as Element | undefined;
    const nodeEl = target instanceof Element ? target.closest<HTMLElement>('.node') : null;
    // Keys on the centre button keep their native meaning (Enter/Space press it, Tab moves on).
    if (!nodeEl) {
      if (target === this.els.hub) return;
      if (key in ARROWS || key === 'Home' || key === 'End') {
        e.preventDefault();
        const id = this.focusId && this.placed.has(this.focusId) ? this.focusId : this.initialFocusId();
        if (id) this.focusNode(id);
      }
      return;
    }
    const focused = this.tree.byId.get(nodeEl.dataset.id!);
    if (!focused) return;
    if (this.focusId !== focused.id) this.focusId = focused.id;

    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      this.lastKeyActivation = performance.now();
      return this.activateKey(focused, e.metaKey || e.ctrlKey);
    }
    if (key === 'Backspace') {
      e.preventDefault();
      return this.stepBack(focused);
    }
    const handled = this.opts.arrowKeys === 'spatial' ? this.spatialKey(focused, key) : this.treeKey(focused, key);
    if (handled) {
      e.preventDefault();
      return;
    }
    if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && key !== ' ') this.typeAhead(focused, key);
  };

  /** Pages in reading order: every top-level page, each open branch followed by its children. */
  private visibleOrder(): string[] {
    const out: string[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        out.push(n.id);
        if (this.path.includes(n.id)) walk(n.children);
      }
    };
    walk(this.tree.root.children);
    return out;
  }

  /** WAI-ARIA tree keys (mirrored for right-to-left). */
  private treeKey(f: TreeNode, key: string): boolean {
    const rtl = getComputedStyle(this).direction === 'rtl';
    const order = this.visibleOrder();
    const i = order.indexOf(f.id);
    const open = this.path.includes(f.id);
    if (key === 'ArrowDown') {
      if (i < order.length - 1) this.focusNode(order[i + 1]);
    } else if (key === 'ArrowUp') {
      if (i > 0) this.focusNode(order[i - 1]);
    } else if (key === (rtl ? 'ArrowLeft' : 'ArrowRight')) {
      if (f.children.length && !f.page.disabled) {
        if (open) this.focusNode(f.children[0].id);
        else {
          this.path = pathTo(f);
          this.haptic(6);
          this.focusNode(f.id);
        }
      }
    } else if (key === (rtl ? 'ArrowRight' : 'ArrowLeft')) {
      if (open) {
        this.path = pathTo(f.parent);
        this.focusNode(f.id);
      } else if (f.parent && f.parent.depth > 0) this.focusNode(f.parent.id);
    } else if (key === 'Home') this.focusNode(order[0]);
    else if (key === 'End') this.focusNode(order[order.length - 1]);
    else return false;
    return true;
  }

  /** Arrows move to the nearest visible page in that direction, whatever the layout looks like. */
  private spatialKey(f: TreeNode, key: string): boolean {
    if (key in ARROWS) {
      const from = this.placed.get(f.id);
      if (!from) return true;
      const dir = ARROWS[key];
      let best: string | null = null;
      let bestScore = Infinity;
      for (const [id, pl] of this.placed) {
        if (id === f.id || this.views.get(id)?.leaveTimer) continue;
        const vx = pl.x - from.x;
        const vy = pl.y - from.y;
        const along = vx * dir.x + vy * dir.y;
        if (along <= 1) continue;
        const across = Math.abs(vx * dir.y - vy * dir.x);
        if (across > along * 2.2) continue;
        const score = along + across * 2;
        if (score < bestScore) {
          bestScore = score;
          best = id;
        }
      }
      if (best) this.focusNode(best);
      return true;
    }
    if (key === 'Home' || key === 'End') {
      const sibs = f.parent?.children ?? [];
      const target = key === 'Home' ? sibs[0] : sibs[sibs.length - 1];
      if (target) this.focusNode(target.id);
      return true;
    }
    return false;
  }

  /**
   * Enter / Space. Tree keys: a page with an address opens it; a group without one opens or closes.
   * Spatial keys: like tapping (first press unfolds a branch, the next opens its page).
   */
  private activateKey(f: TreeNode, newTab: boolean) {
    if (f.page.disabled) return;
    if (this.opts.arrowKeys === 'spatial') return this.activate(f, 'keyboard', newTab);
    if (f.page.href || !f.children.length) return this.select(f, 'keyboard', newTab);
    this.path = this.path.includes(f.id) ? pathTo(f.parent) : pathTo(f);
    this.haptic(6);
    this.focusNode(f.id);
  }

  /** Backspace: close the branch you're in and focus its page. */
  private stepBack(f: TreeNode) {
    if (f.parent && f.parent.depth > 0) {
      this.path = pathTo(f.parent.parent);
      this.focusNode(f.parent.id);
    } else if (this.path.length) {
      this.path = [];
      this.focusNode(f.id);
    }
  }

  private typeAhead(f: TreeNode, char: string) {
    const now = performance.now();
    this.typeahead.text = now - this.typeahead.at < 700 ? this.typeahead.text + char.toLowerCase() : char.toLowerCase();
    this.typeahead.at = now;
    const pool = this.opts.arrowKeys === 'spatial' ? (f.parent?.children ?? []).map((n) => n.id) : this.visibleOrder();
    const query = this.typeahead.text;
    const at = pool.indexOf(f.id);
    const start = query.length === 1 ? at + 1 : at;
    for (let i = 0; i < pool.length; i++) {
      const id = pool[(start + i) % pool.length];
      if (this.tree.byId.get(id)!.page.label.toLowerCase().startsWith(query)) return this.focusNode(id);
    }
  }

  private goUp(keyboard: boolean) {
    const last = this.path[this.path.length - 1];
    this.path = this.path.slice(0, -1);
    if (last) this.focusNode(last, keyboard);
    else this.render();
  }

  /** Moves focus (roving tabindex). `highlight` also shows it as the active page, label and all. */
  private focusNode(id: string, highlight = true) {
    this.focusId = id;
    if (highlight) this.active = id;
    this.render();
    this.views.get(id)?.node.focus({ preventScroll: true });
    if (highlight) this.emitHighlight();
  }

  /* -------------------------------------------------------------- selection */

  /** Tap (or Enter with spatial keys): unfold a closed branch; open a page; fold a branch that has no page. */
  private activate(tn: TreeNode, via: Via, newTab = false) {
    if (tn.page.disabled) return;
    if (newTab && tn.page.href) return this.select(tn, via, true);
    const expanded = this.path.includes(tn.id);
    if (tn.children.length && !expanded) {
      this.path = pathTo(tn);
      this.haptic(6);
      if (via === 'keyboard') this.focusNode(tn.children[0].id);
      else {
        this.active = tn.id;
        this.render();
      }
      return;
    }
    if (tn.children.length && !tn.page.href) {
      this.path = pathTo(tn.parent);
      if (via === 'keyboard') this.focusNode(tn.id);
      else this.render();
      return;
    }
    this.select(tn, via, newTab);
  }

  private select(tn: TreeNode, via: Via, newTab = false) {
    const detail: SelectDetail = {
      page: tn.page,
      trail: pathTo(tn).map((id) => this.tree.byId.get(id)!.page),
      via,
    };
    const proceed = this.emit('unfold-select', detail, true);
    this.haptic(12);
    this.close({ focusTrigger: via === 'keyboard' });
    if (!proceed) return;
    const { href, target } = tn.page;
    if (this.opts.navigate && !(href && (newTab || (target && target !== '_self')))) {
      this.opts.navigate(tn.page, detail);
      return;
    }
    if (!href) return;
    const url = navigationUrl(href, document.baseURI);
    if (!url) {
      console.warn('[unfold-nav] Refusing an unsupported navigation URL:', href);
      return;
    }
    if (newTab || (target && target !== '_self')) window.open(url, newTab ? '_blank' : target, 'noopener');
    else location.assign(url);
  }

  private setActive(id: string | null) {
    if (id === this.active) return;
    this.active = id;
    if (id && this.mode === 'drag') this.haptic(4);
    this.render();
    this.emitHighlight();
  }

  private setPath(path: string[]) {
    if (path.length === this.path.length && path.every((id, i) => id === this.path[i])) return;
    this.path = path;
    this.haptic(6);
    this.render();
  }

  /* ---------------------------------------------------------------- helpers */

  private emit(type: string, detail?: unknown, cancelable = false): boolean {
    return this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable }));
  }

  private emitHighlight() {
    const page = this.active ? (this.tree.byId.get(this.active)?.page ?? null) : null;
    this.emit('unfold-highlight', { page });
  }

  private haptic(ms: number) {
    if (!this.opts.haptics) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* unsupported */
    }
  }

  private get reducedMotion(): boolean {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** The `--unfold-duration` actually in effect, in ms. */
  private get duration(): number {
    const raw = getComputedStyle(this.els.root).getPropertyValue('--_dur').trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 340;
    return raw.endsWith('ms') ? n : raw.endsWith('s') ? n * 1000 : n;
  }
}

// Every option is also a property: `nav.position = 'top'`, `nav.pages = [...]`.
if (typeof HTMLElement !== 'undefined') {
  for (const key of OPTION_KEYS) {
    Object.defineProperty(UnfoldNav.prototype, key, {
      configurable: true,
      enumerable: true,
      get(this: UnfoldNav) {
        return (this as unknown as { opts: UnfoldNavOptions }).opts[key];
      },
      set(this: UnfoldNav, value: unknown) {
        this.configure({ [key]: value } as Partial<UnfoldNavOptions>);
      },
    });
  }
}

export type { NavPage };
