import type { Lang } from './locale.ts'
import type { Product, Variant } from './source/contract.ts'
import type { Params } from './listing.ts'
import { inspectSelection } from './commerce/variant-selection.mjs'
import { hrefFor } from './href.ts'

export type SelectionStatus = 'ready' | 'unavailable' | 'incomplete' | 'missing' | 'invalid' | 'ambiguous'
export type OptionGroupLinks = { code: string; name: string; options: { code: string; name: string; href: string | null; current: boolean }[] }

/* Помощник набора — JavaScript; тип его ответа записан здесь один раз. */
type Inspected = { status: SelectionStatus; variant: { id: string } | null }

/** Выбор из адреса: `option.<группа>=<код>`. Группа, которой у товара нет, не угадывается. */
export function readSelection(params: Params, product: Product): Record<string, string> {
  const out: Record<string, string> = {}
  for (const g of product.optionGroups) {
    const raw = params[`option.${g.code}`]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value) out[g.code] = value
  }
  return out
}

export function pickState(product: Product, selected: Record<string, string>): { status: SelectionStatus; variant: Variant | null } {
  const options = product.optionGroups.map((g) => ({ id: g.code, values: g.options.map((o) => o.code) }))
  const variants = product.variants.map((v) => ({ id: v.id, options: v.options, available: v.stock !== 'out' }))
  const r = inspectSelection(options, variants, selected) as Inspected
  const found = r.variant
  return { status: r.status, variant: found ? (product.variants.find((v) => v.id === found.id) ?? null) : null }
}

/** Ссылки выбора. У опции — адрес с ней вместо текущей в той же группе.
 *  Сочетания нет вовсе — адреса нет; вариант есть, но нет в наличии —
 *  адрес есть: страница скажет «stoc epuizat», а не спрячет вариант. */
export function optionLinks(lang: Lang, product: Product, selected: Record<string, string>): OptionGroupLinks[] {
  const known = Object.fromEntries(Object.entries(selected).filter(([k, v]) =>
    product.optionGroups.some((g) => g.code === k && g.options.some((o) => o.code === v))))
  const exists = (candidate: Record<string, string>) =>
    product.variants.some((v) => Object.entries(candidate).every(([k, val]) => v.options[k] === val))
  return product.optionGroups.map((g) => ({
    code: g.code,
    name: g.name,
    options: g.options.map((o) => {
      const candidate = { ...known, [g.code]: o.code }
      return { code: o.code, name: o.name, current: known[g.code] === o.code, href: exists(candidate) ? hrefFor(lang, { product: product.id, options: candidate }) : null }
    }),
  }))
}
