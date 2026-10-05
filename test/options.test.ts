import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, normalizeOptions } from '../src/options.js';
import { navigationUrl } from '../src/navigation.js';
import type { UnfoldNavOptions } from '../src/types.js';

describe('configuration validation', () => {
  it.each([
    { spacing: 0 },
    { gap: -1 },
    { nodeSize: NaN },
    { triggerSize: Infinity },
    { offset: { x: 2 } },
    { holdDelay: -1 },
    { openOnTap: 'false' },
    { label: '' },
    { theme: 'neon' },
    { navigate: true },
    { strings: { close: 3 } },
  ])('rejects invalid options %j', (patch) => {
    expect(() => normalizeOptions(DEFAULT_OPTIONS, patch as Partial<UnfoldNavOptions>)).toThrow();
  });
  it('resets undefined values, allows zero delays and ignores unknown keys', () => {
    const options = normalizeOptions(DEFAULT_OPTIONS, { holdDelay: 0, theme: 'dark' });
    expect(normalizeOptions(options, { theme: undefined }).theme).toBe('auto');
    expect(options.holdDelay).toBe(0);
    expect(normalizeOptions(options, JSON.parse('{"__proto__":{"bad":true},"constructor":null}')).position).toBe(
      'bottom-right',
    );
    expect(Object.getPrototypeOf(options)).toBe(Object.prototype);
  });
  it('owns a copy of validated offsets so later caller mutations cannot corrupt them', () => {
    const offset = { x: 12, y: 24 };
    const options = normalizeOptions(DEFAULT_OPTIONS, { offset });
    offset.x = NaN;
    expect(options.offset).toEqual({ x: 12, y: 24 });
  });
});

describe('default navigation URLs', () => {
  it('allows web and contact links', () => {
    for (const href of [
      '/home',
      '#install',
      'https://other.example',
      'mailto:hello@example.com',
      'tel:+431234',
      'sms:+431234',
    ]) {
      expect(navigationUrl(href, 'https://example.com/')).not.toBeNull();
    }
  });
  it('rejects script and document protocols, including obfuscated forms', () => {
    for (const href of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,<script/>',
      'vbscript:x',
      'file:///tmp/a',
    ]) {
      expect(navigationUrl(href, 'https://example.com/')).toBeNull();
    }
  });
});
