import { describe, expect, it } from 'vitest';
import { INDUSTRIES } from '../demo/industries';
import {
  distToRect,
  edgePath,
  edgeShape,
  hitTest,
  layoutGraph,
  placeLabel,
  polyHitsRect,
  rectsTouch,
  type Circle,
  type Fan,
  type Level,
  type Rect,
  type Size,
  type Vec,
} from '../src/layout';
import { buildTree, type TreeNode } from '../src/tree';

const NODE_R = 26;
const GAP = 16;
const SPACING = 96;
const TRIGGER_R = 30;
const OFFSET = 24;
const PAD = 8;
/** Same clearance the element uses: room for the 1.14× hover growth and its 7px halo. */
const LABEL_PAD = NODE_R * 0.14 + 8;

/** `DEBUG_LAYOUT=1 pnpm test` prints what was dropped or crossed. */
const proc = (
  globalThis as { process?: { env: Record<string, string | undefined>; stderr: { write(s: string): void } } }
).process;
const DEBUG = proc?.env.DEBUG_LAYOUT;

const VIEWPORTS = {
  phone: { w: 390, h: 844 },
  desktop: { w: 1280, h: 800 },
};

const POSITIONS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
] as const;
type Pos = (typeof POSITIONS)[number];

/** Mirrors the dock CSS: the button sits `OFFSET` px from the edges it is anchored to. */
function hubFor(pos: Pos, vw: number, vh: number): Circle {
  const edge = OFFSET + TRIGGER_R;
  const x = pos.endsWith('left') ? edge : pos.endsWith('right') ? vw - edge : vw / 2;
  const y = pos.startsWith('top') ? edge : pos.startsWith('bottom') ? vh - edge : vh / 2;
  return { x, y, r: TRIGGER_R };
}

const boundsFor = (vw: number, vh: number): Rect => ({ x: PAD, y: PAD, w: vw - PAD * 2, h: vh - PAD * 2 });

/** Roughly what 13px/600 Inter measures, wrapping at the 160px max width. */
function oneLine(text: string): Size {
  const w = 22 + text.length * 7.4;
  return w <= 160 ? { w, h: 27 } : { w: 160, h: 27 + 16 * Math.ceil((w - 160) / 140) };
}

/** The one-line label, plus (if it's wider) the variant wrapped at 96px, words kept whole. */
function labelSize(text: string): Size | Size[] {
  const wide = oneLine(text);
  if (wide.w <= 97) return wide;
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  const w = Math.max(22 + longest * 7.4, Math.min(96, wide.w));
  const lines = Math.ceil((text.length * 7.4) / (w - 22));
  return [wide, { w, h: 27 + 16 * (lines - 1) }];
}

/** Every expansion path of a tree: [], [a], [a, a1], … */
function allPaths(tree: TreeNode): string[][] {
  const out: string[][] = [[]];
  const walk = (node: TreeNode, path: string[]) => {
    for (const c of node.children) {
      if (!c.children.length) continue;
      const p = [...path, c.id];
      out.push(p);
      walk(c, p);
    }
  };
  walk(tree, []);
  return out;
}

function levelsFor(tree: TreeNode, byId: Map<string, TreeNode>, path: string[]): Level[] {
  const levels: Level[] = [{ key: '', parentId: null, childIds: tree.children.map((c) => c.id) }];
  path.forEach((id, i) => {
    levels.push({
      key: path.slice(0, i + 1).join('/'),
      parentId: id,
      childIds: byId.get(id)!.children.map((c) => c.id),
    });
  });
  return levels;
}

interface Problems {
  overlaps: string[];
  missing: string[];
  /** Labels of the level you're looking at (always visible) that didn't fit. */
  missingFrontier: number;
  /** Open branches without reserved room (their label is placed on demand when highlighted). */
  missingOpen: number;
  missingLabels: number;
  labels: number;
  edgeCrossings: number;
}

/** Lays out every expansion path of every industry at `pos` and checks the no-overlap guarantee. */
function check(pos: Pos, vp: { w: number; h: number }, edgeStyle: 'curved' | 'step' = 'curved'): Problems {
  const hub = hubFor(pos, vp.w, vp.h);
  const bounds = boundsFor(vp.w, vp.h);
  const problems: Problems = {
    overlaps: [],
    missing: [],
    missingFrontier: 0,
    missingOpen: 0,
    missingLabels: 0,
    labels: 0,
    edgeCrossings: 0,
  };

  for (const ind of INDUSTRIES) {
    const { root, byId } = buildTree(ind.pages);
    const cache = new Map<string, Fan>();
    for (const path of allPaths(root)) {
      const placed = layoutGraph(
        {
          hub,
          bounds,
          levels: levelsFor(root, byId, path),
          nodeRadius: NODE_R,
          distance: SPACING,
          gap: GAP,
          edgeStyle,
          labelSize: (id) => labelSize(byId.get(id)!.page.label),
          // Open branches with a page show a "→" hint.
          branchLabelSize: (id) => labelSize(byId.get(id)!.page.label + (byId.get(id)!.page.href ? ' →' : '')),
          labelPad: LABEL_PAD,
        },
        cache,
      );
      const where = `${ind.id} [${path.map((id) => byId.get(id)!.page.label).join(' › ')}]`;
      const nodes = [...placed.entries()];
      const circles: [string, Circle][] = [
        ['hub', hub],
        ...nodes.map(([id, p]) => [id, { x: p.x, y: p.y, r: NODE_R }] as [string, Circle]),
      ];

      // Nodes: on screen, apart from each other and from the hub.
      for (const [id, c] of circles.slice(1)) {
        if (
          c.x - c.r < bounds.x - 0.5 ||
          c.y - c.r < bounds.y - 0.5 ||
          c.x + c.r > bounds.x + bounds.w + 0.5 ||
          c.y + c.r > bounds.y + bounds.h + 0.5
        ) {
          problems.overlaps.push(`${where}: ${byId.get(id)!.page.label} off screen`);
        }
      }
      for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
          const [a, b] = [circles[i][1], circles[j][1]];
          if (Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + GAP * 0.75 - 0.5) {
            problems.overlaps.push(`${where}: nodes ${circles[i][0]} / ${circles[j][0]} overlap`);
          }
        }
      }

      // Every label: resting pages use their reserved spot, unfolded branches their open-branch spot.
      const rects: [string, Rect][] = [];
      for (const [id, p] of nodes) {
        const open = path.includes(id);
        const rect = open ? p.pathLabel : p.label;
        if (!open) problems.labels++;
        if (!rect) {
          if (open) problems.missingOpen++;
          else problems.missingLabels++;
          if (!open && byId.get(id)!.parent?.id === (path[path.length - 1] ?? '')) problems.missingFrontier++;
          problems.missing.push(`${where}: ${byId.get(id)!.page.label}${open ? ' (open)' : ''}`);
        } else rects.push([id, rect]);
      }
      for (const [id, rect] of rects) {
        const label = byId.get(id)!.page.label;
        if (
          rect.x < bounds.x - 0.5 ||
          rect.y < bounds.y - 0.5 ||
          rect.x + rect.w > bounds.x + bounds.w + 0.5 ||
          rect.y + rect.h > bounds.y + bounds.h + 0.5
        ) {
          problems.overlaps.push(`${where}: label ${label} off screen`);
        }
        for (const [cid, c] of circles) {
          if (distToRect(c, rect) < c.r + LABEL_PAD - 0.5) {
            problems.overlaps.push(
              `${where}: label ${label} touches node ${cid === 'hub' ? 'hub' : byId.get(cid)!.page.label}`,
            );
          }
        }
        for (const [oid, other] of rects) {
          // A borrowed label (see PlacedNode.borrowed) may sit on a dimmed page's hidden label.
          const isFrontier = (x: string) => byId.get(x)!.parent?.id === (path[path.length - 1] ?? '');
          if ((placed.get(id)!.borrowed && !isFrontier(oid)) || (placed.get(oid)!.borrowed && !isFrontier(id)))
            continue;
          if (oid !== id && oid < id && rectsTouch(rect, other, 3.5)) {
            problems.overlaps.push(`${where}: labels ${label} / ${byId.get(oid)!.page.label} touch`);
          }
        }
        // Labels of the level you're looking at, and of open branches, are always visible: no edge may cross them.
        const frontier = path.includes(id) || byId.get(id)!.parent?.id === (path[path.length - 1] ?? '');
        if (frontier) {
          for (const [eid, p] of nodes) {
            // An open branch's label may sit on its own incoming path, like a breadcrumb.
            if (eid === id && path.includes(id)) continue;
            if (polyHitsRect(p.edge, rect)) {
              problems.edgeCrossings++;
              problems.overlaps.push(`${where}: edge to ${byId.get(eid)!.page.label} crosses label ${label}`);
            }
          }
        }
      }
    }
  }
  return problems;
}

describe('layoutGraph: nothing ever overlaps', () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    for (const pos of POSITIONS) {
      it(`${name} ${pos}: all nine showcase site maps, every branch unfolded`, () => {
        const p = check(pos, vp);
        if (DEBUG && (p.overlaps.length || p.missingLabels || p.missingOpen || p.edgeCrossings)) {
          proc!.stderr.write(
            `\n## ${name} ${pos}: missing ${p.missingLabels}/${p.labels} (frontier ${p.missingFrontier}), open ${p.missingOpen}, crossings ${p.edgeCrossings}\n  ${[...p.overlaps, ...p.missing].slice(0, 8).join('\n  ')}\n`,
          );
        }
        expect(p.overlaps).toEqual([]);
        // The level you're looking at gets its labels from the layout; on a crowded phone at most one is
        // left to the element, which places it on demand with tighter spacing (checked by demo/audit.ts).
        expect(p.missingFrontier).toBeLessThanOrEqual(name === 'desktop' ? 0 : 1);
        // Open branches keep reserved room for their name on desktop; a crowded phone may leave a few to be
        // placed on demand (when highlighted, with tighter spacing).
        expect(p.missingOpen).toBeLessThanOrEqual(name === 'desktop' ? 0 : 16);
        // Dimmed pages beside an open branch may give up their reserved label when a phone runs out of
        // room (it's then placed on demand, when hovered or focused). Desktop always has room.
        if (name === 'desktop') expect(p.missingLabels).toBe(0);
        else expect(p.missingLabels / p.labels).toBeLessThan(0.04);
      });
    }
  }
});

describe('Circuit layout', () => {
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    for (const pos of POSITIONS) {
      it(`${name} ${pos}: keeps nodes and visible labels clear on every showcase branch`, () => {
        const p = check(pos, vp, 'step');
        if (DEBUG)
          proc!.stderr.write(`Circuit ${name} ${pos}: missing frontier ${p.missingFrontier}, open ${p.missingOpen}\n`);
        expect(p.overlaps).toEqual([]);
        expect(p.missingFrontier).toBeLessThanOrEqual(name === 'desktop' ? 0 : 1);
      });
    }
  }
});

describe('layoutGraph', () => {
  const tree = buildTree(INDUSTRIES[0].pages);
  const base = {
    nodeRadius: NODE_R,
    distance: SPACING,
    gap: GAP,
    edgeStyle: 'curved' as const,
    labelSize: (id: string) => labelSize(tree.byId.get(id)!.page.label),
    labelPad: LABEL_PAD,
  };

  it('keeps existing fans in place when a deeper level unfolds', () => {
    const { w, h } = VIEWPORTS.phone;
    const cache = new Map<string, Fan>();
    const input = { ...base, hub: hubFor('bottom', w, h), bounds: boundsFor(w, h) };
    const menu = tree.root.children.find((c) => c.page.label === 'Menu')!;
    const before = layoutGraph({ ...input, levels: levelsFor(tree.root, tree.byId, []) }, cache);
    const after = layoutGraph({ ...input, levels: levelsFor(tree.root, tree.byId, [menu.id]) }, cache);
    for (const c of tree.root.children) {
      expect(after.get(c.id)!.x).toBeCloseTo(before.get(c.id)!.x);
      expect(after.get(c.id)!.y).toBeCloseTo(before.get(c.id)!.y);
    }
  });

  it('rings all the way around a centred button', () => {
    const { w, h } = VIEWPORTS.desktop;
    const hub = hubFor('center', w, h);
    const placed = layoutGraph({ ...base, hub, bounds: boundsFor(w, h), levels: levelsFor(tree.root, tree.byId, []) });
    const ys = [...placed.values()].map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(hub.y);
    expect(Math.max(...ys)).toBeGreaterThan(hub.y);
  });

  it('lays out without reserving labels when there are none', () => {
    const { w, h } = VIEWPORTS.phone;
    const placed = layoutGraph({
      ...base,
      labelSize: undefined,
      hub: hubFor('bottom', w, h),
      bounds: boundsFor(w, h),
      levels: levelsFor(tree.root, tree.byId, []),
    });
    expect([...placed.values()].every((p) => p.label === null)).toBe(true);
  });

  it('is fast enough to run on every unfold', () => {
    const { w, h } = VIEWPORTS.phone;
    const t = performance.now();
    for (const ind of INDUSTRIES) {
      const { root, byId } = buildTree(ind.pages);
      for (const path of allPaths(root)) {
        layoutGraph({
          ...base,
          labelSize: (id) => labelSize(byId.get(id)!.page.label),
          hub: hubFor('bottom-left', w, h),
          bounds: boundsFor(w, h),
          levels: levelsFor(root, byId, path),
        });
      }
    }
    const perLayout =
      (performance.now() - t) / INDUSTRIES.reduce((n, i) => n + allPaths(buildTree(i.pages).root).length, 0);
    expect(perLayout).toBeLessThan(40);
  });
});

describe('placeLabel', () => {
  const bounds = { x: 0, y: 0, w: 400, h: 400 };

  it('prefers the given direction', () => {
    const node = { x: 200, y: 200, r: 26 };
    const rect = placeLabel(node, { w: 80, h: 26 }, 0, { bounds, circles: [node], taken: [], edges: [], pad: 8 })!;
    expect(rect.x).toBeGreaterThanOrEqual(200 + 26 + 8 - 0.5);
    expect(rect.y + rect.h / 2).toBeCloseTo(200, 0);
  });

  it('goes around obstacles and edges', () => {
    const node = { x: 200, y: 200, r: 26 };
    const blocker = { x: 290, y: 200, r: 26 };
    const edge = [
      { x: 200, y: 200 },
      { x: 200, y: 0 },
    ];
    const rect = placeLabel(node, { w: 80, h: 26 }, 0, {
      bounds,
      circles: [node, blocker],
      taken: [],
      edges: [edge],
      pad: 8,
    })!;
    expect(distToRect(blocker, rect)).toBeGreaterThanOrEqual(34);
    expect(polyHitsRect(edge, rect)).toBe(false);
  });

  it('gives up rather than overlapping', () => {
    const node = { x: 50, y: 50, r: 20 };
    expect(
      placeLabel(node, { w: 90, h: 90 }, 0, {
        bounds: { x: 0, y: 0, w: 100, h: 100 },
        circles: [node],
        taken: [],
        edges: [],
        pad: 6,
      }),
    ).toBeNull();
  });
});

describe('edges and hit testing', () => {
  it('trims edges to both circles', () => {
    expect(edgePath({ x: 0, y: 0, r: 30 }, { x: 100, y: 0, r: 26 }, 'straight', null)).toBe('M30.0 0.0L74.0 0.0');
  });

  it('curves deeper edges along the incoming direction', () => {
    expect(edgePath({ x: 0, y: 0, r: 26 }, { x: 100, y: 0, r: 26 }, 'curved', -Math.PI / 2)).toMatch(/Q/);
  });

  it('draws step edges with separate radial ports and two rounded turns', () => {
    const a = { x: 0, y: 0, r: 26 };
    const b = { x: 120, y: 90, r: 26 };
    const { d, points } = edgeShape(a, b, 'step', null);
    expect(d.match(/Q/g)).toHaveLength(2);
    expect(Math.hypot(points[0].x - a.x, points[0].y - a.y)).toBeCloseTo(a.r);
    const end = points[points.length - 1];
    expect(Math.hypot(end.x - b.x, end.y - b.y)).toBeCloseTo(b.r);
    expect(points.every((p) => p.x >= 0 && p.x <= 120 && p.y >= 0 && p.y <= 90)).toBe(true);
  });

  it('keeps step edges straight when the nodes are aligned', () => {
    expect(edgePath({ x: 0, y: 0, r: 30 }, { x: 100, y: 0, r: 26 }, 'step', null)).toBe('M30.0 0.0L74.0 0.0');
  });

  it('does not stack Circuit sibling traces across the showcase trees, positions and screen sizes', () => {
    // Collinear overlap is the original bug: independent edges become one ambiguous, brighter stem.
    const overlap = (a: Vec[], b: Vec[]) => {
      for (let i = 1; i < a.length; i++) {
        const p = a[i - 1],
          q = a[i];
        const dx = q.x - p.x,
          dy = q.y - p.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.1) continue;
        for (let j = 1; j < b.length; j++) {
          const s = b[j - 1],
            t = b[j];
          const cross = (v: Vec) => Math.abs(dx * (v.y - p.y) - dy * (v.x - p.x)) / len;
          if (cross(s) > 0.01 || cross(t) > 0.01) continue;
          const project = (v: Vec) => ((v.x - p.x) * dx + (v.y - p.y) * dy) / len;
          const u = project(s),
            v = project(t);
          if (Math.min(len, Math.max(u, v)) - Math.max(0, Math.min(u, v)) > 1) return true;
        }
      }
      return false;
    };
    const problems: string[] = [];
    for (const vp of Object.values(VIEWPORTS)) {
      for (const pos of POSITIONS) {
        for (const ind of INDUSTRIES) {
          const { root, byId } = buildTree(ind.pages);
          const cache = new Map<string, Fan>();
          for (const path of allPaths(root)) {
            const levels = levelsFor(root, byId, path);
            const placed = layoutGraph(
              {
                hub: hubFor(pos, vp.w, vp.h),
                bounds: boundsFor(vp.w, vp.h),
                levels,
                nodeRadius: NODE_R,
                distance: 104,
                gap: GAP,
                edgeStyle: 'step',
                labelSize: (id) => labelSize(byId.get(id)!.page.label),
                labelPad: LABEL_PAD,
              },
              cache,
            );
            for (const level of levels) {
              for (let i = 0; i < level.childIds.length; i++) {
                for (let j = i + 1; j < level.childIds.length; j++) {
                  if (overlap(placed.get(level.childIds[i])!.edge, placed.get(level.childIds[j])!.edge)) {
                    problems.push(`${ind.id} ${vp.w} ${pos}: ${level.childIds[i]} / ${level.childIds[j]}`);
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('picks the nearest node within reach', () => {
    const nodes = [
      { x: 0, y: 0, r: 26 },
      { x: 60, y: 0, r: 26 },
    ];
    expect(hitTest({ x: 35, y: 0 }, nodes, 10)).toBe(1);
    expect(hitTest({ x: 0, y: 40 }, nodes, 10)).toBe(-1);
    expect(hitTest({ x: 0, y: 34 }, nodes, 10)).toBe(0);
  });
});
