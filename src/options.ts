import type { IconSource, UnfoldNavOptions, UnfoldNavStrings } from './types.js';

export const DEFAULT_STRINGS: UnfoldNavStrings = Object.freeze({
  pages: 'Pages',
  close: 'Close navigation',
  backToTop: 'Back to all pages',
  back: 'Back to {label}',
});

export const DEFAULT_OPTIONS: UnfoldNavOptions = Object.freeze({
  pages: Object.freeze([]) as unknown as UnfoldNavOptions['pages'],
  position: 'bottom-right',
  dock: 'float',
  offset: 24,
  holdDelay: 220,
  expandDelay: 140,
  openOnTap: true,
  nodeSize: 52,
  triggerSize: 60,
  spacing: 96,
  gap: 16,
  labels: 'auto',
  edges: 'curved',
  backdrop: true,
  haptics: true,
  theme: 'auto',
  current: undefined,
  label: 'Navigation',
  arrowKeys: 'tree',
  strings: Object.freeze({}),
  triggerIcon: undefined,
  iconResolver: undefined,
  navigate: undefined,
});

export function isIconSource(value: unknown): value is IconSource {
  return (
    typeof value === 'string' ||
    typeof value === 'function' ||
    (typeof value === 'object' && value !== null && 'cloneNode' in value && typeof value.cloneNode === 'function')
  );
}

const enums = {
  position: [
    'top-left',
    'top',
    'top-right',
    'left',
    'center',
    'right',
    'bottom-left',
    'bottom',
    'bottom-right',
    'inline',
  ],
  dock: ['float', 'bar'],
  labels: ['auto', 'always', 'hover', 'none'],
  edges: ['curved', 'straight', 'step', 'none'],
  theme: ['auto', 'light', 'dark'],
  arrowKeys: ['tree', 'spatial'],
};

/** Validate before applying changes, so an invalid update leaves a working navigation intact. */
export function normalizeOptions(current: UnfoldNavOptions, patch: Partial<UnfoldNavOptions>): UnfoldNavOptions {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch))
    throw new TypeError('[unfold-nav] Options must be an object.');
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (!Object.hasOwn(DEFAULT_OPTIONS, key)) continue;
    const k = key as keyof UnfoldNavOptions;
    (next as unknown as Record<string, unknown>)[k] = value === undefined ? DEFAULT_OPTIONS[k] : value;
  }
  for (const [key, values] of Object.entries(enums)) {
    if (!values.includes(next[key as keyof typeof enums]))
      throw new TypeError(`[unfold-nav] Invalid ${key}. Expected ${values.join(', ')}.`);
  }
  for (const key of ['nodeSize', 'triggerSize', 'spacing', 'gap', 'holdDelay', 'expandDelay'] as const) {
    const value = next[key];
    const positive = key === 'nodeSize' || key === 'triggerSize' || key === 'spacing';
    if (typeof value !== 'number' || !Number.isFinite(value) || (positive ? value <= 0 : value < 0)) {
      throw new RangeError(`[unfold-nav] ${key} must be a finite ${positive ? 'positive' : 'non-negative'} number.`);
    }
  }
  const off = next.offset;
  const offsets = typeof off === 'number' ? [off] : off && typeof off === 'object' ? [off.x, off.y] : [];
  if (!offsets.length || offsets.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
    throw new RangeError('[unfold-nav] offset must be a non-negative number or { x, y }.');
  }
  if (typeof off === 'object') next.offset = { x: off.x, y: off.y };
  for (const key of ['openOnTap', 'backdrop', 'haptics'] as const) {
    if (typeof next[key] !== 'boolean') throw new TypeError(`[unfold-nav] ${key} must be a boolean.`);
  }
  if (typeof next.label !== 'string' || !next.label.trim())
    throw new TypeError('[unfold-nav] label must be a non-empty string.');
  if (next.current != null && typeof next.current !== 'string')
    throw new TypeError('[unfold-nav] current must be a URL string, null or undefined.');
  for (const key of ['navigate', 'iconResolver'] as const) {
    if (next[key] !== undefined && typeof next[key] !== 'function')
      throw new TypeError(`[unfold-nav] ${key} must be a function.`);
  }
  if (next.triggerIcon !== undefined && !isIconSource(next.triggerIcon))
    throw new TypeError('[unfold-nav] Invalid triggerIcon.');
  if (!next.strings || typeof next.strings !== 'object' || Array.isArray(next.strings))
    throw new TypeError('[unfold-nav] strings must be an object.');
  for (const key of Object.keys(DEFAULT_STRINGS) as (keyof UnfoldNavStrings)[]) {
    if (next.strings[key] !== undefined && typeof next.strings[key] !== 'string')
      throw new TypeError(`[unfold-nav] strings.${key} must be a string.`);
  }
  next.strings = Object.fromEntries(
    Object.entries(next.strings).filter(([key, value]) => Object.hasOwn(DEFAULT_STRINGS, key) && value !== undefined),
  );
  return next;
}
