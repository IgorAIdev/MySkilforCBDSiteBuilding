import type { Lang } from './locale.ts'
import type { Cart, Change, Commerce, CommerceError } from './source/contract.ts'
import { t, type Key } from './i18n/index.ts'

export type CartOp =
  | { op: 'add'; variantId: string; quantity: number }
  | { op: 'set'; lineId: string; quantity: number }
  | { op: 'remove'; lineId: string }
  | { op: 'coupon'; code: string }
  | { op: 'uncoupon'; code: string }
type Op = CartOp['op']
/** Исход записи в корзину. `code` — короткий и ходит в адресе корзины без
 *  скрипта (`?r=`), `message` — те же слова для страницы со скриптом. */
export type Outcome = { kind: 'ok' | 'partial' | 'error'; code: string; message: string; count: number | null }
/* `variant` — добавляли вариант, которого нет: у добавления «not-found»
   значит не строку корзины, а сам товар. */
type Failure = CommerceError | 'request' | 'coupon-empty' | 'timeout' | 'variant'

const DONE: Record<Op, Key> = { add: 'cart.added', set: 'cart.updated', remove: 'cart.removed', coupon: 'cart.couponApplied', uncoupon: 'cart.couponRemoved' }
const FAILED: Record<Failure, Key> = {
  'unavailable': 'cart.error.unavailable',
  'not-found': 'cart.error.gone',
  'variant': 'cart.error.variant',
  'empty-cart': 'cart.error.gone',
  'out-of-stock': 'cart.error.outOfStock',
  'quantity': 'cart.error.quantity',
  'coupon-invalid': 'cart.error.coupon',
  'coupon-expired': 'cart.error.couponExpired',
  'coupon-empty': 'cart.error.couponEmpty',
  'timeout': 'cart.error.timeout',
  'request': 'cart.error.request',
  'no-contact': 'cart.error.request',
  'no-delivery': 'cart.error.request',
  'point-missing': 'cart.error.request',
  'payment-ineligible': 'cart.error.request',
  'payment-declined': 'cart.error.request',
  'changed': 'cart.error.request',
  'placed': 'cart.error.request',
}
/* Количество — до трёх цифр; иное — -1: источник ответит «quantity», и
   покупатель прочтёт, какое количество можно, а не «запрос не понят». */
const qty = (s: string | undefined): number => (s !== undefined && /^\d{1,3}$/.test(s) ? Number(s) : -1)

/** Что просит форма корзины. Кнопка несёт действие в `op` («set:l2:3»,
 *  «remove:l2», «uncoupon:CBD10»); добавление и код — полями формы.
 *  Непонятное — null: не выполняется и не угадывается. */
export function readCartOp(form: FormData): CartOp | null {
  const [op = '', ...rest] = String(form.get('op') ?? '').split(':')
  const tail = rest.join(':')
  if (op === 'add') {
    const variantId = String(form.get('variant') ?? '')
    return variantId ? { op, variantId, quantity: qty(String(form.get('quantity') ?? '1').trim()) } : null
  }
  if (op === 'set' && rest.length >= 2) {
    const lineId = rest.slice(0, -1).join(':')
    return lineId ? { op, lineId, quantity: qty(rest.at(-1)) } : null
  }
  if (op === 'remove' && tail) return { op, lineId: tail }
  if (op === 'coupon') return { op, code: String(form.get('code') ?? '').trim() }
  if (op === 'uncoupon' && tail) return { op, code: tail }
  return null
}

function codeOf(op: Op, change: Change<Cart>): { code: string; count: number | null } {
  if (!change.ok) return { code: `e:${change.error}`, count: null }
  const count = change.value.quantity
  return change.added === undefined ? { code: `ok:${op}`, count } : { code: `partial:${change.added}`, count }
}

/** Выполнить запись. Добавление заводит сессию, если её нет; остальное без
 *  сессии — «товара уже нет в корзине». */
export async function runCartOp(c: Commerce, session: string | null, lang: Lang, op: CartOp | null): Promise<{ session: string | null; code: string; count: number | null }> {
  if (!op) return { session, code: 'e:request', count: null }
  if (op.op === 'coupon' && !op.code) return { session, code: 'e:coupon-empty', count: null }
  if (op.op === 'add') {
    const r = await c.add(session, lang, op.variantId, op.quantity)
    if (!r.change.ok && r.change.error === 'not-found') return { session: r.session ?? session, code: 'e:variant', count: null }
    return { session: r.session ?? session, ...codeOf(op.op, r.change) }
  }
  if (!session) return { session, code: 'e:not-found', count: null }
  const change =
    op.op === 'set' ? await c.setQuantity(session, lang, op.lineId, op.quantity)
    : op.op === 'remove' ? await c.remove(session, lang, op.lineId)
    : op.op === 'coupon' ? await c.applyCoupon(session, lang, op.code)
    : await c.removeCoupon(session, lang, op.code)
  return { session, ...codeOf(op.op, change) }
}

/** Исход по коду — только из закрытого списка: код приходит адресом, и
 *  чужой код не показывается вовсе. */
export function outcomeOf(lang: Lang, code: string, count: number | null = null): Outcome | null {
  const [kind = '', name = ''] = code.split(':')
  if (kind === 'ok' && Object.hasOwn(DONE, name)) return { kind: 'ok', code, message: t(lang, DONE[name as Op]), count }
  if (kind === 'partial' && /^\d{1,3}$/.test(name)) return { kind: 'partial', code, message: t(lang, 'cart.partial', { n: Number(name) }), count }
  if (kind === 'e' && Object.hasOwn(FAILED, name)) return { kind: 'error', code, message: t(lang, FAILED[name as Failure]), count }
  return null
}
