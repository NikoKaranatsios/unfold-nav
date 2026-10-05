// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUnfoldNav, define, UnfoldNav } from '../src/index.js';
import * as geometry from '../src/layout.js';
import type { NavPage, UnfoldNavOptions } from '../src/types.js';

const pages: NavPage[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'docs', label: 'Docs', children: [{ id: 'install', label: 'Install', href: '/docs/install' }] },
  { id: 'disabled', label: 'Coming soon', href: '/soon', disabled: true },
];
const node = (nav: UnfoldNav, id: string) =>
  [...nav.shadowRoot!.querySelectorAll<HTMLButtonElement>('.node')].find((el) => el.dataset.id === id)!;
const key = (element: Element, value: string) =>
  element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, composed: true }));
const make = (options: Partial<UnfoldNavOptions> = {}) =>
  createUnfoldNav({ pages, position: 'center', labels: 'none', haptics: false, ...options });

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(768);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(482, 354, 60, 60));
});

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
});

describe('public element API', () => {
  it('registers the default and custom aliases idempotently', () => {
    define();
    define('test-unfold-alias');
    define('test-unfold-alias');
    const alias = document.createElement('test-unfold-alias');
    expect(alias).toBeInstanceOf(UnfoldNav);
    expect(alias.shadowRoot).not.toBeNull();
  });

  it('keeps the current configuration intact when an update is invalid', () => {
    const nav = make();
    expect(() => nav.configure({ position: 'broken' as UnfoldNavOptions['position'], pages: [] })).toThrow(/position/);
    expect(() => nav.configure({ pages: [{ label: 'Broken', children: {} } as NavPage] })).toThrow(/children/);
    expect(nav.position).toBe('center');
    expect(nav.pages).toBe(pages);
    nav.open();
    expect(node(nav, 'home').getAttribute('aria-label')).toBe('Home');
  });

  it('ignores invalid HTML attributes and restores defaults when removed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nav = make();
    nav.setAttribute('node-size', '-4');
    nav.setAttribute('pages', '{broken');
    expect(nav.nodeSize).toBe(52);
    expect(nav.pages).toBe(pages);
    expect(warn).toHaveBeenCalledTimes(2);
    nav.setAttribute('node-size', '64');
    expect(nav.nodeSize).toBe(64);
    nav.removeAttribute('node-size');
    expect(nav.nodeSize).toBe(52);
  });

  it('closes and restores focus when the page tree is replaced', () => {
    const nav = make();
    const closed = vi.fn();
    nav.addEventListener('unfold-close', closed);
    nav.open({ focus: true });
    nav.configure({ pages: [{ id: 'new', label: 'New page' }] });
    expect(nav.isOpen).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
    expect(nav.shadowRoot!.activeElement).toBe(nav.shadowRoot!.querySelector('.trigger'));
    nav.open();
    expect(node(nav, 'new').getAttribute('aria-label')).toBe('New page');
  });

  it('supports tree keys, selection details and canceled routing', () => {
    const navigate = vi.fn();
    const nav = make({ navigate });
    nav.open({ focus: true });
    const trigger = nav.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(nav.shadowRoot!.activeElement).toBe(node(nav, 'home'));
    key(node(nav, 'home'), 'ArrowDown');
    key(node(nav, 'docs'), 'ArrowRight');
    expect(node(nav, 'docs').getAttribute('aria-expanded')).toBe('true');
    key(node(nav, 'docs'), 'ArrowRight');
    expect(nav.shadowRoot!.activeElement).toBe(node(nav, 'install'));
    const selected = vi.fn((event: Event) => event.preventDefault());
    nav.addEventListener('unfold-select', selected);
    key(node(nav, 'install'), 'Enter');
    const event = selected.mock.calls[0][0] as CustomEvent;
    expect(event.detail.trail.map((page: NavPage) => page.label)).toEqual(['Docs', 'Install']);
    expect(event.detail.via).toBe('keyboard');
    expect(event.bubbles && event.composed && event.cancelable).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(nav.isOpen).toBe(false);
    expect(nav.shadowRoot!.activeElement).toBe(trigger);
  });

  it('routes enabled pages and leaves disabled pages inactive', () => {
    const navigate = vi.fn();
    const nav = make({ navigate });
    nav.open({ focus: true });
    key(node(nav, 'disabled'), 'Enter');
    expect(navigate).not.toHaveBeenCalled();
    expect(nav.isOpen).toBe(true);
    key(node(nav, 'home'), 'Enter');
    expect(navigate).toHaveBeenCalledWith(pages[0], expect.objectContaining({ via: 'keyboard' }));
  });

  it('blocks executable URLs in default browser navigation', () => {
    const open = vi.spyOn(window, 'open');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nav = make({ pages: [{ id: 'unsafe', label: 'Unsafe', href: 'javascript:alert(1)', target: '_blank' }] });
    nav.open({ focus: true });
    key(node(nav, 'unsafe'), 'Enter');
    expect(open).not.toHaveBeenCalled();
  });

  it('cancels a pending hold when pointer capture is lost or the element disconnects', () => {
    const nav = make();
    const trigger = nav.shadowRoot!.querySelector<HTMLButtonElement>('.trigger')!;
    const press = () =>
      trigger.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0 }),
      );
    press();
    trigger.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }));
    vi.advanceTimersByTime(300);
    expect(nav.isOpen).toBe(false);
    expect(trigger.hasAttribute('data-pressing')).toBe(false);
    press();
    nav.remove();
    document.body.append(nav);
    vi.advanceTimersByTime(300);
    expect(nav.isOpen).toBe(false);
    nav.open();
    nav.remove();
    vi.advanceTimersByTime(1000);
    expect(nav.isOpen).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(nav.shadowRoot!.querySelectorAll('.node')).toHaveLength(0);
  });

  it('aggregates insets and restores the host value after the last nav disconnects', () => {
    const style = document.documentElement.style;
    style.setProperty('--unfold-inset-bottom', '12px');
    const first = make({ position: 'bottom', offset: 10 });
    const second = make({ position: 'bottom-right', offset: 24 });
    expect(style.getPropertyValue('--unfold-inset-bottom')).toContain('108px');
    second.remove();
    expect(style.getPropertyValue('--unfold-inset-bottom')).toContain('80px');
    first.position = 'top';
    expect(style.getPropertyValue('--unfold-inset-bottom')).toBe('12px');
    expect(style.getPropertyValue('--unfold-inset-top')).toContain('80px');
    first.remove();
    expect(style.getPropertyValue('--unfold-inset-top')).toBe('');
  });

  it('updates current-page and ancestor markers while the menu is open', () => {
    const nav = make({ current: '/' });
    nav.open();
    expect(node(nav, 'home').getAttribute('aria-current')).toBe('page');
    nav.current = '/docs/install';
    expect(node(nav, 'home').hasAttribute('aria-current')).toBe(false);
    expect(node(nav, 'docs').hasAttribute('data-current-trail')).toBe(true);
    key(node(nav, 'docs'), 'ArrowRight');
    expect(node(nav, 'install').getAttribute('aria-current')).toBe('page');
    nav.current = null;
    expect(nav.shadowRoot!.querySelector('[aria-current]')).toBeNull();
    expect(nav.shadowRoot!.querySelector('[data-current-trail]')).toBeNull();
  });

  it('uses the document base URL for relative current-page links', () => {
    const base = document.createElement('base');
    base.href = 'https://example.com/docs/';
    document.head.append(base);
    try {
      const nav = make({ pages: [{ id: 'guide', label: 'Guide', href: 'guide' }], current: 'guide' });
      nav.open();
      expect(node(nav, 'guide').getAttribute('aria-current')).toBe('page');
    } finally {
      base.remove();
    }
  });

  it('cycles repeated typeahead letters and resets the search when reopened', () => {
    const nav = make({
      pages: [
        { id: 'home', label: 'Home' },
        { id: 'help', label: 'Help' },
      ],
    });
    nav.open({ focus: true });
    key(node(nav, 'home'), 'h');
    expect(nav.shadowRoot!.activeElement).toBe(node(nav, 'help'));
    key(node(nav, 'help'), 'h');
    expect(nav.shadowRoot!.activeElement).toBe(node(nav, 'home'));
    nav.close();
    nav.open({ focus: true });
    key(node(nav, 'home'), 'h');
    key(node(nav, 'help'), 'e');
    expect(nav.shadowRoot!.activeElement).toBe(node(nav, 'help'));
  });

  it('reuses graph geometry and SVG paths across repeated focus and hover changes', () => {
    const layout = vi.spyOn(geometry, 'layoutGraph');
    const nav = make();
    vi.advanceTimersByTime(20);
    nav.open({ focus: true });
    const positions = [...nav.shadowRoot!.querySelectorAll<HTMLElement>('.node')].map((el) => el.style.translate);
    const edges = [...nav.shadowRoot!.querySelectorAll('.edge')].map((el) => vi.spyOn(el, 'setAttribute'));
    for (let i = 0; i < 50; i++) {
      key(node(nav, 'home'), 'ArrowDown');
      key(node(nav, 'docs'), 'ArrowUp');
    }
    const overlay = nav.shadowRoot!.querySelector('.overlay')!;
    for (const id of ['home', 'docs', 'home']) {
      const [x, y] = node(nav, id).style.translate.split(' ').map(parseFloat);
      overlay.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: x, clientY: y }));
    }
    expect(layout).toHaveBeenCalledTimes(1);
    expect(edges.every((spy) => spy.mock.calls.every(([name]) => name !== 'd'))).toBe(true);
    expect([...nav.shadowRoot!.querySelectorAll<HTMLElement>('.node')].map((el) => el.style.translate)).toEqual(
      positions,
    );
    key(node(nav, 'docs'), 'ArrowRight');
    expect(layout).toHaveBeenCalledTimes(2);
    nav.spacing = 120;
    expect(layout).toHaveBeenCalledTimes(3);
  });

  it('coalesces resize events and refreshes geometry on the next frame', () => {
    const layout = vi.spyOn(geometry, 'layoutGraph');
    const nav = make();
    vi.advanceTimersByTime(20);
    nav.open();
    layout.mockClear();
    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('resize'));
    expect(layout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(layout).toHaveBeenCalledTimes(1);
  });

  it('refreshes inline geometry when an ancestor scrolls and removes the listener on disconnect', () => {
    const layout = vi.spyOn(geometry, 'layoutGraph');
    const nav = make({ position: 'inline' });
    vi.advanceTimersByTime(20);
    nav.open();
    layout.mockClear();
    document.body.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(20);
    expect(layout).toHaveBeenCalledTimes(1);
    nav.remove();
    layout.mockClear();
    document.body.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(20);
    expect(layout).not.toHaveBeenCalled();
  });

  it('does not expose leaving children to assistive technology and revives them on rapid reopen', () => {
    const nav = make();
    nav.open({ focus: true });
    key(node(nav, 'docs'), 'ArrowRight');
    const install = node(nav, 'install');
    install.focus();
    key(install, 'Backspace');
    expect(install.inert).toBe(true);
    expect(install.getAttribute('aria-hidden')).toBe('true');
    expect(nav.shadowRoot!.activeElement).toBe(node(nav, 'docs'));
    key(node(nav, 'docs'), 'ArrowRight');
    expect(node(nav, 'install')).toBe(install);
    expect(install.inert).toBe(false);
    expect(install.hasAttribute('aria-hidden')).toBe(false);
    expect(install.style.getPropertyValue('--_delay')).toBe('');
    vi.advanceTimersByTime(1000);
    expect(install.isConnected).toBe(true);
    nav.close();
    nav.open();
    vi.advanceTimersByTime(1000);
    expect(nav.isOpen).toBe(true);
    expect(node(nav, 'home').inert).toBe(false);
  });

  it('keeps a page named hub selectable with a pointer', () => {
    const navigate = vi.fn();
    const nav = make({ pages: [{ id: 'hub', label: 'Hub', href: '/hub' }], navigate });
    nav.open();
    const [x, y] = node(nav, 'hub').style.translate.split(' ').map(parseFloat);
    const overlay = nav.shadowRoot!.querySelector('.overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, detail: 1, bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'hub' }), expect.anything());
  });

  it('keeps expansion caches separate for IDs containing separator characters', () => {
    const unusual: NavPage[] = [
      { id: 'a\u001fb', label: 'First group', children: [{ id: 'first', label: 'First child' }] },
      {
        id: 'a',
        label: 'Second group',
        children: [{ id: 'b', label: 'Inner group', children: [{ id: 'last', label: 'Last child' }] }],
      },
    ];
    const warm = make({ pages: unusual });
    warm.open();
    key(node(warm, 'a\u001fb'), 'ArrowRight');
    key(node(warm, 'a'), 'ArrowRight');
    key(node(warm, 'b'), 'ArrowRight');
    const fresh = make({ pages: unusual });
    fresh.open();
    key(node(fresh, 'a'), 'ArrowRight');
    key(node(fresh, 'b'), 'ArrowRight');
    expect(node(warm, 'last').style.translate).toBe(node(fresh, 'last').style.translate);
  });

  it('accepts immediate assistive activation and a fast second pointer gesture after opening', () => {
    const navigate = vi.fn();
    const nav = make({ navigate });
    nav.open();
    node(nav, 'home').click();
    expect(navigate).toHaveBeenCalledTimes(1);
    nav.close();
    const trigger = nav.shadowRoot!.querySelector('.trigger')!;
    trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, isPrimary: true, pointerType: 'mouse' }));
    trigger.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, isPrimary: true, pointerType: 'mouse' }));
    const overlay = nav.shadowRoot!.querySelector('.overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    expect(nav.isOpen).toBe(true);
    node(nav, 'home').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    node(nav, 'home').dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }));
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('does not repeat group activation or select while input composition is active', () => {
    const nav = make();
    nav.open({ focus: true });
    key(node(nav, 'docs'), 'Enter');
    expect(node(nav, 'docs').getAttribute('aria-expanded')).toBe('true');
    node(nav, 'docs').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
    expect(node(nav, 'docs').getAttribute('aria-expanded')).toBe('true');
    node(nav, 'home').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    expect(nav.isOpen).toBe(true);
  });

  it('respects an open listener that closes or disconnects before focus is moved', () => {
    const nav = make();
    nav.addEventListener('unfold-open', () => nav.close({ focusTrigger: true }), { once: true });
    nav.open({ focus: true });
    expect(nav.isOpen).toBe(false);
    expect(nav.shadowRoot!.activeElement).toBe(nav.shadowRoot!.querySelector('.trigger'));
    nav.addEventListener('unfold-open', () => nav.remove(), { once: true });
    nav.open({ focus: true });
    expect(nav.isOpen).toBe(false);
    expect(nav.shadowRoot!.querySelectorAll('.node')).toHaveLength(0);
  });

  it('falls back from broken icon callbacks and applies resolver updates to visible pages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nav = make({
      pages: [{ id: 'home', label: 'Home', icon: 'house' }],
      iconResolver: () => {
        throw new Error('Icon library unavailable');
      },
      triggerIcon: () => {
        throw new Error('Trigger unavailable');
      },
    });
    nav.open();
    expect(node(nav, 'home').querySelector('.mono')?.textContent).toBe('H');
    expect(warn).toHaveBeenCalled();
    nav.iconResolver = () => '★';
    expect(node(nav, 'home').querySelector('.glyph')?.textContent).toBe('★');
    expect(nav.isOpen).toBe(true);
  });

  it('clears active label parts when labels are disabled while the menu is open', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('overlay') ? new DOMRect(0, 0, 1024, 768) : new DOMRect(482, 354, 60, 60);
    });
    const nav = make({ labels: 'auto' });
    nav.open({ focus: true });
    expect(nav.shadowRoot!.querySelector('[part~="label-active"]')).not.toBeNull();
    nav.labels = 'none';
    expect(nav.shadowRoot!.querySelector('[part~="label-active"]')).toBeNull();
    expect(nav.shadowRoot!.querySelector('.label[data-visible]')).toBeNull();
  });

  it('releases animation, dwell and resize timers after interrupted navigation disconnects', () => {
    const baseline = vi.getTimerCount();
    const nav = make();
    nav.open({ focus: true });
    key(node(nav, 'docs'), 'ArrowRight');
    nav.close();
    nav.open();
    window.dispatchEvent(new Event('resize'));
    nav.remove();
    expect(vi.getTimerCount()).toBe(baseline);
  });
});
