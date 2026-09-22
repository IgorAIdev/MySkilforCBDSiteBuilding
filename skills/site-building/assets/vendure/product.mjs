// displayOptionGroups adapted from vendurehq/nextjs-starter-vendure@7d06ae0
// src/features/products/product-options.ts (MIT, see VENDURE-STARTER-LICENSE.md):
// types and gql.tada removed, input validated. toSelection is original.
//
// Since Vendure 3.6 option groups can be shared across products, so a
// product's optionGroups may list options none of its variants use. Showing
// them produces buttons with no price and a permanently disabled cart button.

export function displayOptionGroups(product) {
  if (!Array.isArray(product?.variants) || !Array.isArray(product?.optionGroups)) {
    throw new TypeError('Select product { optionGroups { id code options { id code } } variants { id options { id } } }')
  }
  const used = new Set(product.variants.flatMap((variant) => (variant.options ?? []).map((option) => option.id)))
  return product.optionGroups
    .map((group) => ({ ...group, options: (group.options ?? []).filter((option) => used.has(option.id)) }))
    .filter((group) => group.options.length > 0)
}

/**
 * Map a Vendure product to the neutral input of assets/commerce/variant-selection.mjs.
 * Stable, untranslated `code` values become option ids and URL values; names stay labels.
 * `available` defaults to Vendure's stockLevel string (IN_STOCK / LOW_STOCK / OUT_OF_STOCK);
 * the server re-checks stock on addItemToOrder regardless.
 */
export function toSelection(product, { available = (variant) => variant.stockLevel !== 'OUT_OF_STOCK' } = {}) {
  const groups = displayOptionGroups(product)
  const groupOf = new Map()
  for (const group of groups) {
    if (typeof group.code !== 'string' || !group.code) throw new TypeError('Select optionGroups { code }')
    for (const option of group.options) {
      if (typeof option.code !== 'string' || !option.code) throw new TypeError('Select options { code }')
      groupOf.set(option.id, { group: group.code, value: option.code })
    }
  }
  const options = groups.map((group) => ({ id: group.code, values: group.options.map((o) => o.code) }))
  const variants = product.variants.map((variant) => {
    const chosen = {}
    for (const option of variant.options ?? []) {
      const where = groupOf.get(option.id)
      if (!where) throw new Error(`Variant ${variant.id} uses option ${option.id} outside the product's option groups`)
      chosen[where.group] = where.value
    }
    return { id: String(variant.id), options: chosen, available: Boolean(available(variant)) }
  })
  return { options, variants }
}
