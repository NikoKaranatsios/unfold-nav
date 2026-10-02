/**
 * A mock website for one industry, wearing one design, with unfold-nav as its only navigation.
 * Driven by the query string (`?industry=&design=&position=`) and, when embedded in the showcase,
 * by `postMessage` so switching looks doesn't reload the frame.
 */
import { DEFAULT_OPTIONS } from '../src/element';
import '../src/index';
import type { NavPage, Position } from '../src/types';
import { designById, designCss } from './designs';
import { lucide, lucideMarkup } from './icons';
import { industryById, type Industry } from './industries';

export interface SiteState {
  industry: string;
  design: string;
  position: Position;
}

const params = new URLSearchParams(location.search);
const initial = industryById(params.get('industry') ?? '');
let state: SiteState = {
  industry: initial.id,
  design: params.get('design') ?? initial.design,
  position: (params.get('position') as Position | null) ?? initial.position,
};
let rendered: SiteState | null = null;
let currentHref = '/';

const app = document.getElementById('app')!;
const designStyle = document.head.appendChild(document.createElement('style'));
const nav = document.createElement('unfold-nav');

nav.addEventListener('unfold-open', () => document.documentElement.classList.add('has-opened'));
nav.addEventListener('unfold-select', (e) => {
  // A demo has nowhere to go: show the page in place instead.
  e.preventDefault();
  const { page, trail } = e.detail;
  if (!page.href) return;
  currentHref = page.href;
  nav.current = page.href;
  showPage(industryById(state.industry), page, trail);
  parent.postMessage({ type: 'unfold-showcase:navigated', href: page.href }, location.origin);
});

addEventListener('message', (e: MessageEvent) => {
  if (e.origin !== location.origin || e.data?.type !== 'unfold-showcase:set') return;
  render({ ...state, ...e.data.state });
});

function render(next: SiteState) {
  const industry = industryById(next.industry);
  const design = designById(next.design);
  const industryChanged = rendered?.industry !== industry.id;
  state = { industry: industry.id, design: design.id, position: next.position };

  if (industryChanged) {
    currentHref = '/';
    app.innerHTML = template(industry);
    document.title = industry.brand;
    app.querySelector('[data-home]')?.addEventListener('click', (e) => {
      e.preventDefault();
      currentHref = '/';
      nav.current = '/';
      showPage(industry, null, []);
      parent.postMessage({ type: 'unfold-showcase:navigated', href: '/' }, location.origin);
    });
  }

  const root = document.documentElement;
  root.className = [
    `site--${industry.id}`,
    industry.dark ? 'is-dark' : '',
    `pos-${next.position}`,
    root.classList.contains('has-opened') ? 'has-opened' : '',
    !industryChanged && root.classList.contains('is-subpage') ? 'is-subpage' : '',
  ]
    .filter(Boolean)
    .join(' ');

  designStyle.textContent = designCss(design, 'unfold-nav');
  nav.style.setProperty('--unfold-accent', design.accent ?? industry.accent);
  nav.configure({
    // Reset everything a previous design may have changed, then apply this one.
    nodeSize: DEFAULT_OPTIONS.nodeSize,
    triggerSize: DEFAULT_OPTIONS.triggerSize,
    spacing: DEFAULT_OPTIONS.spacing,
    gap: DEFAULT_OPTIONS.gap,
    labels: DEFAULT_OPTIONS.labels,
    edges: DEFAULT_OPTIONS.edges,
    ...design.options,
    theme: design.theme ?? (industry.dark ? 'dark' : 'light'),
    position: next.position,
    // Bottom and side buttons get their own strip so text never sits under them; top buttons live in
    // the site header, and a centred one floats in a gutter the page leaves for it.
    dock: /^(bottom|left$|right$)/.test(next.position) ? 'bar' : 'float',
    iconResolver: lucide,
    triggerIcon: undefined,
    label: `${industry.brand} navigation`,
    current: currentHref,
    ...(industryChanged ? { pages: industry.pages } : {}),
  });

  const slot = next.position === 'inline' ? app.querySelector('.nav-slot')! : document.body;
  if (nav.parentElement !== slot) slot.append(nav);
  rendered = state;
}

function template(ind: Industry): string {
  return `
<header class="site-header">
  <a class="brand" href="/" data-home>${lucideMarkup(ind.logo)}<span>${ind.brand}</span></a>
  ${ind.meta ? `<span class="meta">${ind.meta}</span>` : '<span class="meta"></span>'}
  <div class="nav-slot"></div>
</header>
<main>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow" data-eyebrow>${ind.eyebrow}</p>
      <h1 data-headline>${ind.headline}</h1>
      <p class="lede" data-lede>${ind.lede}</p>
    </div>
    <div class="hero-art" data-art>${ind.art}</div>
  </section>
  <section class="highlights">
    ${ind.highlights.map(([title, text]) => `<div><h2>${title}</h2><p>${text}</p></div>`).join('')}
  </section>
</main>
<footer class="site-footer">
  <span>© 2026 ${ind.brand}</span>
  <span>${ind.domain}</span>
  <span>Navigation by unfold-nav</span>
</footer>`;
}

/** "Navigates" by swapping the hero copy for the chosen page. */
function showPage(ind: Industry, page: NavPage | null, trail: NavPage[]) {
  const isHome = !page || page.href === '/';
  const eyebrow = app.querySelector<HTMLElement>('[data-eyebrow]')!;
  const headline = app.querySelector<HTMLElement>('[data-headline]')!;
  const lede = app.querySelector<HTMLElement>('[data-lede]')!;
  const art = app.querySelector<HTMLElement>('[data-art]')!;
  document.documentElement.classList.toggle('is-subpage', !isHome);
  if (isHome) {
    eyebrow.textContent = ind.eyebrow;
    headline.textContent = ind.headline;
    lede.textContent = ind.lede;
    art.innerHTML = ind.art;
  } else {
    eyebrow.textContent = [ind.brand, ...trail.slice(0, -1).map((p) => p.label)].join('  /  ');
    headline.textContent = page.label;
    lede.textContent =
      page.description ??
      `This is where the ${page.label.toLowerCase()} page of ${ind.brand} would live. Hold the button again to go anywhere else.`;
    art.innerHTML = page.icon ? `<div class="page-icon">${lucideMarkup(String(page.icon))}</div>` : '';
  }
  headline.animate(
    [
      { opacity: 0, translate: '0 12px' },
      { opacity: 1, translate: '0 0' },
    ],
    {
      duration: 320,
      easing: 'cubic-bezier(.2,.8,.2,1)',
    },
  );
  scrollTo({ top: 0 });
}

render(state);
