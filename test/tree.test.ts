import { describe, expect, it } from 'vitest';
import { buildTree, findCurrent, pathTo } from '../src/tree';
import type { NavPage } from '../src/types';

const pages: NavPage[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Products',
    href: '/products',
    children: [
      {
        label: 'Software',
        href: '/products/software',
        children: [{ label: 'Cloud', href: '/products/software/cloud' }],
      },
      { label: 'Hardware', href: '/products/hardware' },
    ],
  },
  { id: 'blog', label: 'Blog', href: '/blog' },
  { id: 'blog', label: 'Blog again', href: '/blog-2' },
  { label: 'About', children: [{ label: 'Team', href: '/about/team' }] },
];

const BASE = 'https://example.com/';

describe('buildTree', () => {
  it('accepts an array of top-level pages', () => {
    const { root, byId } = buildTree(pages);
    expect(root.children.map((c) => c.page.label)).toEqual(['Home', 'Products', 'Blog', 'Blog again', 'About']);
    expect(byId.size).toBe(9);
  });

  it('accepts a single root page whose children are the top level', () => {
    const { root } = buildTree({ label: 'Site', icon: '★', children: pages });
    expect(root.page.label).toBe('Site');
    expect(root.children).toHaveLength(5);
  });

  it('generates ids from the tree position and de-duplicates given ones', () => {
    const { root } = buildTree(pages);
    expect(root.children[1].children[0].id).toBe('n1.0');
    expect(root.children[2].id).toBe('blog');
    expect(root.children[3].id).toBe('blog~2');
  });

  it('tracks depth, index and parents', () => {
    const { byId } = buildTree(pages);
    const cloud = [...byId.values()].find((n) => n.page.label === 'Cloud')!;
    expect(cloud.depth).toBe(3);
    expect(pathTo(cloud).map((id) => byId.get(id)!.page.label)).toEqual(['Products', 'Software', 'Cloud']);
  });

  it('rejects malformed and cyclic trees with a useful error', () => {
    for (const value of [42, [{ label: '' }], [{ label: 'Bad', children: {} }], [null], [{ label: 'Bad', icon: {} }]]) {
      expect(() => buildTree(value as NavPage[])).toThrow(TypeError);
    }
    const cyclic: NavPage = { label: 'Cycle', children: [] };
    cyclic.children!.push(cyclic);
    expect(() => buildTree([cyclic])).toThrow(/cyclic/);
  });

  it('allows a page object reused in independent branches', () => {
    const shared = { label: 'Contact', href: '/contact' };
    const tree = buildTree([
      { label: 'Sales', children: [shared] },
      { label: 'Support', children: [shared] },
    ]);
    expect(tree.byId.size).toBe(4);
  });
});

describe('findCurrent', () => {
  const tree = buildTree(pages);
  const label = (url: string) => findCurrent(tree, url, BASE)?.page.label ?? null;

  it('matches exact paths, ignoring trailing slashes', () => {
    expect(label('/products/software/')).toBe('Software');
    expect(label('https://example.com/')).toBe('Home');
  });

  it('falls back to the deepest section containing the page', () => {
    expect(label('/products/software/cloud/pricing')).toBe('Cloud');
    expect(label('/products/other')).toBe('Products');
  });

  it('never treats the site root as a section of everything', () => {
    expect(label('/nowhere')).toBeNull();
  });

  it('ignores other origins', () => {
    expect(label('https://elsewhere.com/products')).toBeNull();
  });

  it('prefers matching query and hash destinations over the unqualified route', () => {
    const sections = buildTree([
      { label: 'Search', href: '/search' },
      { label: 'Help', href: '/search?q=help' },
      { label: 'Overview', href: '/docs' },
      { label: 'Install', href: '/docs#install' },
      { label: 'API', href: '/docs#api' },
    ]);
    const match = (url: string) => findCurrent(sections, url, BASE)?.page.label;
    expect(match('/search?q=help')).toBe('Help');
    expect(match('/search?q=other')).toBe('Search');
    expect(match('/docs#install')).toBe('Install');
    expect(match('/docs#api')).toBe('API');
    expect(match('/docs#other')).toBe('Overview');
  });
});
