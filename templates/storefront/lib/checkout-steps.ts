import type { Checkout, Delivery } from './source/contract.ts'

export const STEPS = ['contact', 'delivery', 'payment'] as const
export type Step = (typeof STEPS)[number]

/** Доставка выбрана до конца: до двери — с адресом, пункт — с точкой. */
export const deliveryReady = (d: Delivery | null): boolean =>
  d !== null && (d.method.kind === 'address' ? d.address !== null : d.point !== null)

/** Куда пускать. Пустая корзина — на корзину; шаг, до которого не дошли, —
 *  на первый незаконченный. Решает сервер: адрес шага — только просьба
 *  (references/commerce-patterns.md, «Checkout и расширения»). */
export function stepFor(c: Checkout | null, asked: Step): Step | 'cart' {
  if (!c || !c.cart.lines.length) return 'cart'
  if (asked === 'contact' || !c.contact) return 'contact'
  if (asked === 'delivery' || !deliveryReady(c.delivery)) return 'delivery'
  return 'payment'
}

