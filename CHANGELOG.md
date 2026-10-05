# Changelog

## 1.0.0

The existing navigation, public options, events and styling API become the stable 1.x API.

- Reuse graph geometry and SVG paths during hover and keyboard focus changes; coalesce resize work and read animation timing once per batch.
- Refresh current-page markers immediately, honor document base URLs, and remeasure labels after resizing, font loading and reopening.
- Cancel interrupted animation timers and label animations; keep collapsing children out of keyboard and screen-reader navigation.
- Handle rapid clicks, repeated typeahead letters, held activation keys, input composition and event listeners that close or remove the menu while it opens.
- Keep user page IDs separate from internal hub and label bookkeeping, including IDs with separator characters.
- Fall back safely from failing icon callbacks, refresh visible icons when the resolver changes, and copy validated offset objects.
- Keep inline menus aligned when an ancestor scrolls and let page controls receive pointer input during the closing animation.
- Add regression coverage for these behaviors while retaining the exhaustive showcase and Circuit layout checks.

## 0.1.1

- Link the npm homepage and README to the [live showcase](https://unfold-nav.romagnolo.eu).
- Document container deployment and check the static showcase container in CI.
- Allow the exhaustive Circuit regression sweep to finish on slower CI runners.

## 0.1.0

Initial release of the dependency-free `<unfold-nav>` Web Component.

- Press-and-hold, drag, tap and keyboard navigation through nested pages.
- Nine fixed positions and an inline trigger, with CSS variables, parts and custom icons.
- Curved, straight and Circuit connectors; Circuit paths use separate ports and rounded turns.
- Dialog and tree semantics, focus management, reduced motion, translated strings and router hooks.
- Validated configuration, cycle detection, safe default URL navigation and complete disconnect cleanup.
- ESM and CommonJS builds with matching TypeScript declarations, safe server-side imports and MIT licensing.
- Public showcase, layout and interaction regression tests, fresh-package verification and CI.

This is a pre-1.0 release. Test real menu content and target browsers; extreme density can exceed the layout's space.
