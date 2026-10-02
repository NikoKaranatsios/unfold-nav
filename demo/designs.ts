import type { UnfoldNavOptions } from '../src/types';

/**
 * A design is nothing but public API: `--unfold-*` variables, `::part()` rules and a few options.
 * The showcase prints exactly this as copy-pasteable CSS.
 */
export interface Design {
  id: string;
  name: string;
  blurb: string;
  /** Forces an accent; otherwise the brand (industry) accent is used. */
  accent?: string;
  /** Forces a theme; otherwise it follows the site. */
  theme?: 'light' | 'dark';
  options: Partial<UnfoldNavOptions>;
  vars: Record<string, string>;
  parts?: Record<string, Record<string, string>>;
  /** Swatch colours for the picker. */
  swatch: [string, string, string];
}

const none = '0 0 0 transparent';

export const DESIGNS: Design[] = [
  {
    id: 'glass',
    name: 'Glass',
    blurb: 'Frosted controls over a blurred page. The default.',
    options: { edges: 'curved' },
    vars: {},
    swatch: ['#e9e9f2', '#ffffff', '#5b5bf0'],
  },
  {
    id: 'solid',
    name: 'Solid',
    blurb: 'Opaque, app-like, brand-coloured button.',
    theme: 'light',
    options: { edges: 'straight' },
    vars: {
      '--unfold-surface': '#ffffff',
      '--unfold-surface-active': '#ffffff',
      '--unfold-border': 'rgb(0 0 0 / .06)',
      '--unfold-blur': '0px',
      '--unfold-shadow': '0 1px 2px rgb(0 0 0 / .08), 0 8px 20px -8px rgb(0 0 0 / .25)',
      '--unfold-edge': 'rgb(20 24 40 / .16)',
      '--unfold-label-bg': '#ffffff',
      '--unfold-backdrop': 'rgb(16 20 32 / .28)',
      '--unfold-backdrop-blur': '0px',
    },
    parts: {
      'trigger, hub': { background: 'var(--unfold-accent)', color: '#fff', 'border-color': 'transparent' },
      'node-active': { background: 'var(--unfold-accent)', color: '#fff' },
      'node-path': { background: 'color-mix(in srgb, var(--unfold-accent) 12%, #fff)' },
    },
    swatch: ['#ffffff', '#e8edf7', '#1f6feb'],
  },
  {
    id: 'paper',
    name: 'Paper',
    blurb: 'Ink on cream. Serif italics, hairline edges, no shadows.',
    theme: 'light',
    options: { edges: 'straight', spacing: 100 },
    vars: {
      '--unfold-fg': '#2b2118',
      '--unfold-muted': '#7a6a58',
      '--unfold-surface': '#fbf6ec',
      '--unfold-surface-active': '#fffaf0',
      '--unfold-border': '#2b2118',
      '--unfold-border-width': '1.5px',
      '--unfold-shadow': none,
      '--unfold-outline': 'transparent',
      '--unfold-blur': '0px',
      '--unfold-edge': '#2b2118',
      '--unfold-edge-width': '1.2px',
      '--unfold-label-bg': 'rgb(246 239 226 / .94)',
      '--unfold-label-fg': '#2b2118',
      '--unfold-label-font': "'Fraunces', Georgia, serif",
      '--unfold-label-size': 'max(17px, 1.0625rem)',
      '--unfold-label-weight': '500',
      '--unfold-backdrop': 'rgb(246 239 226 / .86)',
      '--unfold-backdrop-blur': '2px',
    },
    parts: {
      label: { 'box-shadow': 'none', 'backdrop-filter': 'none', 'font-style': 'italic', padding: '2px 6px' },
      'node-active': {
        background: '#2b2118',
        color: '#fbf6ec',
        'box-shadow': '0 0 0 4px #fbf6ec, 0 0 0 5.5px #2b2118',
      },
      'edge-lit': { stroke: '#2b2118', 'stroke-width': '2.2px' },
    },
    swatch: ['#fbf6ec', '#2b2118', '#b5532d'],
  },
  {
    id: 'mono',
    name: 'Mono',
    blurb: 'Black and white, square, spaced-out capitals. Editorial.',
    accent: '#0a0a0a',
    theme: 'light',
    options: { edges: 'straight', nodeSize: 50 },
    vars: {
      '--unfold-fg': '#0a0a0a',
      '--unfold-surface': '#ffffff',
      '--unfold-surface-active': '#0a0a0a',
      '--unfold-border': '#0a0a0a',
      '--unfold-node-radius': '0',
      '--unfold-trigger-radius': '0',
      '--unfold-label-radius': '0',
      '--unfold-shadow': none,
      '--unfold-outline': 'transparent',
      '--unfold-blur': '0px',
      '--unfold-edge': '#0a0a0a',
      '--unfold-edge-width': '1px',
      '--unfold-label-bg': '#ffffff',
      '--unfold-label-fg': '#0a0a0a',
      '--unfold-label-font': "'Inter', 'Helvetica Neue', Arial, sans-serif",
      '--unfold-label-size': 'max(12px, .75rem)',
      '--unfold-label-weight': '600',
      '--unfold-label-tracking': '.16em',
      '--unfold-label-case': 'uppercase',
      '--unfold-backdrop': 'rgb(255 255 255 / .9)',
      '--unfold-backdrop-blur': '0px',
      '--unfold-active-scale': '1',
      '--unfold-dim-opacity': '.5',
      '--unfold-dim-scale': '1',
    },
    parts: {
      'trigger, hub': { background: '#0a0a0a', color: '#fff' },
      'node-active': { color: '#fff', 'box-shadow': 'none' },
      label: { 'box-shadow': 'none', border: '1px solid #0a0a0a', 'backdrop-filter': 'none' },
      'edge-lit': { 'stroke-width': '1.6px' },
    },
    swatch: ['#ffffff', '#0a0a0a', '#8a8a8a'],
  },
  {
    id: 'neon',
    name: 'Neon',
    blurb: 'Dark glass with glowing edges. For products that live at night.',
    theme: 'dark',
    options: { edges: 'curved' },
    vars: {
      '--unfold-fg': '#e8ecff',
      '--unfold-muted': 'rgb(232 236 255 / .6)',
      '--unfold-surface': 'rgb(16 18 34 / .82)',
      '--unfold-surface-active': 'rgb(28 30 56 / .96)',
      '--unfold-border': 'color-mix(in srgb, var(--unfold-accent) 55%, transparent)',
      '--unfold-shadow': '0 0 20px -4px color-mix(in srgb, var(--unfold-accent) 60%, transparent)',
      '--unfold-edge': 'color-mix(in srgb, var(--unfold-accent) 40%, transparent)',
      '--unfold-label-bg': 'rgb(10 12 26 / .86)',
      '--unfold-label-fg': '#e8ecff',
      '--unfold-backdrop': 'rgb(4 5 14 / .62)',
      '--unfold-backdrop-blur': '8px',
    },
    parts: {
      'edge-lit': { stroke: 'var(--unfold-accent)', filter: 'drop-shadow(0 0 4px var(--unfold-accent))' },
      'node-active': {
        'box-shadow':
          '0 0 0 1.5px var(--unfold-accent), 0 0 30px 2px color-mix(in srgb, var(--unfold-accent) 70%, transparent)',
      },
      label: { border: '1px solid color-mix(in srgb, var(--unfold-accent) 35%, transparent)' },
    },
    swatch: ['#0b0c1a', '#7c5cff', '#22d3ee'],
  },
  {
    id: 'luxe',
    name: 'Luxe',
    blurb: 'Navy and gold, fine rules, tall serif labels.',
    accent: '#c8a96a',
    theme: 'dark',
    options: { edges: 'curved', spacing: 104 },
    vars: {
      '--unfold-fg': '#f3e9d2',
      '--unfold-muted': 'rgb(243 233 210 / .6)',
      '--unfold-surface': '#0f1b2d',
      '--unfold-surface-active': '#15253d',
      '--unfold-border': '#c8a96a',
      '--unfold-shadow': '0 10px 30px -12px rgb(0 0 0 / .7)',
      '--unfold-outline': 'transparent',
      '--unfold-blur': '0px',
      '--unfold-edge': 'rgb(200 169 106 / .5)',
      '--unfold-edge-width': '1px',
      '--unfold-label-bg': 'rgb(11 20 36 / .9)',
      '--unfold-label-fg': '#f3e9d2',
      '--unfold-label-font': "'Cormorant Garamond', Georgia, serif",
      '--unfold-label-size': 'max(19px, 1.1875rem)',
      '--unfold-label-weight': '600',
      '--unfold-label-tracking': '.02em',
      '--unfold-backdrop': 'rgb(8 14 24 / .8)',
      '--unfold-backdrop-blur': '4px',
    },
    parts: {
      label: { 'box-shadow': 'none', 'backdrop-filter': 'none', padding: '2px 8px 3px' },
      'node-active': { color: '#c8a96a', 'box-shadow': '0 0 0 4px #0f1b2d, 0 0 0 5px #c8a96a' },
      'edge-lit': { stroke: '#c8a96a', 'stroke-width': '1.4px' },
    },
    swatch: ['#0f1b2d', '#c8a96a', '#f3e9d2'],
  },
  {
    id: 'soft',
    name: 'Soft',
    blurb: 'Big, calm, high-contrast labels always on. Built for clarity.',
    theme: 'light',
    options: { edges: 'curved', labels: 'always', nodeSize: 60, triggerSize: 66, spacing: 110, gap: 18 },
    vars: {
      '--unfold-fg': '#1f3b3a',
      '--unfold-surface': '#f4fbf9',
      '--unfold-surface-active': '#ffffff',
      '--unfold-border': '#ffffff',
      '--unfold-border-width': '2px',
      '--unfold-shadow': '8px 8px 18px rgb(31 59 58 / .14), -6px -6px 14px rgb(255 255 255 / .9)',
      '--unfold-outline': 'transparent',
      '--unfold-blur': '0px',
      '--unfold-edge': 'rgb(31 59 58 / .16)',
      '--unfold-edge-width': '3px',
      '--unfold-label-bg': '#ffffff',
      '--unfold-label-fg': '#1f3b3a',
      '--unfold-label-font': "'Atkinson Hyperlegible', system-ui, sans-serif",
      '--unfold-label-size': 'max(15px, .9375rem)',
      '--unfold-label-weight': '700',
      '--unfold-label-radius': '999px',
      '--unfold-backdrop': 'rgb(232 244 241 / .8)',
      '--unfold-backdrop-blur': '10px',
      '--unfold-icon-size': '26px',
      '--unfold-dim-opacity': '.75',
    },
    parts: {
      'node-active': {
        background: 'var(--unfold-accent)',
        color: '#fff',
        'box-shadow': '0 10px 24px -8px color-mix(in srgb, var(--unfold-accent) 80%, transparent)',
      },
      'trigger, hub': { background: 'var(--unfold-accent)', color: '#fff', 'border-color': 'transparent' },
    },
    swatch: ['#f4fbf9', '#0f8b8d', '#ffffff'],
  },
  {
    id: 'circuit',
    name: 'Circuit',
    blurb: 'Terminal green, monospace, edges routed like traces.',
    accent: '#39ff88',
    theme: 'dark',
    options: { edges: 'step', spacing: 104 },
    vars: {
      '--unfold-fg': '#b8f7c8',
      '--unfold-muted': 'rgb(184 247 200 / .55)',
      '--unfold-surface': '#07110b',
      '--unfold-surface-active': '#0c1f13',
      '--unfold-border': 'rgb(57 255 136 / .5)',
      '--unfold-node-radius': '6px',
      '--unfold-trigger-radius': '8px',
      '--unfold-label-radius': '2px',
      '--unfold-shadow': none,
      '--unfold-outline': 'transparent',
      '--unfold-blur': '0px',
      '--unfold-edge': 'rgb(57 255 136 / .3)',
      '--unfold-label-bg': '#07110b',
      '--unfold-label-fg': '#b8f7c8',
      '--unfold-label-font': "'JetBrains Mono', ui-monospace, monospace",
      '--unfold-label-size': 'max(12px, .75rem)',
      '--unfold-label-weight': '500',
      '--unfold-backdrop': 'rgb(2 6 4 / .9)',
      '--unfold-backdrop-blur': '3px',
      '--unfold-active-scale': '1.06',
    },
    parts: {
      label: { border: '1px solid rgb(57 255 136 / .35)', 'box-shadow': 'none' },
      'node-active': { 'box-shadow': '0 0 0 1px #39ff88, 0 0 18px rgb(57 255 136 / .45)' },
      'edge-lit': { stroke: '#39ff88' },
    },
    swatch: ['#07110b', '#39ff88', '#b8f7c8'],
  },
  {
    id: 'brutal',
    name: 'Brutal',
    blurb: 'Thick outlines, hard shadows, loud type. Springy.',
    theme: 'light',
    options: { edges: 'straight', nodeSize: 56, spacing: 104 },
    vars: {
      '--unfold-fg': '#0a0a0a',
      '--unfold-surface': '#ffffff',
      '--unfold-surface-active': 'var(--unfold-accent)',
      '--unfold-border': '#0a0a0a',
      '--unfold-border-width': '3px',
      '--unfold-node-radius': '14px',
      '--unfold-trigger-radius': '16px',
      '--unfold-label-radius': '0',
      '--unfold-shadow': '4px 4px 0 #0a0a0a',
      '--unfold-outline': 'transparent',
      '--unfold-blur': '0px',
      '--unfold-edge': '#0a0a0a',
      '--unfold-edge-width': '3px',
      '--unfold-label-bg': '#0a0a0a',
      '--unfold-label-fg': '#ffffff',
      '--unfold-label-font': "'Archivo Black', Impact, sans-serif",
      '--unfold-label-size': 'max(14px, .875rem)',
      '--unfold-label-weight': '400',
      '--unfold-label-case': 'uppercase',
      '--unfold-backdrop': 'rgb(255 255 255 / .6)',
      '--unfold-backdrop-blur': '0px',
      '--unfold-duration': '280ms',
      '--unfold-easing': 'cubic-bezier(.5, 1.7, .4, .85)',
    },
    parts: {
      'node-active': { color: '#0a0a0a', 'box-shadow': '6px 6px 0 #0a0a0a' },
      'trigger, hub': { background: 'var(--unfold-accent)' },
      label: { 'box-shadow': '3px 3px 0 var(--unfold-accent)', 'backdrop-filter': 'none' },
    },
    swatch: ['#ffffff', '#0a0a0a', '#ffd60a'],
  },
];

export const designById = (id: string) => DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];

/** The design as a stylesheet scoped to `selector`. */
export function designCss(design: Design, selector = 'unfold-nav', accent?: string): string {
  const lines: string[] = [];
  const vars = { ...(accent ? { '--unfold-accent': accent } : {}), ...design.vars };
  const decl = (props: Record<string, string>) =>
    Object.entries(props)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
  if (Object.keys(vars).length) lines.push(`${selector} {\n${decl(vars)}\n}`);
  for (const [parts, props] of Object.entries(design.parts ?? {})) {
    const sel = parts
      .split(',')
      .map((p) => `${selector}::part(${p.trim()})`)
      .join(',\n');
    lines.push(`${sel} {\n${decl(props)}\n}`);
  }
  return lines.join('\n\n');
}
