import { GRAPH_ICON } from '../src/icons';
import type { NavPage, Position } from '../src/types';
import { DESIGNS, designById, designCss, type Design } from './designs';
import { lucideMarkup } from './icons';
import { INDUSTRIES, industryById, type Industry } from './industries';
import type { SiteState } from './site';

const GRID: Position[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
];
const DESKTOP = { w: 1280, h: 800 };
const PHONE = { w: 390, h: 844 };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const frames = { desktop: $<HTMLIFrameElement>('frame-desktop'), phone: $<HTMLIFrameElement>('frame-phone') };

let state: SiteState = readHash() ?? defaultsFor(INDUSTRIES[0]);
let device: 'both' | 'desktop' | 'phone' = matchMedia('(max-width: 760px)').matches ? 'phone' : 'both';

function defaultsFor(ind: Industry): SiteState {
  return { industry: ind.id, design: ind.design, position: ind.position };
}

function readHash(): SiteState | null {
  const [industry, design, position] = location.hash.slice(1).split('/');
  if (!industry || !INDUSTRIES.some((i) => i.id === industry)) return null;
  const ind = industryById(industry);
  return {
    industry,
    design: DESIGNS.some((d) => d.id === design) ? design : ind.design,
    position: [...GRID, 'inline'].includes(position as Position) ? (position as Position) : ind.position,
  };
}

/* ----------------------------------------------------------------- controls */

function radio(el: HTMLElement, on: boolean) {
  el.setAttribute('aria-checked', String(on));
  el.tabIndex = on ? 0 : -1;
}

function buildControls() {
  const industries = $('industries');
  for (const ind of INDUSTRIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.dataset.id = ind.id;
    b.innerHTML = `${lucideMarkup(ind.icon)}<span>${ind.name}</span>`;
    b.addEventListener('click', () => set(defaultsFor(ind)));
    industries.append(b);
  }

  const designs = $('designs');
  for (const d of DESIGNS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.dataset.id = d.id;
    b.innerHTML = `<span class="swatch">${d.swatch.map((c) => `<i style="background:${c}"></i>`).join('')}</span><span>${d.name}</span>`;
    b.addEventListener('click', () => set({ ...state, design: d.id }));
    designs.append(b);
  }

  const positions = $('positions');
  for (const p of GRID) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', p.replace('-', ' '));
    b.title = p;
    b.dataset.id = p;
    b.addEventListener('click', () => set({ ...state, position: p }));
    positions.append(b);
  }
  $('inline').addEventListener('click', () => set({ ...state, position: 'inline' }));

  // Arrow keys move within each radio group.
  for (const group of [industries, designs, positions]) {
    group.addEventListener('keydown', (e) => {
      const items = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (i < 0) return;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const next = items[(i + step + items.length) % items.length];
      next.focus();
      next.click();
    });
  }

  for (const tab of document.querySelectorAll<HTMLButtonElement>('[data-device]')) {
    tab.addEventListener('click', () => {
      device = tab.dataset.device as typeof device;
      syncDevice();
    });
  }

  $('copy').addEventListener('click', async () => {
    const btn = $('copy');
    const status = $('copy-status');
    try {
      await navigator.clipboard.writeText($('snippet').textContent ?? '');
      btn.textContent = 'Copied';
      status.textContent = 'Code copied to the clipboard';
    } catch {
      btn.textContent = 'Select & copy';
      status.textContent = 'Copying is blocked here; select the code and copy it';
    }
    setTimeout(() => {
      btn.textContent = 'Copy';
      status.textContent = '';
    }, 1600);
  });
}

function syncControls() {
  const ind = industryById(state.industry);
  const design = designById(state.design);
  for (const b of document.querySelectorAll<HTMLElement>('#industries [role="radio"]'))
    radio(b, b.dataset.id === ind.id);
  for (const b of document.querySelectorAll<HTMLElement>('#designs [role="radio"]'))
    radio(b, b.dataset.id === design.id);
  for (const b of document.querySelectorAll<HTMLElement>('#positions [role="radio"]'))
    radio(b, b.dataset.id === state.position);
  radio($('inline'), state.position === 'inline');
  $('design-blurb').textContent = design.blurb;
}

/* ------------------------------------------------------------------- frames */

const siteUrl = (s: SiteState) =>
  `./site.html?${new URLSearchParams({ industry: s.industry, design: s.design, position: s.position })}`;

function initFrames() {
  for (const frame of Object.values(frames)) {
    frame.src = siteUrl(state);
    // A frame that (re)loads gets the current state, in case it changed while loading.
    frame.addEventListener('load', () => post(frame));
  }
  addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== location.origin || e.data?.type !== 'unfold-showcase:navigated') return;
    if (e.source === frames.desktop.contentWindow) setUrl(e.data.href);
  });
  new ResizeObserver(fit).observe($('frames'));
  addEventListener('resize', fit);
}

function post(frame: HTMLIFrameElement) {
  frame.contentWindow?.postMessage({ type: 'unfold-showcase:set', state }, location.origin);
}

function setUrl(href = '/') {
  $('url').textContent = `https://${industryById(state.industry).domain}${href === '/' ? '' : href}`;
}

/** Scales the fixed-size iframes to fit the stage. */
function fit() {
  const box = $('frames');
  const width = box.clientWidth;
  const maxH = Math.max(420, innerHeight - 180);
  const gap = 28;
  const bezel = 22;
  let sd = 0;
  let sp = 0;
  if (device === 'both') {
    const s = Math.min(0.72, (width - gap - bezel) / (DESKTOP.w + PHONE.w), (maxH - bezel) / PHONE.h);
    sd = sp = s;
  } else if (device === 'desktop') {
    sd = Math.min(1, width / DESKTOP.w, (maxH - 40) / DESKTOP.h);
  } else {
    sp = Math.min(1, (width - bezel) / PHONE.w, (maxH - bezel) / PHONE.h);
  }
  setScale('desktop', sd, DESKTOP);
  setScale('phone', sp, PHONE);
}

function setScale(which: 'desktop' | 'phone', s: number, size: { w: number; h: number }) {
  const screen = frames[which].parentElement!;
  screen.style.setProperty('--s', String(s));
  // Round down so the scaled page always covers the screen edge to edge.
  screen.style.width = `${Math.floor(size.w * s)}px`;
  screen.style.height = `${Math.floor(size.h * s)}px`;
}

function syncDevice() {
  $('frames').dataset.device = device;
  for (const tab of document.querySelectorAll<HTMLElement>('[data-device]')) {
    tab.setAttribute('aria-pressed', String(tab.dataset.device === device));
  }
  fit();
}

/* --------------------------------------------------------------------- code */

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function pageJs(p: NavPage, indent: string): string {
  const fields = [`label: ${q(p.label)}`];
  if (p.href) fields.push(`href: ${q(p.href)}`);
  if (typeof p.icon === 'string') fields.push(`icon: ${q(p.icon)}`);
  if (p.description) fields.push(`description: ${q(p.description)}`);
  if (p.color) fields.push(`color: ${q(p.color)}`);
  if (!p.children?.length) return `${indent}{ ${fields.join(', ')} }`;
  const inner = indent + '  ';
  return `${indent}{\n${inner}${fields.join(', ')},\n${inner}children: [\n${p.children
    .map((c) => pageJs(c, inner + '  '))
    .join(',\n')},\n${inner}],\n${indent}}`;
}

const OPTION_ATTRS: [keyof Design['options'], string][] = [
  ['edges', 'edges'],
  ['labels', 'labels'],
  ['nodeSize', 'node-size'],
  ['triggerSize', 'trigger-size'],
  ['spacing', 'spacing'],
  ['gap', 'gap'],
];

function snippet(ind: Industry, design: Design, position: Position): string {
  const attrs = [`position="${position}"`];
  if (/^(bottom|left$|right$)/.test(position)) attrs.push('dock="bar"');
  for (const [key, attr] of OPTION_ATTRS) {
    const v = design.options[key];
    if (v !== undefined && !(key === 'edges' && v === 'curved')) attrs.push(`${attr}="${String(v)}"`);
  }
  attrs.push(`theme="${design.theme ?? (ind.dark ? 'dark' : 'light')}"`);
  const css = designCss(design, 'unfold-nav', design.accent ?? ind.accent)
    .split('\n')
    .map((l) => (l ? '  ' + l : l))
    .join('\n');
  const pages = `[\n${ind.pages.map((p) => pageJs(p, '    ')).join(',\n')},\n  ]`;
  return `<!-- 1. Place it -->
<unfold-nav ${attrs.join(' ')}></unfold-nav>

<!-- 2. Style it: the "${design.name}" design -->
<style>
${css}
</style>

<!-- 3. Feed it your pages -->
<script type="module">
  import 'unfold-nav';
  import { createElement, icons } from 'lucide';

  const nav = document.querySelector('unfold-nav');
  nav.iconResolver = (name) => icons[name] && createElement(icons[name]);
  nav.pages = ${pages};
</script>`;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Just enough highlighting, in one pass so tokens never match each other's markup. */
const TOKENS = /(&lt;!--[\s\S]*?--&gt;)|('(?:[^'\\]|\\.)*'|"[^"]*")|(--unfold-[\w-]+)|(&lt;\/?)([\w-]+)/g;

function highlight(code: string): string {
  return escapeHtml(code).replace(TOKENS, (_m, comment, str, cssVar, open, tag) => {
    if (comment) return `<span class="tok-c">${comment}</span>`;
    if (str) return `<span class="tok-s">${str}</span>`;
    if (cssVar) return `<span class="tok-v">${cssVar}</span>`;
    return `${open}<span class="tok-t">${tag}</span>`;
  });
}

/* -------------------------------------------------------------------- state */

function set(next: SiteState) {
  const industryChanged = next.industry !== state.industry;
  state = next;
  history.replaceState(null, '', `#${state.industry}/${state.design}/${state.position}`);
  syncControls();
  for (const frame of Object.values(frames)) post(frame);
  if (industryChanged) setUrl('/');
  const ind = industryById(state.industry);
  const design = designById(state.design);
  const code = snippet(ind, design, state.position);
  $('snippet').innerHTML = highlight(code);
  const url = siteUrl(state);
  $<HTMLAnchorElement>('open-desktop').href = url;
  $<HTMLAnchorElement>('open-phone').href = url;
}

document.querySelector('.wordmark .glyph')!.innerHTML = GRAPH_ICON;
buildControls();
initFrames();
syncDevice();
set(state);
setUrl('/');
addEventListener('hashchange', () => {
  const next = readHash();
  if (next) set(next);
});

// Dev tool: `?audit` loads an overlap audit of every industry × position (see demo/audit.ts).
if (new URLSearchParams(location.search).has('audit')) void import('./audit');
