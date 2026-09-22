// Adapted from Vercel Commerce variant-selector.tsx; see VERCEL-LICENSE.md.
// Backend-neutral extraction: stable option IDs, no React/Next/Shopify imports.
export function inspectSelection(options, variants, selected = {}) {
  const ids = new Set(options.map(option => option.id))
  if (ids.size !== options.length) throw new Error('Duplicate option IDs')
  if (new Set(variants.map(variant => variant.id)).size !== variants.length) throw new Error('Duplicate variant IDs')
  const valid = Object.entries(selected).every(([id, value]) =>
    options.some(option => option.id === id && option.values.includes(value)))
  if (!valid) return { status: 'invalid', variant: null }
  if (options.some(option => !Object.hasOwn(selected, option.id))) return { status: 'incomplete', variant: null }
  const matches = variants.filter(variant => options.every(option =>
    variant.options[option.id] === selected[option.id]))
  if (matches.length > 1) return { status: 'ambiguous', variant: null }
  const variant = matches[0] ?? null
  return { status: !variant ? 'missing' : variant.available ? 'ready' : 'unavailable', variant }
}

export function isOptionAvailable(options, variants, selected, optionId, value) {
  if (!options.some(option => option.id === optionId && option.values.includes(value))) return false
  const candidate = { ...selected, [optionId]: value }
  // Unknown values must not silently disappear and enable a different purchase.
  if (!Object.entries(candidate).every(([id, v]) => options.some(o => o.id === id && o.values.includes(v)))) return false
  return variants.some(variant => variant.available && Object.entries(candidate).every(([id, v]) => variant.options[id] === v))
}

export function withOption(search, optionId, value) {
  const params = new URLSearchParams(search)
  // Namespace avoids collisions with pagination, locale, campaign and sort keys.
  params.set(`option.${optionId}`, value)
  return params
}
