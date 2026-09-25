import type { Lang } from './locale.ts'
import type { DeliveryMethod, PaymentMethod } from './source/contract.ts'
import { t, tn } from './i18n/index.ts'
import { money } from './money.ts'

/** Обещание у кнопки заказа: знак из листа и строка. */
export type PledgeView = { icon: 'package' | 'truck' | 'shield-check'; text: string }
export type PledgesView = { label: string; items: PledgeView[] }

/** Доставка одной строкой — из того же списка, что выбор на оформлении
 *  (И95): есть бесплатная доставка до двери — она и названа; иначе самая
 *  дешёвая платная цена «от» и, если есть, бесплатный самовывоз. Список
 *  пуст — строки нет. Цены не складываются — выбирается меньшая. */
function deliveryLine(lang: Lang, methods: DeliveryMethod[]): string | null {
  if (!methods.length) return null
  const free = methods.filter((m) => m.price.minor === 0)
  const paid = methods.filter((m) => m.price.minor > 0)
  if (!paid.length || free.some((m) => m.kind === 'address')) return t(lang, 'pledge.deliveryFree')
  const cheapest = paid.reduce((low, m) => (m.price.minor < low.price.minor ? m : low))
  const price = money(cheapest.price, lang)
  return free.length ? t(lang, 'pledge.deliveryPickup', { price }) : t(lang, 'pledge.deliveryFrom', { price })
}

/** Обещания у кнопки заказа — из данных магазина, а не словами в коде
 *  (разбор 24.09.2026, X4, K4). Оплата при получении — именем способа, если
 *  он допустим для ЭТОЙ корзины (у образца — до порога суммы); доставка — из
 *  списка способов; возврат — сроком из данных. Нет данных — нет строки:
 *  витрина не сочиняет того, что назначает магазин (скилл shop, И173). */
export function pledgesView(lang: Lang, a: { payments: PaymentMethod[] | null; methods: DeliveryMethod[] | null; returnDays: number | null }): PledgesView {
  const cod = a.payments?.find((p) => p.kind === 'on-delivery' && p.eligible) ?? null
  const delivery = a.methods ? deliveryLine(lang, a.methods) : null
  const items: PledgeView[] = [
    ...(cod ? [{ icon: 'package' as const, text: cod.name }] : []),
    ...(delivery ? [{ icon: 'truck' as const, text: delivery }] : []),
    ...(a.returnDays ? [{ icon: 'shield-check' as const, text: tn(lang, 'pledge.returns', a.returnDays) }] : []),
  ]
  return { label: t(lang, 'pledge.label'), items }
}
