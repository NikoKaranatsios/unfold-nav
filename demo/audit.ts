/**
 * Dev tool: open the showcase with `?audit` and run `await unfoldAudit()` in the console.
 *
 * Drives both preview frames through every industry × position, unfolds every branch, highlights every
 * visible page in turn, and checks the rendered result: no label touches a node or another label,
 * nothing leaves the screen, nodes never overlap, labels are as big as the room reserved for them.
 * Also counts labels that had to stay hidden. Uses the element's internals, so it's for development only.
 */
import { DESIGNS } from './designs';
import { INDUSTRIES } from './industries';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rect = { x: number; y: number; w: number; h: number };

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
  'inline',
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const touch = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const distToRect = (p: { x: number; y: number }, r: Rect) =>
  Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));

export async function unfoldAudit(design?: string) {
  if (design && !DESIGNS.some((d) => d.id === design)) throw new Error(`Unknown design ${design}`);
  const problems: string[] = [];
  const hidden = { frontier: 0, active: 0, openActive: 0, open: 0, openTotal: 0 };
  let states = 0;
  const started = performance.now();

  for (const frameId of ['frame-desktop', 'frame-phone']) {
    const frame = document.getElementById(frameId) as HTMLIFrameElement;
    for (const ind of INDUSTRIES) {
      for (const position of POSITIONS) {
        frame.contentWindow!.postMessage(
          { type: 'unfold-showcase:set', state: { industry: ind.id, design: design ?? ind.design, position } },
          location.origin,
        );
        await wait(50);
        const doc = frame.contentDocument!;
        await doc.fonts.ready;
        const nav = doc.querySelector('unfold-nav') as any;
        nav.finishClose();
        nav.open();
        const W = frame.contentWindow!.innerWidth;
        const H = frame.contentWindow!.innerHeight;
        const tree = nav.tree;
        const label = (id: string) => tree.byId.get(id).page.label;
        const paths: string[][] = [[]];
        const walk = (n: any, p: string[]) => {
          for (const c of n.children) {
            if (!c.children.length) continue;
            paths.push([...p, c.id]);
            walk(c, [...p, c.id]);
          }
        };
        walk(tree.root, []);

        for (const path of paths) {
          nav.path = path;
          nav.active = null;
          nav.render();
          const views = [...nav.views.values()].filter((v: any) => !v.leaveTimer) as any[];
          const frontierParent = path[path.length - 1] ?? '';
          for (const active of [null, ...views.map((v) => v.tree.id)]) {
            nav.active = active;
            nav.render();
            states++;
            const where = `${frameId.slice(6)} ${ind.id}/${design ?? ind.design} ${position} [${path.map(label).join(' › ')}] highlight=${active ? label(active) : '-'}`;
            const r = nav.nodeSize / 2;
            const circles = [
              { ...nav.hub, id: null },
              ...views.map((v) => ({ ...nav.placed.get(v.tree.id), r, id: v.tree.id })),
            ];
            const shown = views
              .filter((v) => v.label.hasAttribute('data-visible'))
              .map((v) => ({ id: v.tree.id as string, rect: v.shownAt as Rect }));

            if (!active) {
              for (const v of views) {
                if ((v.tree.parent?.id ?? '') === frontierParent && !v.label.hasAttribute('data-visible')) {
                  hidden.frontier++;
                  problems.push(`${where}: label ${v.tree.page.label} hidden`);
                }
              }
              for (const id of path) {
                hidden.openTotal++;
                if (!nav.views.get(id).label.hasAttribute('data-visible')) hidden.open++;
              }
            } else if (!nav.views.get(active).label.hasAttribute('data-visible')) {
              if (path.includes(active)) hidden.openActive++;
              else hidden.active++;
              problems.push(`${where}: highlighted label hidden`);
            }

            for (const { id, rect } of shown) {
              const real = nav.views.get(id).label.getBoundingClientRect();
              if (real.width > rect.w + 2.5 || real.height > rect.h + 2.5) {
                problems.push(
                  `${where}: ${label(id)} has ${rect.w.toFixed(0)}×${rect.h.toFixed(0)} but is ${real.width.toFixed(0)}×${real.height.toFixed(0)}`,
                );
              }
              if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > W || rect.y + rect.h > H)
                problems.push(`${where}: ${label(id)} off screen`);
              for (const c of circles) {
                if (c.id !== id && distToRect(c, rect) < c.r + 2)
                  problems.push(`${where}: label ${label(id)} touches ${c.id ? label(c.id) : 'the button'}`);
              }
              for (const o of shown)
                if (o.id < id && touch(rect, o.rect, 2))
                  problems.push(`${where}: labels ${label(id)} and ${label(o.id)} touch`);
            }
            for (let i = 0; i < circles.length; i++) {
              for (let j = i + 1; j < circles.length; j++) {
                if (Math.hypot(circles[i].x - circles[j].x, circles[i].y - circles[j].y) < circles[i].r + circles[j].r)
                  problems.push(`${where}: nodes overlap`);
              }
            }
          }
        }
        nav.finishClose();
      }
    }
  }
  const unique = [...new Set(problems)];
  const overlaps = unique.filter((p) => !p.includes('hidden'));
  return {
    states,
    seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
    overlaps: overlaps.length,
    hidden,
    examples: [...overlaps, ...unique.filter((p) => p.includes('hidden'))].slice(0, 20),
  };
}

(window as any).unfoldAudit = unfoldAudit;
console.info('[unfold-nav] audit ready: await unfoldAudit() (optionally unfoldAudit("glass") to force a design)');
