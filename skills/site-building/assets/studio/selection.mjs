/** Explicit graph covers dynamic registries, CSS and assets, not just static JS imports. */
export function selectResources(registry, roots) {
  const visited = new Set(), active = new Set(), files = new Set()
  function visit(id) {
    if (!Object.hasOwn(registry, id)) throw new Error('Unknown resource: ' + id)
    if (active.has(id)) throw new Error('Cyclic resource dependency: ' + id)
    if (visited.has(id)) return
    active.add(id)
    const resource = registry[id]
    for (const dependency of resource.requires ?? []) visit(dependency)
    for (const file of resource.files ?? []) files.add(file)
    active.delete(id); visited.add(id)
  }
  roots.forEach(visit)
  return { files: [...files].sort(), included: [...visited].sort(), excluded: Object.keys(registry).filter(id => !visited.has(id)).sort() }
}
