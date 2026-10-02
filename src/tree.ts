import type { NavPage } from './types.js';
import { isIconSource } from './options.js';

export interface TreeNode {
  id: string;
  page: NavPage;
  parent: TreeNode | null;
  children: TreeNode[];
  /** 0 for the (possibly virtual) root, 1 for top-level pages. */
  depth: number;
  index: number;
}

export interface Tree {
  root: TreeNode;
  byId: Map<string, TreeNode>;
}

export function buildTree(pages: NavPage[] | NavPage | null | undefined): Tree {
  const rootPage: NavPage = Array.isArray(pages)
    ? { label: 'Navigation', children: pages }
    : (pages ?? { label: 'Navigation', children: [] });

  const byId = new Map<string, TreeNode>();
  const root: TreeNode = { id: '', page: rootPage, parent: null, children: [], depth: 0, index: 0 };
  const ancestors = new WeakSet<object>();

  const validate = (page: NavPage, path: string) => {
    if (!page || typeof page !== 'object' || Array.isArray(page))
      throw new TypeError(`[unfold-nav] ${path} must be a page object.`);
    if (typeof page.label !== 'string' || !page.label.trim())
      throw new TypeError(`[unfold-nav] ${path}.label must be a non-empty string.`);
    for (const key of ['id', 'href', 'target', 'description', 'color'] as const) {
      if (page[key] !== undefined && typeof page[key] !== 'string')
        throw new TypeError(`[unfold-nav] ${path}.${key} must be a string.`);
    }
    if (page.children !== undefined && !Array.isArray(page.children))
      throw new TypeError(`[unfold-nav] ${path}.children must be an array.`);
    if (page.disabled !== undefined && typeof page.disabled !== 'boolean')
      throw new TypeError(`[unfold-nav] ${path}.disabled must be a boolean.`);
    if (page.icon !== undefined && !isIconSource(page.icon))
      throw new TypeError(`[unfold-nav] ${path}.icon is invalid.`);
    if (ancestors.has(page)) throw new TypeError(`[unfold-nav] ${path} contains a cyclic page tree.`);
  };
  validate(rootPage, 'pages');
  ancestors.add(rootPage);

  const visit = (node: TreeNode, kids: NavPage[] | undefined, trail: number[]) => {
    (kids ?? []).forEach((page, index) => {
      const path = [...trail, index];
      validate(page, `pages[${path.join('].children[')}]`);
      let id = page.id != null && page.id !== '' ? String(page.id) : `n${path.join('.')}`;
      if (byId.has(id)) {
        let n = 2;
        while (byId.has(`${id}~${n}`)) n++;
        id = `${id}~${n}`;
      }
      const child: TreeNode = { id, page, parent: node, children: [], depth: node.depth + 1, index };
      byId.set(id, child);
      node.children.push(child);
      ancestors.add(page);
      visit(child, page.children, path);
      ancestors.delete(page);
    });
  };
  visit(root, rootPage.children, []);
  return { root, byId };
}

/** Ids from the top level down to `node` (inclusive). Empty for the root. */
export function pathTo(node: TreeNode | null | undefined): string[] {
  const ids: string[] = [];
  for (let n = node; n && n.depth > 0; n = n.parent) ids.unshift(n.id);
  return ids;
}

const normalizePath = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

/**
 * The page matching `currentUrl`: an exact path (+ optional query/hash) match wins, otherwise the deepest page whose
 * path is a prefix of the current one (`/blog` for `/blog/some-post`). The site root `/` only matches exactly.
 */
export function findCurrent(tree: Tree, currentUrl: string, base: string): TreeNode | null {
  let current: URL;
  try {
    current = new URL(currentUrl, base);
  } catch {
    return null;
  }
  const curPath = normalizePath(current.pathname);
  let exact: TreeNode | null = null;
  let exactScore = -1;
  let prefix: TreeNode | null = null;
  let prefixLen = -1;

  for (const node of tree.byId.values()) {
    const href = node.page.href;
    if (!href) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.origin !== current.origin) continue;
    if (url.search && url.search !== current.search) continue;
    if (url.hash && url.hash !== current.hash) continue;
    const path = normalizePath(url.pathname);
    if (path === curPath) {
      const score = (url.search ? 1 : 0) + (url.hash ? 1 : 0);
      if (!exact || score > exactScore || (score === exactScore && node.depth > exact.depth)) {
        exact = node;
        exactScore = score;
      }
    } else if (path !== '/' && curPath.startsWith(path + '/') && path.length > prefixLen) {
      prefix = node;
      prefixLen = path.length;
    }
  }
  return exact ?? prefix;
}
