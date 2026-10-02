type Edge = 'top' | 'right' | 'bottom' | 'left';
const edges: Edge[] = ['top', 'right', 'bottom', 'left'];
const documents = new WeakMap<
  Document,
  {
    owners: Map<object, { edge: Edge; size: number }>;
    previous: Map<Edge, { value: string; priority: string }>;
  }
>();

/** Multiple navigations share each edge; removing one restores the remaining inset or the host's value. */
export function updateInsets(owner: object, doc: Document, edge: Edge | null, size = 0): void {
  let registry = documents.get(doc);
  if (!registry && !edge) return;
  if (!registry) {
    registry = { owners: new Map(), previous: new Map() };
    documents.set(doc, registry);
  }
  if (edge) registry.owners.set(owner, { edge, size });
  else registry.owners.delete(owner);
  const style = doc.documentElement.style;
  for (const e of edges) {
    const name = `--unfold-inset-${e}`;
    const sizes = [...registry.owners.values()].filter((entry) => entry.edge === e).map((entry) => entry.size);
    if (sizes.length) {
      if (!registry.previous.has(e))
        registry.previous.set(e, { value: style.getPropertyValue(name), priority: style.getPropertyPriority(name) });
      style.setProperty(name, `calc(${Math.max(...sizes)}px + env(safe-area-inset-${e}, 0px))`);
    } else {
      const previous = registry.previous.get(e);
      if (previous) {
        if (previous.value) style.setProperty(name, previous.value, previous.priority);
        else style.removeProperty(name);
        registry.previous.delete(e);
      }
    }
  }
  if (!registry.owners.size) documents.delete(doc);
}
