// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUnfoldNav, define, UnfoldNav } from '../src/index.js';
import type { NavPage, UnfoldNavOptions } from '../src/types.js';

const pages: NavPage[] = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'docs', label: 'Docs', children: [{ id: 'install', label: 'Install', href: '/docs/install' }] },
  { id: 'disabled', label: 'Coming soon', href: '/soon', disabled: true },
];
const node = (nav: UnfoldNav, id: string) =>
  nav.shadowRoot!.querySelector<HTMLButtonElement>(`.node[data-id="${id}"]`)!;
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
});
