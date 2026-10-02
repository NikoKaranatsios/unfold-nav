/**
 * Anything that can be rendered as an icon:
 * - inline SVG / HTML markup: `'<svg …>…</svg>'` (treated as trusted markup)
 * - an image URL: `'/icons/home.svg'`, `'https://…/a.png'`, `'data:image/…'`
 * - an emoji or short text: `'🏠'`, `'A'`
 * - a name your `iconResolver` understands: `'home'`
 * - a DOM node (cloned per use) or a function returning one of the above
 */
export type IconSource = string | Node | (() => Node | string);

export interface NavPage {
  /** Stable id. Generated from the tree position when omitted. */
  id?: string;
  label: string;
  /** Where selecting the page goes. Pages without `href` act as groups (or as actions, see `unfold-select`). */
  href?: string;
  /** `_blank` opens in a new tab. */
  target?: string;
  icon?: IconSource;
  /** Shown under the label while the page is highlighted, and exposed to screen readers. */
  description?: string;
  /** Per-node accent colour (any CSS colour). */
  color?: string;
  disabled?: boolean;
  children?: NavPage[];
  /** Free-form payload, handed back in events. */
  data?: unknown;
}

export type Position =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right'
  /** Render the button in document flow (e.g. inside a header); the graph still unfolds in a top-layer overlay. */
  | 'inline';

export type LabelMode = 'auto' | 'always' | 'hover' | 'none';
export type DockStyle = 'float' | 'bar';
export type ArrowKeys = 'tree' | 'spatial';

/** Text the component speaks or shows. Override for other languages. `{label}` is replaced. */
export interface UnfoldNavStrings {
  /** Accessible name of the list of pages. */
  pages: string;
  /** The centre button at the top level. */
  close: string;
  /** The centre button one level down. */
  backToTop: string;
  /** The centre button deeper down; `{label}` is the page it goes back to. */
  back: string;
}
export type EdgeStyle = 'curved' | 'straight' | 'step' | 'none';
export type Theme = 'auto' | 'light' | 'dark';

export interface SelectDetail {
  page: NavPage;
  /** Pages from the top level down to (and including) the selected page. */
  trail: NavPage[];
  /** How the selection happened. */
  via: 'release' | 'click' | 'keyboard';
}

export interface UnfoldNavOptions {
  /** The site map: an array of top-level pages, or a single root page whose children are the top level. */
  pages: NavPage[] | NavPage;
  /** Where the button sits. Default `bottom-right`. */
  position: Position;
  /**
   * `float`: the button floats over the page. `bar`: it sits in a strip along its edge.
   * Use the published `--unfold-inset-*` values for page padding to keep content clear.
   */
  dock: DockStyle;
  /** Distance from the viewport edge in px (`number` or `{ x, y }`). Default 24. */
  offset: number | { x: number; y: number };
  /** Press duration (ms) before the graph opens in drag mode. Default 220. */
  holdDelay: number;
  /** Dwell time (ms) over a branch before it unfolds while dragging. Default 140. */
  expandDelay: number;
  /** A short tap opens the graph in tap-through mode. Default true. */
  openOnTap: boolean;
  /** Diameter of page nodes in px. Default 52. */
  nodeSize: number;
  /** Diameter of the button in px. Default 60. */
  triggerSize: number;
  /** Preferred distance between a node and its children in px. Default 96. */
  spacing: number;
  /** Minimum free space between neighbouring nodes in px. Default 16. */
  gap: number;
  /** `auto`: labels for the level you're on + highlighted node. `always`, `hover` or `none`. Default `auto`. */
  labels: LabelMode;
  edges: EdgeStyle;
  /** Dim and blur the page behind the graph. Default true. */
  backdrop: boolean;
  /** Vibrate on open / highlight where supported. Default true. */
  haptics: boolean;
  theme: Theme;
  /** URL of the current page. `undefined` = use `location`, `null` = none. */
  current: string | null | undefined;
  /** Accessible name of the button and the navigation dialog. Default `Navigation`. */
  label: string;
  /**
   * `tree` (default): the standard tree keys: Up/Down previous/next, Right opens a branch or enters it,
   * Left closes it or goes to the parent. `spatial`: arrows move to the nearest page in that direction.
   */
  arrowKeys: ArrowKeys;
  /** Override the built-in text (for other languages). */
  strings: Partial<UnfoldNavStrings>;
  /** Icon for the button. Defaults to a small graph glyph. */
  triggerIcon: IconSource | undefined;
  /** Turn icon names (`icon: 'home'`) into markup or nodes, e.g. from an icon library. */
  iconResolver: ((name: string, page?: NavPage) => Node | string | null | undefined) | undefined;
  /** Custom navigation for client-side routers. Called instead of `location.assign`. */
  navigate: ((page: NavPage, detail: SelectDetail) => void) | undefined;
}
