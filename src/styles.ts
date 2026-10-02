/**
 * Every public knob is a `--unfold-*` custom property (set it on the element or any ancestor). Internally
 * each one resolves into a private `--_*` variable that carries the light/dark default.
 */
const LIGHT = `
  --_fg: var(--unfold-fg, #17171c);
  --_muted: var(--unfold-muted, rgb(23 23 28 / .68));
  --_surface: var(--unfold-surface, rgb(255 255 255 / .78));
  --_surface-active: var(--unfold-surface-active, rgb(255 255 255 / .96));
  --_border: var(--unfold-border, rgb(255 255 255 / .7));
  --_outline: var(--unfold-outline, rgb(15 15 30 / .09));
  --_shadow: var(--unfold-shadow, 0 1px 2px rgb(15 15 30 / .08), 0 10px 28px -8px rgb(15 15 30 / .28));
  --_edge: var(--unfold-edge, rgb(23 23 28 / .2));
  --_label-bg: var(--unfold-label-bg, rgb(255 255 255 / .9));
  --_label-fg: var(--unfold-label-fg, var(--_fg));
  --_backdrop: var(--unfold-backdrop, rgb(244 244 248 / .42));
`;

const DARK = `
  --_fg: var(--unfold-fg, #f3f3f6);
  --_muted: var(--unfold-muted, rgb(243 243 246 / .7));
  --_surface: var(--unfold-surface, rgb(38 38 44 / .72));
  --_surface-active: var(--unfold-surface-active, rgb(56 56 64 / .92));
  --_border: var(--unfold-border, rgb(255 255 255 / .12));
  --_outline: var(--unfold-outline, rgb(0 0 0 / .4));
  --_shadow: var(--unfold-shadow, 0 1px 2px rgb(0 0 0 / .3), 0 12px 30px -8px rgb(0 0 0 / .6));
  --_edge: var(--unfold-edge, rgb(243 243 246 / .22));
  --_label-bg: var(--unfold-label-bg, rgb(30 30 36 / .9));
  --_label-fg: var(--unfold-label-fg, var(--_fg));
  --_backdrop: var(--unfold-backdrop, rgb(8 8 12 / .45));
`;

export const STYLES: string = `
:host {
  display: inline-block;
  vertical-align: middle;
}
:host([hidden]) { display: none; }

.root {
  --_accent: var(--unfold-accent, #5b5bf0);
  --_accent-fg: var(--unfold-accent-fg, #fff);
  --_blur: var(--unfold-blur, 18px);
  --_backdrop-blur: var(--unfold-backdrop-blur, 6px);
  --_edge-width: var(--unfold-edge-width, 1.5px);
  --_icon-size: var(--unfold-icon-size, 22px);
  --_dur: var(--unfold-duration, 340ms);
  --_spring: var(--unfold-easing, cubic-bezier(.22, 1.2, .36, 1));
  --_ease: cubic-bezier(.3, .7, .2, 1);
  --_z: var(--unfold-z-index, 2147483000);
  --_node-radius: var(--unfold-node-radius, 50%);
  --_trigger-radius: var(--unfold-trigger-radius, 50%);
  --_border-width: var(--unfold-border-width, 1px);
  --_active-scale: var(--unfold-active-scale, 1.14);
  --_dim-opacity: var(--unfold-dim-opacity, .7);
  --_dim-scale: var(--unfold-dim-scale, .86);
  --_label-radius: var(--unfold-label-radius, 9px);
  /* Follows the reader's font-size preference, never smaller than 13px. */
  --_label-size: var(--unfold-label-size, max(13px, .8125rem));
  --_desc-size: var(--unfold-description-size, max(12px, .75rem));
  --_dock-bg: var(--unfold-dock-bg, color-mix(in srgb, var(--_surface-active) 88%, transparent));
  --_dock-border: var(--unfold-dock-border, var(--_outline));
  --_dock-blur: var(--unfold-dock-blur, 16px);
  --_label-weight: var(--unfold-label-weight, 600);
  --_label-tracking: var(--unfold-label-tracking, normal);
  --_label-case: var(--unfold-label-case, none);
  ${LIGHT}
  /* Longhands on purpose: with no --unfold-font the family declaration is invalid and simply inherits the
     page's font, while size and weight stay ours. (A shorthand with an inherited part would be dropped.) */
  font-family: var(--unfold-font);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--_fg);
}
.root[data-theme="dark"] { ${DARK} }
@media (prefers-color-scheme: dark) {
  .root[data-theme="auto"] { ${DARK} }
}

/* ---------------------------------------------------------------- button */

/* dock="bar": a strip along the button's edge, so page content never sits under the button. */
.dock-bar {
  display: none;
  position: fixed;
  z-index: calc(var(--_z) - 1);
  background: var(--_dock-bg);
  border: 0 solid var(--_dock-border);
  -webkit-backdrop-filter: blur(var(--_dock-blur)) saturate(1.4);
  backdrop-filter: blur(var(--_dock-blur)) saturate(1.4);
}
.root[data-dock="bar"] .dock-bar[data-edge] { display: block; }
.dock-bar[data-edge="top"], .dock-bar[data-edge="bottom"] { left: 0; right: 0; }
.dock-bar[data-edge="left"], .dock-bar[data-edge="right"] { top: 0; bottom: 0; }
.dock-bar[data-edge="top"] { top: 0; height: calc(var(--_trigger-size) + var(--_offset-y) * 2 + env(safe-area-inset-top, 0px)); border-bottom-width: 1px; }
.dock-bar[data-edge="bottom"] { bottom: 0; height: calc(var(--_trigger-size) + var(--_offset-y) * 2 + env(safe-area-inset-bottom, 0px)); border-top-width: 1px; }
.dock-bar[data-edge="left"] { left: 0; width: calc(var(--_trigger-size) + var(--_offset-x) * 2 + env(safe-area-inset-left, 0px)); border-right-width: 1px; }
.dock-bar[data-edge="right"] { right: 0; width: calc(var(--_trigger-size) + var(--_offset-x) * 2 + env(safe-area-inset-right, 0px)); border-left-width: 1px; }

.dock {
  position: fixed;
  z-index: var(--_z);
  width: var(--_trigger-size);
  height: var(--_trigger-size);
  --_ox: calc(var(--_offset-x) + env(safe-area-inset-left, 0px));
  --_ox-r: calc(var(--_offset-x) + env(safe-area-inset-right, 0px));
  --_oy: calc(var(--_offset-y) + env(safe-area-inset-top, 0px));
  --_oy-b: calc(var(--_offset-y) + env(safe-area-inset-bottom, 0px));
}
.dock[data-position="inline"] { position: relative; z-index: auto; }
.dock[data-position^="top"] { top: var(--_oy); }
.dock[data-position^="bottom"] { bottom: var(--_oy-b); }
.dock[data-position$="left"] { left: var(--_ox); }
.dock[data-position$="right"] { right: var(--_ox-r); }
.dock[data-position="top"], .dock[data-position="bottom"], .dock[data-position="center"] {
  left: calc(50% - var(--_trigger-size) / 2);
}
.dock[data-position="left"], .dock[data-position="right"], .dock[data-position="center"] {
  top: calc(50% - var(--_trigger-size) / 2);
}

.trigger, .hub, .node {
  all: unset;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  border-radius: var(--_node-radius);
  color: var(--_fg);
  background: var(--_surface);
  border: var(--_border-width) solid var(--_border);
  box-shadow: var(--_shadow), 0 0 0 .5px var(--_outline);
  -webkit-backdrop-filter: blur(var(--_blur)) saturate(1.8);
  backdrop-filter: blur(var(--_blur)) saturate(1.8);
  cursor: pointer;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
.trigger:focus-visible, .hub:focus-visible, .node:focus-visible {
  outline: 3px solid var(--_accent);
  outline-offset: 3px;
}

.trigger, .hub { border-radius: var(--_trigger-radius); }
.trigger {
  position: relative;
  width: 100%;
  height: 100%;
  transition: scale 220ms var(--_ease), box-shadow 220ms;
}
.trigger:hover { box-shadow: var(--_shadow), 0 0 0 .5px var(--_outline), 0 0 0 6px color-mix(in srgb, var(--_accent) 10%, transparent); }
.trigger[data-pressing] { scale: .92; }
.trigger-icon, .hub-icon {
  display: grid;
  place-items: center;
  width: var(--_icon-size);
  height: var(--_icon-size);
  pointer-events: none;
}
.trigger-icon[data-default] { rotate: var(--_icon-rotate, 0deg); }
.icon-own { display: contents; }
.trigger-icon[data-slotted] .icon-own { display: none; }
.icon-own > svg, .icon-own > img, .hub-icon > svg, .trigger-icon ::slotted(*) { width: 100%; height: 100%; display: block; }
.icon-own > img { object-fit: contain; }

.hold {
  position: absolute;
  inset: -5px;
  width: calc(100% + 10px);
  height: calc(100% + 10px);
  rotate: -90deg;
  pointer-events: none;
  overflow: visible;
}
.hold circle {
  fill: none;
  stroke: var(--_accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transition: opacity 120ms, stroke-dashoffset 120ms;
}
.trigger[data-pressing] .hold circle {
  opacity: 1;
  stroke-dashoffset: 0;
  transition: opacity 80ms, stroke-dashoffset var(--_hold) linear;
}

/* --------------------------------------------------------------- overlay */

.overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  overflow: hidden;
  overscroll-behavior: none;
  z-index: var(--_z);
  touch-action: none;
}
.overlay:not([data-state]) { display: none; }
.overlay::backdrop { background: transparent; }
.overlay:focus { outline: none; }

.backdrop {
  position: absolute;
  inset: 0;
  background: var(--_backdrop);
  -webkit-backdrop-filter: blur(var(--_backdrop-blur)) saturate(1.2);
  backdrop-filter: blur(var(--_backdrop-blur)) saturate(1.2);
  opacity: 0;
  transition: opacity var(--_dur) var(--_ease);
}
.root:not([data-backdrop]) .backdrop { background: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; }
.overlay[data-state="open"] .backdrop { opacity: 1; }

.edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.edge {
  fill: none;
  stroke: var(--_edge);
  stroke-width: var(--_edge-width);
  stroke-linecap: round;
  stroke-dasharray: 1 1;
  stroke-dashoffset: 1;
  opacity: 0;
  transition: stroke-dashoffset var(--_dur) var(--_ease) var(--_delay, 0ms), opacity 160ms var(--_delay, 0ms), stroke 160ms, stroke-width 160ms;
}
.edge[data-shown] { stroke-dashoffset: 0; opacity: 1; }
.edge[data-dim] { opacity: .45; }
.edge[data-lit] { stroke: var(--_lit, var(--_accent)); stroke-width: calc(var(--_edge-width) + .5px); }

.root[data-edges="none"] .edges { display: none; }

.layer, .labels { position: absolute; inset: 0; pointer-events: none; }

/* ----------------------------------------------------------------- nodes */

.hub {
  position: absolute;
  pointer-events: auto;
  transition: scale 220ms var(--_ease);
}
.hub[data-active] { scale: 1.08; }
.hub-icon { transition: rotate var(--_dur) var(--_spring), opacity 160ms; }
.overlay:not([data-state="open"]) .hub-icon { rotate: -90deg; opacity: 0; }

.node {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--_node-size);
  height: var(--_node-size);
  margin: calc(var(--_node-size) / -2) 0 0 calc(var(--_node-size) / -2);
  pointer-events: auto;
  scale: 1;
  --_tint: var(--_node-accent, var(--_accent));
  transition:
    translate var(--_dur) var(--_spring) var(--_delay, 0ms),
    scale var(--_dur) var(--_spring) var(--_delay, 0ms),
    opacity calc(var(--_dur) * .6) var(--_ease) var(--_delay, 0ms),
    background-color 160ms, border-color 160ms, box-shadow 160ms, color 160ms;
}
.node[data-state="dim"] { opacity: var(--_dim-opacity); scale: var(--_dim-scale); }
.node[data-state="path"] { border-color: color-mix(in srgb, var(--_tint) 55%, transparent); color: var(--_tint); }
.node[data-active] {
  background: var(--_surface-active);
  color: var(--_tint);
  opacity: 1;
  scale: var(--_active-scale);
  box-shadow: var(--_shadow), 0 0 0 2px var(--_tint), 0 0 0 7px color-mix(in srgb, var(--_tint) 18%, transparent);
}
.node[data-current] { color: var(--_tint); }
.node[data-current]::before {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 1.5px dashed color-mix(in srgb, var(--_tint) 70%, transparent);
  pointer-events: none;
}
.node[aria-disabled="true"] { opacity: .35; cursor: not-allowed; }
.node[data-enter], .node[data-leave] { scale: .35; opacity: 0; }
.node[data-leave] { pointer-events: none; transition-duration: calc(var(--_dur) * .7); }

/* A knob on the rim, pointing where the children will unfold. */
.node[data-branch]::after {
  content: "";
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--_surface-active);
  box-shadow: 0 0 0 1.5px var(--_muted);
  translate: calc(cos(var(--_a, 0deg)) * (var(--_node-size) / 2 - 1px)) calc(sin(var(--_a, 0deg)) * (var(--_node-size) / 2 - 1px));
  transition: background-color 160ms, box-shadow 160ms;
}
.node[data-branch][data-current-trail]::after,
.node[data-branch][data-state="path"]::after,
.node[data-branch][data-active]::after { background: var(--_tint); box-shadow: 0 0 0 1.5px var(--_tint); }
.node[data-state="path"]::after { opacity: 0; }

.icon {
  display: grid;
  place-items: center;
  width: var(--_icon-size);
  height: var(--_icon-size);
  pointer-events: none;
}
.icon > svg, .icon > img { width: 100%; height: 100%; display: block; }
.icon > img { object-fit: contain; border-radius: 4px; }
.glyph { font-size: calc(var(--_icon-size) * .92); line-height: 1; }
.mono { font-weight: 650; font-size: calc(var(--_icon-size) * .8); line-height: 1; letter-spacing: -.01em; }

/* ---------------------------------------------------------------- labels */

.label {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  width: max-content;
  max-width: var(--unfold-label-max-width, 160px);
  padding: 5px 10px 6px;
  border-radius: var(--_label-radius);
  background: var(--_label-bg);
  color: var(--_label-fg);
  box-shadow: 0 1px 2px rgb(0 0 0 / .06), 0 4px 14px -4px rgb(0 0 0 / .18), 0 0 0 .5px var(--_outline);
  -webkit-backdrop-filter: blur(var(--_blur));
  backdrop-filter: blur(var(--_blur));
  overflow-wrap: anywhere;
  pointer-events: none;
  opacity: 0;
  /* Labels never slide: a sliding label could cross another one on its way. */
  transition: opacity 140ms var(--_ease);
}
.label[data-visible] { opacity: 1; transition-delay: var(--_label-delay, 0ms), 0ms; }
.label[data-instant] { transition: none; }
.label .title {
  display: block;
  text-wrap: balance;
  font-family: var(--unfold-label-font, var(--unfold-font));
  font-size: var(--_label-size);
  font-weight: var(--_label-weight);
  line-height: 1.25;
  letter-spacing: var(--_label-tracking);
  text-transform: var(--_label-case);
}
.label[data-go] .title::after { content: " →"; color: var(--_muted); font-weight: 500; }
.label .desc { display: none; margin-top: 2px; font-weight: 450; font-size: var(--_desc-size); line-height: 1.35; color: var(--_muted); }
.label[data-active] { max-width: var(--unfold-label-max-width-active, 240px); }
/* The wrapped variant, used where a one-line label doesn't fit. Words stay whole (hyphenated if needed). */
.label[data-narrow] {
  max-width: var(--unfold-label-narrow-width, 96px);
  min-width: min-content;
  overflow-wrap: normal;
  hyphens: auto;
}
.label[data-active]:not([data-compact]) .desc { display: block; }
.labels .measure { position: absolute; left: 0; top: 0; visibility: hidden; }

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.safe-probe {
  position: fixed;
  inset: 0;
  visibility: hidden;
  pointer-events: none;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
}

/* Right-to-left: "back" points the other way. */
:host(:dir(rtl)) .hub[data-icon="back"] .hub-icon { scale: -1 1; }

@media (prefers-contrast: more) {
  .root {
    --_border-width: 2px;
    --_border: currentColor;
    --_muted: var(--_fg);
    --_surface: var(--_surface-active);
    --_label-bg: var(--_surface-active);
    --_edge: color-mix(in srgb, var(--_fg) 60%, transparent);
    --_dim-opacity: 1;
    --_blur: 0px;
  }
  .label { border: 1.5px solid currentColor; }
}

@media (prefers-reduced-transparency: reduce) {
  .root { --_surface: var(--_surface-active); --_label-bg: var(--_surface-active); --_blur: 0px; --_backdrop-blur: 0px; --_dock-blur: 0px; }
}

/* Windows High Contrast and other forced palettes: states move from colour/shadow to outlines. */
@media (forced-colors: active) {
  .trigger, .hub, .node { border: 2px solid ButtonText; }
  .node[data-active], .hub[data-active] { outline: 3px solid Highlight; outline-offset: 2px; }
  .node[data-state="path"] { border-color: Highlight; }
  .node[data-state="dim"] { opacity: 1; }
  .node[data-current]::before { border-color: Highlight; }
  .node[data-branch]::after { background: ButtonText; box-shadow: none; }
  .edge { stroke: CanvasText; }
  .edge[data-lit] { stroke: Highlight; }
  .label { border: 1px solid CanvasText; }
  .backdrop { background: Canvas; opacity: .9; }
  .hold circle { stroke: Highlight; }
}

@media (prefers-reduced-motion: reduce) {
  .root { --_dur: 1ms; --_spring: linear; }
  .label { transition: opacity 120ms; }
}
`;
