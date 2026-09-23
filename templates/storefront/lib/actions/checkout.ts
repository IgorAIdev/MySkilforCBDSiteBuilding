'use server'
import { redirect } from 'next/navigation'
import { commerce } from '../source/index.ts'
import { readSession, sessionChanged } from '../session.ts'
import { isLang, type Lang } from '../locale.ts'
import { hrefFor } from '../href.ts'
import { t, type Key } from '../i18n/index.ts'
import { deliveryReady } from '../checkout-steps.ts'
import { parseAddress, parseContact, type FormState, type Values } from '../checkout-form.ts'
import type { CommerceError, Money } from '../source/contract.ts'

const MESSAGE: Partial<Record<CommerceError, Key>> = {
  'unavailable': 'cart.error.unavailable',
  'not-found': 'delivery.methodMissing',
  'point-missing': 'delivery.pointMissing',
  'out-of-stock': 'cart.error.outOfStock',
  'payment-ineligible': 'payment.ineligible',
  'payment-declined': 'payment.declined',
}

function langFrom(raw: string): Lang {
  if (!isLang(raw)) throw new Error(`checkout: язык «${raw}» не из списка`)
  return raw
}

/** Сессии нет — оформлять нечего: на корзину. */
async function sessionOr(lang: Lang): Promise<string> {
  const session = await readSession()
  if (!session) redirect(hrefFor(lang, { cart: true }))
  return session
}

/** Отказ источника. Пустая корзина и недостающий шаг — переходом туда, где
 *  его закончить; остальное — словами у формы, введённое остаётся. */
function refused(lang: Lang, error: CommerceError, values: Values = {}): FormState {
  if (error === 'empty-cart') redirect(hrefFor(lang, { cart: true }))
  if (error === 'no-contact') redirect(hrefFor(lang, { checkout: 'contact' }))
  if (error === 'no-delivery') redirect(hrefFor(lang, { checkout: 'delivery' }))
  return { errors: {}, values, message: t(lang, MESSAGE[error] ?? 'cart.error.request') }
}

export async function saveContact(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const parsed = parseContact(lang, form)
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values, message: t(lang, 'checkout.fix') }
  const r = await commerce().setContact(await sessionOr(lang), lang, parsed.value)
  if (!r.ok) return refused(lang, r.error, parsed.value)
  sessionChanged()
  redirect(hrefFor(lang, { checkout: 'delivery' }))
}

/** Выбор способа. Способ с готовыми подробностями (одна точка магазина или
 *  прежний адрес) — сразу на оплату; иначе — назад на шаг за подробностями. */
export async function chooseMethod(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const methodId = String(form.get('method') ?? '')
  if (!methodId) return { errors: {}, values: {}, message: t(lang, 'delivery.methodMissing') }
  const r = await commerce().setDelivery(await sessionOr(lang), lang, { methodId, address: null, pointId: null })
  if (!r.ok) return refused(lang, r.error)
  sessionChanged()
  redirect(hrefFor(lang, { checkout: deliveryReady(r.value.delivery) ? 'payment' : 'delivery' }))
}

export async function saveAddress(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const parsed = parseAddress(lang, form)
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values, message: t(lang, 'checkout.fix') }
  const r = await commerce().setDelivery(await sessionOr(lang), lang, { methodId: String(form.get('method') ?? ''), address: parsed.value, pointId: null })
  if (!r.ok) return refused(lang, r.error, parsed.value)
  sessionChanged()
  redirect(hrefFor(lang, { checkout: 'payment' }))
}

export async function choosePoint(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const pointId = String(form.get('point') ?? '')
  if (!pointId) return { errors: {}, values: {}, message: t(lang, 'delivery.pointMissing') }
  const r = await commerce().setDelivery(await sessionOr(lang), lang, { methodId: String(form.get('method') ?? ''), address: null, pointId })
  if (!r.ok) return refused(lang, r.error)
  sessionChanged()
  redirect(hrefFor(lang, { checkout: 'payment' }))
}

/** Итог, который покупатель видел у кнопки: малые единицы цифрами и код
 *  валюты. Нет или кривой — не угадывается: страница перерисуется с
 *  нынешним итогом. */
function expectedOf(form: FormData): Money | null {
  const minor = String(form.get('total') ?? '')
  const currency = String(form.get('currency') ?? '')
  return /^\d{1,15}$/.test(minor) && /^[A-Z]{3}$/.test(currency) ? { minor: Number(minor), currency } : null
}

/** Итог уже не тот, что видел покупатель (И262): заказ не ставится, страница
 *  перечитывается — со скриптом ответ записи несёт её с новым итогом, без
 *  скрипта её рисует сервер, — и сверху слова «итог изменился». */
function totalChanged(lang: Lang): FormState {
  sessionChanged()
  return { errors: {}, values: {}, message: t(lang, 'payment.changed') }
}

/** Заказ. Второе нажатие того же заказа (двойной щелчок без скрипта)
 *  находит корзину уже пустой — и ведёт на «спасибо», где этот заказ и
 *  показан, а не на пустую корзину. */
export async function placeOrder(rawLang: string, _prev: FormState, form: FormData): Promise<FormState> {
  const lang = langFrom(rawLang)
  const code = String(form.get('payment') ?? '')
  if (!code) return { errors: {}, values: {}, message: t(lang, 'payment.missing') }
  const expected = expectedOf(form)
  if (!expected) return totalChanged(lang)
  const r = await commerce().placeOrder(await sessionOr(lang), lang, code, expected)
  if (!r.ok && r.error === 'empty-cart') redirect(hrefFor(lang, { checkout: 'done' }))
  if (!r.ok && r.error === 'changed') return totalChanged(lang)
  if (!r.ok) return refused(lang, r.error)
  sessionChanged()
  redirect(hrefFor(lang, { checkout: 'done' }))
}
