# unfold-nav

One button for your whole site map. Press and hold it, and your pages unfold around it as a small graph.
Drag along the graph and release on a page to go there. Or tap the button and tap your way through. The
same component works with a mouse, a finger or a keyboard, on desktop and on phones.

- **Zero dependencies.** It's a standard Web Component, so it works in plain HTML, React, Vue, Svelte, Astro and so on. About 24 KB gzipped (ESM).
- **Any position:** the four corners, the middle of each edge, the centre of the screen, or `inline` inside your own header. The graph prefers the available space toward the centre of the screen.
- **Space-aware layout.** The layout reserves room for nodes and labels, separates Circuit connectors, and searches for more space as branches unfold. Dense menus still need testing; see [Layout limits](#layout-limits).
- **Fed with an object.** Give it a nested list of pages with `label`, `href`, `icon` and `children`.
- **Customisable:** options, `--unfold-*` CSS variables, `::part()` selectors, a slot for the button icon, per-page colours, and a hook to plug in any icon library.
- **Accessibility features:** a modal dialog with a standard tree of pages for screen readers, full keyboard support, focus management, high-contrast and forced-colors support, text that follows the reader's font size, and reduced motion. See [Accessibility](#accessibility).

Version 0.1.0 is an initial release for compact site maps. The API may change before 1.0.

## Quick start

Install it in your project:

```bash
npm install unfold-nav
```

```js
import 'unfold-nav';
```

Or load the built module directly in HTML:

```html
<script type="module" src="/path/to/unfold-nav.js"></script>

<unfold-nav position="bottom-right"></unfold-nav>

<script type="module">
  document.querySelector('unfold-nav').pages = [
    { label: 'Home', href: '/', icon: '🏠' },
    {
      label: 'Products',
      href: '/products',
      icon: '/icons/box.svg',
      description: 'Everything we make',
      children: [
        { label: 'Software', href: '/products/software', icon: '💻' },
        { label: 'Hardware', href: '/products/hardware', icon: '🔧' },
      ],
    },
    { label: 'About', icon: 'ℹ️', children: [{ label: 'Team', href: '/about/team' }] },
  ];
</script>
```

Without any JavaScript of your own, put the pages in the element as JSON:

```html
<unfold-nav position="bottom">
  <script type="application/json">
    [
      { "label": "Home", "href": "/" },
      { "label": "Blog", "href": "/blog" }
    ]
  </script>
</unfold-nav>
```

Or create it from code:

```js
import { createUnfoldNav } from 'unfold-nav';

const nav = createUnfoldNav({
  pages: [
    { label: 'Home', href: '/', icon: '🏠' },
    { label: 'Docs', href: '/docs', icon: '📖' },
  ],
  position: 'bottom',
});

nav.remove(); // cleanup when your page or component unmounts
```

## How people use it

|                                     |                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Press and hold → drag → release** | Holding the button fills a ring around it, then the graph opens. Pause on a page that has subpages and they unfold further out. Release on a page to go there, or on empty space to cancel. Moving straight away skips the wait, so a quick flick works too.     |
| **Hold and let go**                 | The graph stays open for tapping.                                                                                                                                                                                                                                |
| **Tap**                             | Opens the graph for tapping. Tap a group to unfold it; tap it again to open its own page (if it has one; its label shows a "→"). The centre button goes back a level, and tapping outside closes. Labels count as part of their page, so you can tap a name too. |
| **Keyboard**                        | See below.                                                                                                                                                                                                                                                       |

Ctrl- or Cmd-clicking a page opens it in a new tab.

### Keyboard

Enter, Space, ↑ or ↓ on the button opens the graph and moves focus to the current page's section, or to the first page.

| Key           | Tree keys (default, `arrow-keys="tree"`)                | Spatial keys (`arrow-keys="spatial"`) |
| ------------- | ------------------------------------------------------- | ------------------------------------- |
| ↓ / ↑         | Next / previous page in reading order                   | Nearest page below / above            |
| →             | Open the group, or move into it                         | Nearest page to the right             |
| ←             | Close the group, or move to its parent                  | Nearest page to the left              |
| Home / End    | First / last page                                       | First / last sibling                  |
| Enter / Space | Go to the page (a group without a page opens or closes) | Like tapping                          |
| Backspace     | Close the group you're in and focus it                  | (same)                                |
| Escape        | Close and return focus to the button                    | (same)                                |
| Tab           | Move between the pages and the centre button            | (same)                                |
| Letters       | Jump to the next page starting with them                | Among siblings                        |

In right-to-left documents ← and → swap.

## Pages

```ts
interface NavPage {
  label: string;
  href?: string; // pages without href are groups (or actions — see `unfold-select`)
  target?: string; // '_blank' opens a new tab
  icon?: IconSource; // see below
  description?: string; // shown under the label while highlighted
  color?: string; // per-page accent
  disabled?: boolean;
  children?: NavPage[];
  id?: string; // generated when omitted
  data?: unknown; // anything; handed back in events
}
```

`pages` can be an array (the top level), or a single root page whose `children` are the top level. The
root page's `icon` then becomes the button icon.

### Icons

An `icon` can be:

- inline SVG markup: `'<svg viewBox="0 0 24 24">…</svg>'` (inserted as-is, so only use markup you trust)
- an image URL: `'/icons/home.svg'`, `'https://…'`, `'data:image/…'`
- an emoji or short text: `'🏠'`, `'A'`
- a DOM node (cloned for each use), or a function that returns any of the above
- a **name** that your `iconResolver` turns into one of the above, which makes it easy to use any icon library:

```js
import { createElement, icons } from 'lucide'; // any library works
nav.iconResolver = (name) => (icons[name] ? createElement(icons[name]) : null);
nav.pages = [{ label: 'Home', href: '/', icon: 'House' }];
```

Pages without an icon show their first letter.

## Options

Set options as properties (`nav.spacing = 110`) or with `nav.configure({...})`. Serializable options also have the attributes listed below (`spacing="110"`); callbacks and translated strings use properties.

Invalid property/configuration updates throw `TypeError` or `RangeError` and preserve the previous configuration. Invalid attributes log a warning and are ignored. Dimensions must be finite and positive; delays, gap and offsets can be zero. Set a property to `undefined`, or remove its attribute, to restore the default. Call `configure` after editing a pages array; nested objects are not observed.

| Property       | Attribute                      | Default          |                                                                                                                                                                                                            |
| -------------- | ------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`        | `pages` (JSON)                 | `[]`             | The site map                                                                                                                                                                                               |
| `position`     | `position`                     | `'bottom-right'` | `top-left` `top` `top-right` `left` `center` `right` `bottom-left` `bottom` `bottom-right` `inline`                                                                                                        |
| `dock`         | `dock`                         | `'float'`        | `float`: the button floats over the page. `bar`: it sits in a strip along its edge, combine it with page padding to keep content clear. See [Keeping content clear](#keeping-content-clear-of-the-button). |
| `offset`       | `offset` (`"24"` or `"24 32"`) | `24`             | Distance from the screen edges in px (`number` or `{ x, y }`). Safe-area insets are added.                                                                                                                 |
| `holdDelay`    | `hold-delay`                   | `220`            | ms to hold before drag mode starts                                                                                                                                                                         |
| `expandDelay`  | `expand-delay`                 | `140`            | ms to pause on a group before it unfolds while dragging                                                                                                                                                    |
| `openOnTap`    | `open-on-tap`                  | `true`           | Whether a short tap opens the graph                                                                                                                                                                        |
| `nodeSize`     | `node-size`                    | `52`             | Page node diameter (px)                                                                                                                                                                                    |
| `triggerSize`  | `trigger-size`                 | `60`             | Button diameter (px)                                                                                                                                                                                       |
| `spacing`      | `spacing`                      | `96`             | Preferred distance between a node and its children (px)                                                                                                                                                    |
| `gap`          | `gap`                          | `16`             | Minimum space between neighbouring nodes (px)                                                                                                                                                              |
| `labels`       | `labels`                       | `'auto'`         | `auto` (the current level + the highlighted page), `always`, `hover`, `none`                                                                                                                               |
| `edges`        | `edges`                        | `'curved'`       | `curved`, `straight`, `step` (circuit-style, separate ports and two rounded turns), `none`                                                                                                                 |
| `backdrop`     | `backdrop`                     | `true`           | Dim and blur the page behind the graph                                                                                                                                                                     |
| `haptics`      | `haptics`                      | `true`           | Short vibrations on open and highlight (where supported)                                                                                                                                                   |
| `theme`        | `theme`                        | `'auto'`         | `auto`, `light`, `dark`                                                                                                                                                                                    |
| `current`      | `current`                      | location         | URL of the current page; `null` for none. The matching page and the trail to it are marked.                                                                                                                |
| `label`        | `label`                        | `'Navigation'`   | Accessible name of the button and the dialog                                                                                                                                                               |
| `arrowKeys`    | `arrow-keys`                   | `'tree'`         | `tree` (standard tree keys) or `spatial` (arrows follow the layout). See [Keyboard](#keyboard).                                                                                                            |
| `strings`      | —                              | English          | Built-in text, for other languages: `{ pages, close, backToTop, back }` (`back` contains `{label}`)                                                                                                        |
| `triggerIcon`  | `trigger-icon`                 | graph glyph      | Button icon (any `IconSource`). Or slot one in: `<svg slot="icon">…</svg>`                                                                                                                                 |
| `iconResolver` | —                              | —                | `(name, page) => IconSource`                                                                                                                                                                               |
| `navigate`     | —                              | —                | `(page, detail) => void`, called instead of `location.assign` (for client-side routers)                                                                                                                    |

Methods: `open({ focus })`, `close({ focusTrigger })`, `toggle()`, `configure(options)`, and the `isOpen` property.

## Keeping content clear of the button

A fixed button always floats over something. The component tells the page how much room it takes, and can
draw its own strip:

- It publishes `--unfold-inset-top`, `--unfold-inset-right`, `--unfold-inset-bottom` or `--unfold-inset-left`
  on `<html>` (safe areas included), for the edge it's docked to. Multiple instances use the largest inset on each edge, and removing the last instance restores the previous value. Pad your content with it:

  ```css
  body {
    padding-bottom: var(--unfold-inset-bottom, 0px);
  }
  ```

- With `dock="bar"`, the button sits in a strip along that edge (full width for top and bottom, full
  height for the sides). Use the published inset for content padding; the strip alone does not change your page layout. Style it with
  `--unfold-dock-bg`, `--unfold-dock-border`, `--unfold-dock-blur`, or `::part(dock-bar)`.

For top positions, a sticky header that leaves the button's corner free works just as well. A centred
button floats by design, so give it a gutter in your layout.

## Accessibility

- **A real dialog.** When opened by tapping, clicking or keyboard, the graph is a modal `<dialog>`: the
  rest of the page becomes inert, screen readers stay inside, and closing returns focus to the button.
  Escape closes it. Browser close requests step out of an open group first.
- **A real tree.** Pages are `treeitem`s with level, position in set, `aria-expanded` and `aria-current="page"`,
  in reading order, with a roving tab stop. Descriptions are exposed with `aria-description`.
- **Keyboard:** the standard tree keys by default (see [Keyboard](#keyboard)). Focus moves through a roving tab stop: when a branch closes under it, focus moves to its parent.
- **Gestures have alternatives.** The press-and-drag gesture is a shortcut. Everything also works with
  single taps or clicks, and with the keyboard. Keep `open-on-tap` on (the default) so dragging is optional.
  Letting go anywhere off the graph cancels, and nothing activates on press.
- **Readable labels.** Label text follows the reader's font-size setting (`max(13px, .8125rem)`) and wraps
  instead of truncating. The highlighted page's label stays while the pointer moves onto it, and can be
  clicked.
- **Targets:** the default page diameter is 52px and the button is 60px. Check target spacing and contrast after changing the theme or sizes.
- **Preferences:** `prefers-reduced-motion` turns off movement; `prefers-contrast: more` adds solid
  borders and opaque surfaces; `prefers-reduced-transparency` removes blur; Windows High Contrast and
  other forced palettes get outline-based states. Right-to-left documents mirror the keys and the back icon.
- **Your language:** every built-in phrase can be replaced with `strings`.

These are implementation features, not a WCAG certification. Check the final menu with keyboard navigation, zoom, screen readers and your real content. Keep a visible “Menu” label or another clear cue if visitors may not recognise the graph icon.

## Events

All events bubble and cross shadow DOM boundaries.

| Event              | `detail`                    |                                                                                                                     |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `unfold-select`    | `{ page, trail, via }`      | Cancelable. Call `preventDefault()` to handle navigation yourself. `via` is `'release'`, `'click'` or `'keyboard'`. |
| `unfold-open`      | `{ mode: 'drag' \| 'tap' }` |                                                                                                                     |
| `unfold-close`     | —                           |                                                                                                                     |
| `unfold-highlight` | `{ page \| null }`          | The page under the pointer or keyboard focus                                                                        |

Client-side routing uses the `navigate` callback. It receives the selected page and trail; modifier clicks and explicit link targets use browser navigation instead. Alternatively, cancel `unfold-select` to handle every selection yourself.

```js
nav.navigate = (page) => {
  if (page.href) router.push(page.href); // your router
};
```

Default browser navigation supports relative links, HTTP(S), `mailto:`, `tel:` and `sms:`. Other protocols are ignored with a warning. Use a custom router or canceled selection event for application-specific URLs. Page labels are rendered as text; SVG/HTML icons and icon resolvers accept **trusted markup only**, so never feed them unsanitized user input.

### React and server-rendered apps

Importing the package on the server is safe. Create elements in the browser after mounting; the factory throws a clear error if called without a DOM. This React example also works with TypeScript and avoids a custom JSX tag declaration:

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { createUnfoldNav, type NavPage } from 'unfold-nav';

export function Navigation({ pages }: { pages: NavPage[] }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const nav = createUnfoldNav({ pages, position: 'bottom-right' }, host.current);
    return () => nav.remove();
  }, [pages]);
  return <span ref={host} />;
}
```

Vue, Svelte, Astro and plain HTML can use `<unfold-nav>` directly; pass arrays, icons and callbacks as DOM properties. Import the package in your browser entry point. `define()` is idempotent and registration happens on import; `define('my-navigation')` registers a custom tag alias.

Pages without `href` work as actions:

```js
nav.addEventListener('unfold-select', (e) => {
  if (e.detail.page.id === 'theme') toggleTheme();
});
```

## Styling

Set any of these on the element or an ancestor:

```css
unfold-nav {
  --unfold-accent: #e8590c; /* highlights, current page, active path */
  --unfold-fg: #1b1b1f;
  --unfold-surface: rgb(255 255 255 / 0.8); /* button and node background */
  --unfold-surface-active: #fff;
  --unfold-border: rgb(255 255 255 / 0.7);
  --unfold-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.3);
  --unfold-blur: 18px; /* frosted glass on controls */
  --unfold-edge: rgb(0 0 0 / 0.2);
  --unfold-edge-width: 1.5px;
  --unfold-label-bg: rgb(255 255 255 / 0.9);
  --unfold-label-fg: #1b1b1f;
  --unfold-label-max-width: 180px;
  --unfold-backdrop: rgb(244 244 248 / 0.4);
  --unfold-backdrop-blur: 6px;
  --unfold-icon-size: 22px;
  --unfold-font: inherit;
  --unfold-duration: 340ms;
  --unfold-easing: cubic-bezier(0.22, 1.2, 0.36, 1);
  --unfold-z-index: 2147483000;

  /* shape */
  --unfold-node-radius: 50%; /* 0 for squares, 14px for rounded squares */
  --unfold-trigger-radius: 50%;
  --unfold-border-width: 1px;
  --unfold-active-scale: 1.14; /* highlighted node */
  --unfold-dim-opacity: 0.55; /* pages beside the open branch */
  --unfold-dim-scale: 0.86;

  /* labels */
  --unfold-label-radius: 9px;
  --unfold-label-font: inherit;
  --unfold-label-size: 13px;
  --unfold-label-weight: 600;
  --unfold-label-tracking: normal;
  --unfold-label-case: none; /* uppercase, … */
}
```

Anything else can be styled with `::part()`: `trigger`, `trigger-icon`, `dock`, `overlay`, `backdrop`, `edges`, `edge`, `node`, `icon`, `label`, `hub`.

`::part()` can't match attributes, so **states are exposed as part names too**:

| Part                           | When                                                |
| ------------------------------ | --------------------------------------------------- |
| `node-active`                  | under the pointer / keyboard focus                  |
| `node-current`                 | the page you're on (`node-trail` for its ancestors) |
| `node-path`                    | an open branch                                      |
| `node-frontier` / `node-dim`   | the level you're looking at / the pages beside it   |
| `node-branch`, `node-disabled` | has children / disabled                             |
| `edge-lit`, `edge-dim`         | edge on the open path / beside it                   |
| `label-active`, `label-path`   | label of the highlighted node / of an open branch   |
| `hub-back`                     | the centre button is acting as "back"               |

```css
unfold-nav::part(node-active) {
  background: var(--unfold-accent);
  color: #fff;
}
unfold-nav::part(edge-lit) {
  filter: drop-shadow(0 0 4px var(--unfold-accent));
}
unfold-nav::part(label) {
  font-style: italic;
  box-shadow: none;
}
```

Use the `--unfold-active-scale` / `--unfold-dim-*` variables rather than setting `scale` or `opacity` on parts.
Those two properties drive the unfold animation.

## Showcase: 9 industries × 9 designs

[Try the live demo](https://unfold-nav.romagnolo.eu).

`pnpm dev` opens a showcase with a desktop and a phone frame side by side, running the same mock website. Pick:

- **an industry:** restaurant, fashion, SaaS, healthcare, real estate, developer docs, creative agency, banking, travel. Each is a fictional brand with its own site map, typography and artwork.
- **a design:** Glass, Solid, Paper, Mono, Neon, Luxe, Soft, Circuit, Brutal.
- **a position:** any of the nine, or inside the site's header.

Every design is built only from the public styling API above (see `demo/designs.ts`), and the showcase
prints the exact HTML and CSS for whatever you've picked. The state lives in the URL hash, so
`/#docs/circuit/left` is a shareable link. `site.html?industry=…&design=…&position=…` opens one mock site
on its own, which is handy on a real phone.

```bash
pnpm build:showcase      # static site in showcase-dist/ (relative paths, host it anywhere)
pnpm preview:showcase    # serve that build locally
```

For container hosting and the Romagnolo deployment workflow, see [Showcase deployment](deploy/README.md).

## How the layout works

All the geometry lives in `src/layout.ts` as pure functions.

- **Top level:** pages fan out from the button towards the middle of the screen. A button in the centre gets a full ring.
- **Unfolding a page:** its children fan out _beyond_ it, continuing the direction you were already moving in. Each fan searches for the closest direction and smallest distance that keep every node on screen and clear of nodes already shown. If it gets cornered, it may turn any way it needs to.
- **Stability:** fans are cached by their path, so pages you've already seen never move while you drag deeper.
- **Labels reserve room first.** A fan is only accepted when every new page _and_ its label fit clear of all
  pages, labels and lines already on screen. Deeper levels keep clear of those labels too. An unfolding
  branch keeps a spot for its own name: next to it if there's room, otherwise on its own highlighted
  path, like a breadcrumb.
- **When space runs out.** If nothing fits, the search grows the distance, turns the fan, then
  allows lines to pass under the labels of pages that are dimmed at that moment. As a last resort a
  page may give up its visible label; its accessible name remains available. Extreme density can relax placement constraints.
- **Labels never slide** between spots (they'd cross each other on the way); they reappear instead.

Regression tests cover the nine showcase site maps in all nine fixed positions, on phone and desktop viewports, through every branch. They check node, label and edge clearance for those fixtures and prevent Circuit connectors from sharing long segments.

### Layout limits

Use compact hierarchies, roughly 5–8 siblings per level and a few levels deep. Very large trees, long labels, large nodes or small viewports can exhaust the available space. The layout may hide labels or relax clearance in its last fallback; it cannot guarantee collision-free placement for arbitrary input. Test your real pages, fonts, zoom levels and viewports, and keep critical destinations visible elsewhere on the page.

## Development

Use Node.js 22.12+ or 24 (recommended), and pnpm 12.8.1. The library has no runtime dependencies.

```bash
pnpm install --frozen-lockfile
pnpm dev          # showcase at http://localhost:5173 (add --host to try it on your phone)
pnpm check        # formatting, types, regression tests, build and fresh-package verification
pnpm build        # dist/unfold-nav.js (ESM), dist/unfold-nav.umd.cjs, type definitions
```

Browser target: modern evergreen browsers with Custom Elements, Shadow DOM, `<dialog>` and modern CSS (`color-mix`, individual transforms). Chrome has been checked interactively; test Safari, Firefox and assistive technology in your target environments before rollout. The Popover API puts drag navigation in the top layer; browsers without it use a non-modal dialog. IE and legacy browsers are not supported.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and reproducible bug reports. GitHub Actions runs the checks and showcase build on Node 22 and 24, and smoke-tests the static showcase container.

A note on SEO: the graph only exists while it is open, so keep a plain list of links somewhere (a footer or a sitemap) for crawlers and no-JS visitors.

## Publishing

```bash
pnpm check
npm pack --dry-run    # builds the library and lists exactly what will ship
npm login
npm publish --access public
```

Before publishing, confirm ownership of the `unfold-nav` name on npm, review the version and changelog, and use your npm account's required authentication. `prepublishOnly` runs the full check; `prepack` rebuilds both module formats and their TypeScript declarations. `test:package` installs a fresh tarball and checks ESM, CommonJS, server-side imports, and strict TypeScript in both Bundler and NodeNext modes.

The package includes only `dist/`, this README, the changelog, the MIT license and package metadata. The showcase and developer tooling remain in this repository. GitHub CI validates changes; npm publishing is a separate maintainer action.
