/**
 * Pure geometry: where nodes go, where their labels go, and how edges are drawn.
 * Coordinates are viewport pixels (y grows downwards, angles are clockwise from +x).
 *
 * The guarantee this file is built around: nothing overlaps. Every node reserves room for its label at
 * the moment its fan is placed, a fan is only accepted when all of its nodes *and* labels fit clear of
 * everything already on screen (nodes, labels, edges, the viewport edge), and later fans have to keep
 * clear of what's reserved. When that's impossible (a tiny screen, a huge menu) labels that don't fit
 * are left out rather than drawn on top of something.
 */

export interface Vec {
  x: number;
  y: number;
}
export interface Circle extends Vec {
  r: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Size {
  w: number;
  h: number;
}
/** A label's possible sizes, preferred first (e.g. one line, then wrapped onto two). */
export type Sizes = Size | Size[];
const variants = (s: Sizes): Size[] => (Array.isArray(s) ? s : [s]);
export type EdgeKind = 'curved' | 'straight' | 'step' | 'none';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
/** Minimum space between two labels. */
const LABEL_SPACING = 4;

/* ------------------------------------------------------------- primitives */

export function distToRect(p: Vec, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

export function rectsTouch(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}

export const rectContains = (r: Rect, p: Vec) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const inside = (outer: Rect, r: Rect) =>
  r.x >= outer.x - 0.5 &&
  r.y >= outer.y - 0.5 &&
  r.x + r.w <= outer.x + outer.w + 0.5 &&
  r.y + r.h <= outer.y + outer.h + 0.5;

const grow = (r: Rect, d: number): Rect => ({ x: r.x - d, y: r.y - d, w: r.w + d * 2, h: r.h + d * 2 });

function segDist(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distance from a point to a polyline. */
export function polyDist(p: Vec, poly: Vec[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length - 1; i++) d = Math.min(d, segDist(p, poly[i], poly[i + 1]));
  return d;
}

/** Liang–Barsky: does segment a→b pass through rect r? */
function segHitsRect(a: Vec, b: Vec, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - r.x, r.x + r.w - a.x, a.y - r.y, r.y + r.h - a.y];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

export function polyHitsRect(poly: Vec[], r: Rect): boolean {
  for (let i = 0; i < poly.length - 1; i++) if (segHitsRect(poly[i], poly[i + 1], r)) return true;
  return false;
}

function towards(from: Vec, to: Vec, dist: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / l) * dist, y: from.y + (dy / l) * dist };
}

/* ------------------------------------------------------------------ edges */

export interface EdgeShape {
  /** SVG path data. */
  d: string;
  /** The same edge as a polyline, for overlap checks. */
  points: Vec[];
}

const fmt = (n: number) => n.toFixed(1);

/**
 * The edge from `a` to `b`, trimmed to both circles.
 * - `curved` edges leave the parent along the direction it was itself reached from, so deeper branches
 *   read like a growing tree.
 * - `step` edges use separate radial ports and two rounded turns, like traces on a circuit board.
 *   Siblings never share the long axis-aligned stem that a single elbow would create.
 */
export function edgeShape(a: Circle, b: Circle, style: EdgeKind, parentAngle: number | null): EdgeShape {
  const straight = (): EdgeShape => {
    const s = towards(a, b, a.r);
    const e = towards(b, a, b.r);
    return { d: `M${fmt(s.x)} ${fmt(s.y)}L${fmt(e.x)} ${fmt(e.y)}`, points: [s, e] };
  };

  if (style === 'step') {
    const s = towards(a, b, a.r);
    const e = towards(b, a, b.r);
    if (Math.min(Math.abs(e.x - s.x), Math.abs(e.y - s.y)) < 1 || Math.hypot(b.x - a.x, b.y - a.y) <= a.r + b.r) {
      return straight();
    }
    // The ports follow the direction to each child. This offsets sibling departures while keeping
    // every trace inside its endpoints' bounding box, including near viewport corners.
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const lane = horizontal ? (s.x + e.x) / 2 : (s.y + e.y) / 2;
    const corners = horizontal
      ? [
          { x: lane, y: s.y },
          { x: lane, y: e.y },
        ]
      : [
          { x: s.x, y: lane },
          { x: e.x, y: lane },
        ];
    const route = [s, ...corners, e];
    const points = [s];
    let d = `M${fmt(s.x)} ${fmt(s.y)}`;
    corners.forEach((corner, i) => {
      const before = route[i];
      const after = route[i + 2];
      const round = Math.min(
        10,
        Math.hypot(corner.x - before.x, corner.y - before.y) / 2,
        Math.hypot(after.x - corner.x, after.y - corner.y) / 2,
      );
      const enter = towards(corner, before, round);
      const leave = towards(corner, after, round);
      d += `L${fmt(enter.x)} ${fmt(enter.y)}Q${fmt(corner.x)} ${fmt(corner.y)} ${fmt(leave.x)} ${fmt(leave.y)}`;
      points.push(enter);
      // Collision checks follow the rounded corners as well as the straight portions.
      for (let j = 1; j <= 4; j++) {
        const t = j / 4;
        const u = 1 - t;
        points.push({
          x: u * u * enter.x + 2 * u * t * corner.x + t * t * leave.x,
          y: u * u * enter.y + 2 * u * t * corner.y + t * t * leave.y,
        });
      }
    });
    points.push(e);
    return { d: `${d}L${fmt(e.x)} ${fmt(e.y)}`, points };
  }

  if (style !== 'curved' || parentAngle == null) return straight();
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const c = { x: a.x + Math.cos(parentAngle) * len * 0.5, y: a.y + Math.sin(parentAngle) * len * 0.5 };
  const s = towards(a, c, a.r);
  const e = towards(b, c, b.r);
  const points: Vec[] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const u = 1 - t;
    points.push({ x: u * u * s.x + 2 * u * t * c.x + t * t * e.x, y: u * u * s.y + 2 * u * t * c.y + t * t * e.y });
  }
  return { d: `M${fmt(s.x)} ${fmt(s.y)}Q${fmt(c.x)} ${fmt(c.y)} ${fmt(e.x)} ${fmt(e.y)}`, points };
}

/** SVG path data for an edge (see `edgeShape`). */
export const edgePath = (a: Circle, b: Circle, style: EdgeKind, parentAngle: number | null) =>
  edgeShape(a, b, style, parentAngle).d;

/* ----------------------------------------------------------------- labels */

export interface LabelContext {
  bounds: Rect;
  /** Every node and the hub. */
  circles: Circle[];
  /** Labels already on screen or reserved. */
  taken: Rect[];
  /** Edge polylines a label must not cross (empty to allow crossing). */
  edges: Vec[][];
  /** Clearance between any node's rim and any label: room for hover growth, rings and halos. */
  pad: number;
  /**
   * Clearance from the label's own node, if different. Lets the highlighted label sit closer to the
   * other nodes: only the highlighted node grows, so the others need less room.
   */
  ownPad?: number;
  /** Extra distances from the node to try, nearest first (default `LABEL_RINGS`). */
  rings?: number[];
}

/** Preferred direction first, then alternating outwards in 22.5° steps. */
const LABEL_ANGLES = [0, ...Array.from({ length: 7 }, (_, i) => [(i + 1) * 22.5, -(i + 1) * 22.5]).flat(), 180].map(
  (d) => d * DEG,
);
/** Extra distance from the node, tried after every angle failed (never far: a label must read as its node's). */
const LABEL_RINGS = [0, 12, 28];
/** An open branch's label may sit a little further out: its highlighted path ties it to the node. */
const OPEN_LABEL_RINGS = [0, 12, 28, 48];

/** Rect of size w×h pushed from (x, y) along `angle` until it clears a circle of radius `clear`. */
function rectAlong(x: number, y: number, w: number, h: number, angle: number, clear: number): Rect {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  let lo = 0;
  let hi = clear + w + h;
  for (let i = 0; i < 14; i++) {
    const t = (lo + hi) / 2;
    if (distToRect({ x, y }, { x: x + ux * t - w / 2, y: y + uy * t - h / 2, w, h }) >= clear) hi = t;
    else lo = t;
  }
  return { x: x + ux * hi - w / 2, y: y + uy * hi - h / 2, w, h };
}

function labelCollides(rect: Rect, own: Circle, ctx: LabelContext): boolean {
  for (const c of ctx.circles) {
    if (c === own) continue;
    if (distToRect(c, rect) < c.r + ctx.pad) return true;
  }
  for (const t of ctx.taken) if (rectsTouch(rect, t, LABEL_SPACING)) return true;
  if (ctx.edges.length) {
    const halo = grow(rect, 2);
    for (const e of ctx.edges) if (polyHitsRect(e, halo)) return true;
  }
  return false;
}

/** How many candidate spots around `node` are free: a measure of how constrained a label is. */
function freeSpots(node: Circle, sizes: Sizes, angle: number, ctx: LabelContext): number {
  const size = variants(sizes)[0];
  let n = 0;
  for (const extra of LABEL_RINGS) {
    for (const offset of LABEL_ANGLES) {
      const rect = rectAlong(node.x, node.y, size.w, size.h, angle + offset, node.r + (ctx.ownPad ?? ctx.pad) + extra);
      if (inside(ctx.bounds, rect) && !labelCollides(rect, node, ctx)) n++;
    }
  }
  return n;
}

/**
 * Places several labels so that none of them overlap. Greedy in the given order first; if that leaves
 * one out, the most constrained label goes first, then the reverse order. Returns rects by index.
 */
export function placeLabels(
  items: { node: Circle; size: Sizes; angle: number }[],
  ctx: LabelContext,
  place: (item: { node: Circle; size: Sizes; angle: number }, ctx: LabelContext) => Rect | null = (it, c) =>
    placeLabel(it.node, it.size, it.angle, c),
): (Rect | null)[] {
  const run = (order: number[]) => {
    const out: (Rect | null)[] = items.map(() => null);
    const c = { ...ctx, taken: [...ctx.taken] };
    let missing = 0;
    for (const i of order) {
      const rect = place(items[i], c);
      if (rect) c.taken.push(rect);
      else missing++;
      out[i] = rect;
    }
    return { out, missing };
  };
  const natural = items.map((_, i) => i);
  let best = run(natural);
  if (best.missing === 0 || items.length < 2) return best.out;
  const spots = items.map((it) => freeSpots(it.node, it.size, it.angle, ctx));
  for (const order of [[...natural].sort((a, b) => spots[a] - spots[b]), [...natural].reverse()]) {
    const attempt = run(order);
    if (attempt.missing < best.missing) best = attempt;
    if (best.missing === 0) break;
  }
  return best.out;
}

/**
 * Finds a spot for a label next to `node` that touches nothing in `ctx`, trying the preferred direction
 * first, and each size variant in turn (the full-width label before a wrapped one). `node` must be the
 * same object as its entry in `ctx.circles`. Null when nothing fits.
 */
export function placeLabel(node: Circle, sizes: Sizes, angle: number, ctx: LabelContext): Rect | null {
  for (const size of variants(sizes)) {
    const rect = placeOne(node, size, angle, ctx);
    if (rect) return rect;
  }
  return null;
}

function placeOne(node: Circle, size: Size, angle: number, ctx: LabelContext): Rect | null {
  for (const extra of ctx.rings ?? LABEL_RINGS) {
    for (const offset of LABEL_ANGLES) {
      const rect = rectAlong(node.x, node.y, size.w, size.h, angle + offset, node.r + (ctx.ownPad ?? ctx.pad) + extra);
      if (inside(ctx.bounds, rect) && !labelCollides(rect, node, ctx)) return rect;
    }
  }
  return null;
}

/* ------------------------------------------------------------------- fans */

export interface FanInput {
  /** The parent node, or the hub for the top level. */
  origin: Circle;
  /** Direction the origin itself was reached from (null for the hub). Shapes curved edges. */
  parentAngle: number | null;
  count: number;
  /** Preferred direction the fan opens towards (radians). */
  direction: number;
  /** Node radius. */
  radius: number;
  /** Preferred distance from origin to each node centre. */
  distance: number;
  /** Minimum free space between neighbouring nodes. */
  gap: number;
  /** Nodes and labels must stay inside. */
  bounds: Rect;
  /** Everything already placed, except the origin. */
  obstacles: Circle[];
  /** Label rects already reserved. */
  blocked?: Rect[];
  /** Edges already drawn. */
  edges?: Vec[][];
  edgeStyle?: EdgeKind;
  /** Label size(s) to reserve for each new node (null: no label). */
  labels?: (Sizes | null)[];
  /** Label size(s) to reserve for the origin itself (an unfolded branch keeps its name on screen). */
  originLabel?: Sizes | null;
  /** The edge leading into the origin (its label must not cross it). */
  parentEdge?: Vec[] | null;
  /** See `LabelContext.pad`. */
  labelPad?: number;
  /** Allow a full ring around the origin (for a free-floating button). */
  ring?: boolean;
  /** A comfortable angle between neighbours, used when there is room. */
  preferredStep?: number;
  /** Upper bound for the angle the whole fan covers. */
  maxSpread?: number;
  /** How far the fan may rotate away from `direction` before other directions are considered. */
  maxDeviation?: number;
}

export interface Fan {
  points: Vec[];
  /** Reserved label rect per node; null where no label was asked for or none fits. */
  labels: (Rect | null)[];
  /** Reserved label rect for the origin (see `FanInput.originLabel`). */
  originLabel?: Rect | null;
}

/** Fan distances tried, as multiples of the preferred one. Fine-grained: on narrow screens only a narrow band fits. */
const DISTANCE_SCALES = Array.from({ length: 41 }, (_, k) => 1 + k * 0.06);
const RING_SCALES = [1, 1.15, 1.3, 1.5, 1.75, 2, 2.3];
const DEVIATION_STEP = 5 * DEG;
/** Label checks are the expensive part; cap how many node-valid candidates per distance get one. */
const LABEL_CHECKS_PER_TIER = 200;

function arcPoints(o: Vec, rad: number, n: number, dir: number, step: number): Vec[] {
  const start = dir - (step * (n - 1)) / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = start + i * step;
    return { x: o.x + rad * Math.cos(a), y: o.y + rad * Math.sin(a) };
  });
}

function ringPoints(o: Vec, rad: number, n: number, dir: number): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const a = dir + (i * TAU) / n;
    return { x: o.x + rad * Math.cos(a), y: o.y + rad * Math.sin(a) };
  });
}

/**
 * `base`: overflow, and overlap with nodes or reserved labels. `edges`: nodes sitting on edges, or new
 * edges running through nodes. (New edges may pass *under* labels reserved by earlier levels: those belong
 * to pages that are dimmed while this branch is open, and labels are drawn above edges.)
 */
function nodePenalty(pts: Vec[], f: FanInput, strict: boolean, ignoreBlocked = false): { base: number; edges: number } {
  const { bounds: b, radius: r } = f;
  const pad = f.labelPad ?? 8;
  let base = 0;
  let edges = 0;
  for (const q of pts) {
    base += Math.max(0, b.x + r - q.x) + Math.max(0, q.x + r - (b.x + b.w));
    base += Math.max(0, b.y + r - q.y) + Math.max(0, q.y + r - (b.y + b.h));
    for (const o of f.obstacles) {
      const min = r + o.r + f.gap * 0.75;
      const d = Math.hypot(q.x - o.x, q.y - o.y);
      if (d < min) base += min - d;
    }
    if (!ignoreBlocked) {
      for (const rect of f.blocked ?? []) {
        const d = distToRect(q, rect);
        if (d < r + pad) base += r + pad - d;
      }
    }
  }
  if (strict && f.edgeStyle !== 'none' && base === 0) {
    const style = f.edgeStyle ?? 'straight';
    for (const q of pts) {
      for (const e of f.edges ?? []) {
        const d = polyDist(q, e);
        if (d < r + 4) edges += r + 4 - d;
      }
    }
    pts.forEach((q, i) => {
      const e = edgeShape(f.origin, { ...q, r }, style, f.parentAngle).points;
      for (const o of f.obstacles) {
        const d = polyDist(o, e);
        if (d < o.r + 4) edges += o.r + 4 - d;
      }
      pts.forEach((p, j) => {
        if (j === i) return;
        const d = polyDist(p, e);
        if (d < r + 4) edges += r + 4 - d;
      });
    });
  }
  return { base, edges };
}

type OriginRule = 'clean' | 'breadcrumb' | 'optional';

/**
 * Reserves a label for every node of a candidate fan. Null when one doesn't fit (unless `bestEffort`).
 * `strict`: labels cross no edge. `relaxed`: they may cross earlier levels' edges, not this fan's.
 * `loose`: they may cross any edge but their own node's.
 */
function fanLabels(
  pts: Vec[],
  f: FanInput,
  rule: 'strict' | 'relaxed' | 'loose',
  bestEffort: boolean,
  /** What the unfolded branch's own label must be: clean, clean-or-breadcrumb, or anything (even none). */
  origin: OriginRule = 'optional',
): { labels: (Rect | null)[]; originLabel: Rect | null } | null {
  if (!f.labels?.some(Boolean) && !f.originLabel) return { labels: pts.map(() => null), originLabel: null };
  const r = f.radius;
  const style = f.edgeStyle ?? 'straight';
  const nodes = pts.map((p) => ({ x: p.x, y: p.y, r }));
  const own = style !== 'none' ? nodes.map((n) => edgeShape(f.origin, n, style, f.parentAngle).points) : [];
  const edges = style !== 'none' ? [...(f.edges ?? []), ...own] : [];
  const ctx: LabelContext = {
    bounds: f.bounds,
    circles: [...f.obstacles, f.origin, ...nodes],
    taken: [...(f.blocked ?? [])],
    edges,
    pad: f.labelPad ?? 8,
  };
  const wanted = nodes.map((node, i) => ({
    i,
    node,
    size: f.labels?.[i] ?? null,
    angle: Math.atan2(node.y - f.origin.y, node.x - f.origin.x),
  }));
  const items = wanted.filter((w): w is typeof w & { size: Sizes } => !!w.size);
  const rects = placeLabels(items, ctx, (it, c) => {
    const i = (it as (typeof items)[number]).i;
    return (
      placeLabel(it.node, it.size, it.angle, c) ??
      (rule === 'strict' ? null : placeLabel(it.node, it.size, it.angle, { ...c, edges: own })) ??
      (rule === 'loose' ? placeLabel(it.node, it.size, it.angle, { ...c, edges: own.length ? [own[i]] : [] }) : null)
    );
  });
  const out: (Rect | null)[] = nodes.map(() => null);
  items.forEach((it, k) => (out[it.i] = rects[k]));
  if (!bestEffort && items.some((_, k) => !rects[k])) return null;

  // The unfolded branch keeps its name too: clear of its children, their labels and their edges.
  let originLabel: Rect | null = null;
  if (f.originLabel) {
    const c = { ...ctx, taken: [...ctx.taken, ...out.filter((x): x is Rect => !!x)], rings: OPEN_LABEL_RINGS };
    const inEdge = f.parentEdge ? [f.parentEdge] : [];
    // Crossing nothing, or else sitting on its own (highlighted) incoming path like a breadcrumb. If there's
    // no such spot it's placed on demand instead.
    originLabel = placeLabel(f.origin, f.originLabel, f.direction, { ...c, edges: [...c.edges, ...inEdge] });
    if (!originLabel && origin !== 'clean') {
      originLabel = placeLabel(f.origin, f.originLabel, f.direction + Math.PI, {
        ...c,
        edges: c.edges.filter((e) => e !== f.parentEdge),
      });
    }
    if (!originLabel && origin !== 'optional' && !bestEffort) return null;
  }
  return { labels: out, originLabel };
}

/**
 * Places `count` nodes around `origin`, each with room for its label.
 *
 * Search order: the preferred distance first, growing until something fits; within a distance, the
 * candidate closest to the preferred direction. Passes, each more lenient: (1) strict, near the preferred
 * direction; (2) strict, any direction, wider fans; (3) as (2) but edges may cross labels and nodes;
 * (4) nodes still never overlap, but labels that don't fit are left out. Only if there's no room for the
 * nodes themselves is the least-bad placement used.
 */
export function placeFan(f: FanInput): Fan {
  const { origin, count: n, radius: r, gap } = f;
  if (n <= 0) return { points: [], labels: [] };
  const chord = 2 * r + gap;
  let fallback: { points: Vec[]; penalty: number } | null = null;

  const attempt = (pts: Vec[], strict: boolean, budget: { left: number }, needOrigin: OriginRule): Fan | null => {
    const pen = nodePenalty(pts, f, strict);
    if (!fallback || pen.base < fallback.penalty) fallback = { points: pts, penalty: pen.base };
    if (pen.base > 0 || (strict && pen.edges > 0) || budget.left <= 0) return null;
    budget.left--;
    const res = fanLabels(pts, f, strict ? 'strict' : 'relaxed', false, needOrigin);
    return res ? { points: pts, ...res } : null;
  };

  const radii = DISTANCE_SCALES.map((s) => f.distance * s);
  if (n > 1 && f.maxSpread != null) {
    // The distance at which the fan exactly fills `maxSpread`: often the only one that fits.
    const exact = chord / (2 * Math.sin(f.maxSpread / (2 * (n - 1)))) + 0.5;
    if (exact > f.distance) radii.push(exact);
  }
  radii.sort((a, b) => a - b);

  const preferredDev = Math.min(f.maxDeviation ?? Math.PI, Math.PI);
  const wide = f.maxSpread != null && !f.ring ? Math.min(f.maxSpread * 1.5, 1.4 * Math.PI) : f.maxSpread;
  // An unfolded branch would like to keep its own label on screen: every pass is tried with that first,
  // then without (the label is then placed on demand, when the branch is highlighted).
  const basePasses: { dev: number; strict: boolean; spread: number | undefined }[] = [
    { dev: preferredDev, strict: true, spread: f.maxSpread },
    { dev: Math.PI, strict: true, spread: wide },
    { dev: Math.PI, strict: false, spread: wide },
  ];
  const originRules: OriginRule[] = f.originLabel ? ['clean', 'breadcrumb', 'optional'] : ['optional'];
  const passes = originRules.flatMap((needOrigin) => basePasses.map((p) => ({ ...p, needOrigin })));

  for (const pass of passes) {
    if (f.ring && n >= 3) {
      const minRad = Math.max(f.distance, chord / (2 * Math.sin(Math.PI / n)));
      for (const s of RING_SCALES) {
        const fan = attempt(ringPoints(origin, minRad * s, n, f.direction), pass.strict, { left: 1 }, pass.needOrigin);
        if (fan) return fan;
      }
    }

    for (const rad of radii) {
      if (chord >= 2 * rad) continue;
      const minStep = 2 * Math.asin(chord / (2 * rad));
      const comfy = Math.max(minStep, f.preferredStep ?? 0);
      const steps = comfy > minStep + 1e-9 ? [comfy, minStep] : [minStep];

      // Every candidate at this distance, cheapest (closest to the preferred direction) first.
      const candidates: { dir: number; step: number; cost: number }[] = [];
      for (const step of steps) {
        if (n > 1 && pass.spread != null && step * (n - 1) > pass.spread + 1e-9) continue;
        const stepCost = step === comfy ? 0 : 0.15;
        for (let k = 0; k * DEVIATION_STEP <= pass.dev + 1e-9; k++) {
          for (const sign of k === 0 ? [0] : [1, -1]) {
            const dev = sign * k * DEVIATION_STEP;
            candidates.push({ dir: f.direction + dev, step, cost: Math.abs(dev) + stepCost });
          }
        }
      }
      candidates.sort((a, b) => a.cost - b.cost);
      const budget = { left: LABEL_CHECKS_PER_TIER };
      for (const c of candidates) {
        const fan = attempt(arcPoints(origin, rad, n, c.dir, c.step), pass.strict, budget, pass.needOrigin);
        if (fan) return fan;
      }
    }
  }

  // (4) Clean nodes, as many labels as fit: the best of the first few clean candidates. Nodes may take
  // room reserved for earlier labels here; `layoutGraph` drops those labels rather than overlap them.
  let best: Fan | null = null;
  let bestCount = -1;
  let tried = 0;
  const style = f.edgeStyle ?? 'straight';
  const consider = (pts: Vec[]) => {
    if (nodePenalty(pts, f, false, true).base > 0) return;
    tried++;
    const res = fanLabels(pts, f, 'loose', true)!;
    const labels = res.labels;
    // Most labels first, then most labels clear of every edge.
    const edges =
      style === 'none'
        ? []
        : [...(f.edges ?? []), ...pts.map((p) => edgeShape(f.origin, { ...p, r }, style, f.parentAngle).points)];
    const placedCount = labels.filter(Boolean).length + (res.originLabel ? 1 : 0);
    const clean = labels.filter((l) => l && !edges.some((e) => polyHitsRect(e, l))).length;
    const score = placedCount * (n + 2) + clean;
    if (score > bestCount) {
      best = { points: pts, ...res };
      bestCount = score;
    }
  };
  if (f.ring && n >= 3) {
    const minRad = Math.max(f.distance, chord / (2 * Math.sin(Math.PI / n)));
    for (const s of RING_SCALES) consider(ringPoints(origin, minRad * s, n, f.direction));
  }
  for (const rad of radii) {
    const perfect = (n + (f.originLabel ? 1 : 0)) * (n + 2) + n;
    if (tried >= 160 || bestCount === perfect || chord >= 2 * rad) continue;
    const step = 2 * Math.asin(chord / (2 * rad));
    for (let k = 0; k * DEVIATION_STEP <= Math.PI && tried < 160 && bestCount < perfect; k++) {
      for (const sign of k === 0 ? [0] : [1, -1])
        consider(arcPoints(origin, rad, n, f.direction + sign * k * DEVIATION_STEP, step));
    }
  }
  if (best) return best;

  const points =
    (fallback as { points: Vec[] } | null)?.points ?? arcPoints(origin, f.distance, n, f.direction, chord / f.distance);
  return { points, ...fanLabels(points, f, 'loose', true)! };
}

/* ------------------------------------------------------------------ graph */

export interface Level {
  /** Unique key for the level (the ids of the expanded path joined), used for caching. */
  key: string;
  /** `null` for the top level (children of the button). */
  parentId: string | null;
  childIds: string[];
}

export interface PlacedNode extends Vec {
  /** Centre of the parent (the button for top-level pages). */
  from: Vec;
  /** Direction from the parent to this node. */
  angle: number;
  /** Direction the parent itself was reached from (null for top-level pages). */
  parentAngle: number | null;
  /** Room reserved for this node's label; null when labels are off or none fits. */
  label: Rect | null;
  /**
   * The label uses room reserved for a dimmed page's label (only for the level you're looking at, whose
   * labels are always shown). That dimmed label must then stay hidden while this one is visible.
   */
  borrowed?: boolean;
  /** The edge from the parent as a polyline. */
  edge: Vec[];
  /** Room reserved for this node's label while it is unfolded (see `GraphInput.branchLabelSize`). */
  pathLabel?: Rect | null;
}

export interface GraphInput {
  hub: Circle;
  bounds: Rect;
  levels: Level[];
  nodeRadius: number;
  distance: number;
  gap: number;
  edgeStyle?: EdgeKind;
  /** Size(s) of each node's label, to reserve room for it. Omit to lay out without labels. */
  labelSize?: (id: string) => Sizes | null;
  /** Size(s) of an unfolded branch's label (it may carry an extra hint); defaults to `labelSize`. */
  branchLabelSize?: (id: string) => Sizes | null;
  /** See `LabelContext.pad`. */
  labelPad?: number;
}

/**
 * Lays out the visible part of the tree level by level. Each level only depends on the levels before it,
 * so a fan never moves when something deeper unfolds; fans are cached per level key.
 *
 * When a node unfolds, its own reserved label space is released (its children usually want that
 * direction); every other reserved label stays out of bounds for deeper levels.
 */
export function layoutGraph(g: GraphInput, cache = new Map<string, Fan>()): Map<string, PlacedNode> {
  const placed = new Map<string, PlacedNode>();
  const style = g.edgeStyle ?? 'straight';
  const r = g.nodeRadius;
  const obstacles: Circle[] = [g.hub];
  const edges: Vec[][] = [];
  const reserved: { id: string; rect: Rect }[] = [];
  const released = new Set<string>();
  const center = { x: g.bounds.x + g.bounds.w / 2, y: g.bounds.y + g.bounds.h / 2 };

  for (const level of g.levels) {
    const parent = level.parentId == null ? null : placed.get(level.parentId);
    if (level.parentId != null && !parent) continue;
    if (level.parentId != null) released.add(level.parentId);
    const origin: Circle = parent ? { x: parent.x, y: parent.y, r } : g.hub;

    let fan = cache.get(level.key);
    if (!fan || fan.points.length !== level.childIds.length) {
      const toCenter = Math.atan2(center.y - g.hub.y, center.x - g.hub.x);
      const nearCenter = Math.hypot(center.x - g.hub.x, center.y - g.hub.y) < 1;
      fan = placeFan({
        origin,
        parentAngle: parent ? parent.angle : null,
        count: level.childIds.length,
        direction: parent ? parent.angle : nearCenter ? -Math.PI / 2 : toCenter,
        radius: r,
        distance: g.distance,
        gap: g.gap,
        bounds: g.bounds,
        obstacles: obstacles.filter((o) => o.x !== origin.x || o.y !== origin.y),
        blocked: reserved.filter((x) => !released.has(x.id)).map((x) => x.rect),
        edges,
        edgeStyle: style,
        labels: level.childIds.map((id) => g.labelSize?.(id) ?? null),
        originLabel: parent && level.parentId ? ((g.branchLabelSize ?? g.labelSize)?.(level.parentId) ?? null) : null,
        parentEdge: parent ? parent.edge : null,
        labelPad: g.labelPad,
        ...(parent
          ? { maxSpread: 150 * DEG, maxDeviation: 110 * DEG }
          : { ring: true, preferredStep: 50 * DEG, maxSpread: Math.PI }),
      });
      cache.set(level.key, fan);
    }

    if (parent) {
      parent.pathLabel = fan.originLabel ?? null;
      // Deeper levels keep clear of it (it's never released).
      if (parent.pathLabel) reserved.push({ id: `${level.parentId}\u0000open`, rect: parent.pathLabel });
    }

    // A fan that only fit as a last resort may cover reserved labels: drop those labels, never overlap.
    const pad = g.labelPad ?? 8;
    for (const res of reserved) {
      if (released.has(res.id)) continue;
      const covered = fan.points.some((p) => distToRect(p, res.rect) < r + pad - 0.5);
      if (!covered) continue;
      const [id, open] = res.id.split('\u0000');
      const owner = placed.get(id);
      if (!owner) continue;
      if (open) owner.pathLabel = null;
      else owner.label = null;
    }

    level.childIds.forEach((id, i) => {
      const p = fan.points[i];
      const node = { x: p.x, y: p.y, r };
      const parentAngle = parent ? parent.angle : null;
      const edge = edgeShape(origin, node, style, parentAngle).points;
      placed.set(id, {
        x: p.x,
        y: p.y,
        from: { x: origin.x, y: origin.y },
        angle: Math.atan2(p.y - origin.y, p.x - origin.x),
        parentAngle,
        label: fan.labels[i] ?? null,
        edge,
      });
      obstacles.push(node);
      if (style !== 'none') edges.push(edge);
      const rect = fan.labels[i];
      if (rect) reserved.push({ id, rect });
    });
  }

  // Second chance for the level you're looking at: labels that found no room, or had to cross an edge,
  // may use space reserved for dimmed pages' labels, which are hidden while this level is open.
  const last = g.levels[g.levels.length - 1];
  if (last && g.labelSize) {
    const pad = g.labelPad ?? 8;
    const circles = new Map<string, Circle>();
    for (const [id, p] of placed) circles.set(id, { x: p.x, y: p.y, r });
    const frontier = last.childIds.filter((id) => placed.has(id));
    const crosses = (rect: Rect) => edges.some((e) => polyHitsRect(e, rect));
    const redo = frontier.filter((id) => {
      const rect = placed.get(id)!.label;
      return g.labelSize!(id) && (!rect || crosses(rect));
    });
    if (redo.length) {
      const ctx: LabelContext = {
        bounds: g.bounds,
        circles: [g.hub, ...circles.values()],
        taken: frontier
          .filter((id) => !redo.includes(id))
          .map((id) => placed.get(id)!.label)
          .filter((x): x is Rect => !!x),
        edges,
        pad,
      };
      const items = redo.map((id) => ({
        id,
        node: circles.get(id)!,
        size: g.labelSize!(id)!,
        angle: placed.get(id)!.angle,
      }));
      // Visible labels matter more than a clean line under them: as a last resort a label may cover
      // another edge (it's drawn above edges), but never its own.
      const rects = placeLabels(items, ctx, (it, c) => {
        const p = placed.get((it as (typeof items)[number]).id)!;
        return (
          placeLabel(it.node, it.size, it.angle, c) ??
          // A label that already had a (crossing) spot keeps it, and keeps others out of it.
          p.label ??
          placeLabel(it.node, it.size, it.angle, { ...c, edges: style === 'none' ? [] : [p.edge] })
        );
      });
      items.forEach((it, k) => {
        const p = placed.get(it.id)!;
        if (rects[k] && rects[k] !== p.label) {
          p.label = rects[k];
          p.borrowed = true;
        }
      });
    }
  }
  // Circuit doglegs can enter room reserved for an earlier open branch's name. Recheck the visible
  // labels against the complete graph, rather than retaining a crossing spot from a shallower fan.
  if (style === 'step' && last && g.labelSize) {
    const open = new Set(g.levels.flatMap((level) => (level.parentId == null ? [] : [level.parentId])));
    const visible = [...new Set([...open, ...last.childIds])].filter((id) => placed.has(id));
    const rectOf = (id: string) => (open.has(id) ? placed.get(id)!.pathLabel : placed.get(id)!.label);
    for (const id of visible) {
      const p = placed.get(id)!;
      const rect = rectOf(id);
      const clearEdges = open.has(id) ? edges.filter((e) => e !== p.edge) : edges;
      if (rect && !clearEdges.some((e) => polyHitsRect(e, rect))) continue;
      const size = (open.has(id) ? (g.branchLabelSize ?? g.labelSize) : g.labelSize)(id);
      if (!size) continue;
      const node = { x: p.x, y: p.y, r };
      const ctx: LabelContext = {
        bounds: g.bounds,
        circles: [g.hub, ...[...placed.values()].map((q) => ({ x: q.x, y: q.y, r }))],
        taken: visible
          .filter((other) => other !== id)
          .map(rectOf)
          .filter((q): q is Rect => !!q),
        edges: clearEdges,
        pad: g.labelPad ?? 8,
        rings: [...OPEN_LABEL_RINGS, 64, 80],
      };
      const clean = placeLabel(node, size, p.angle, ctx);
      if (open.has(id)) p.pathLabel = clean;
      else p.label = clean;
      // As with frontier labels, a relocated branch caption may borrow a dimmed sibling's room.
      if (clean) p.borrowed = true;
    }
  }
  return placed;
}

/** Index of the node under the pointer, or -1. Picks the nearest node within its radius + slop. */
export function hitTest(p: Vec, nodes: Circle[], slop: number): number {
  let best = -1;
  let bestD = Infinity;
  nodes.forEach((n, i) => {
    const d = Math.hypot(p.x - n.x, p.y - n.y);
    if (d <= n.r + slop && d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
