import type { Lang } from './locale.ts'
import type { Address, Contact } from './source/contract.ts'
import { t, type Key } from './i18n/index.ts'
import { MARKET } from './market.ts'

export type Field = 'email' | 'firstName' | 'lastName' | 'phone' | 'street' | 'city' | 'region' | 'postalCode'
export type Values = Partial<Record<Field, string>>
export type Errors = Partial<Record<Field, string>>
/** Состояние формы шага после отправки: ошибки у полей, введённое (React
 *  после отправки возвращает поля к этим значениям) и общее сообщение.
 *  `null` — отправки ещё не было. */
export type FormState = { errors: Errors; values: Values; message: string | null } | null
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Errors; values: Values }

export const LIMITS: Record<Field, number> = { email: 120, firstName: 60, lastName: 60, phone: 20, street: 120, city: 60, region: 60, postalCode: 12 }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE = /^\+?\d{7,15}$/
/* Пустое поле говорит своим шагом там, где он есть: у почты — зачем она, у
   телефона — образец, у уезда — «выберите»; у остальных — общий. */
const EMPTY: Partial<Record<Field, Key>> = { email: 'field.emailEmpty', phone: 'field.phoneShape', region: 'field.regionPick' }

const read = (form: FormData, fields: readonly Field[]): Values =>
  Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? '').trim()])) as Values

function check(lang: Lang, v: Values, rules: Partial<Record<Field, (s: string) => string | null>>): Errors {
  const errors: Errors = {}
  for (const [name, rule] of Object.entries(rules) as [Field, (s: string) => string | null][]) {
    const value = v[name] ?? ''
    const message = !value ? t(lang, EMPTY[name] ?? 'field.required')
      : value.length > LIMITS[name] ? t(lang, 'field.tooLong', { n: LIMITS[name] })
      : rule(value)
    if (message) errors[name] = message
  }
  return errors
}
const any = () => null

/** Контакты. Проверяет сервер; поле формы помечено `required` только ради
 *  чтения вслух — сообщение браузера выключено (`noValidate`), говорит
 *  витрина на языке адреса. */
export function parseContact(lang: Lang, form: FormData): Parsed<Contact> {
  const v = read(form, ['email', 'firstName', 'lastName', 'phone'])
  const errors = check(lang, v, {
    email: (s) => (EMAIL.test(s) ? null : t(lang, 'field.emailShape')),
    firstName: any,
    lastName: any,
    phone: (s) => (PHONE.test(s.replace(/[\s().-]/g, '')) ? null : t(lang, 'field.phoneShape')),
  })
  if (Object.keys(errors).length) return { ok: false, errors, values: v }
  return { ok: true, value: { email: v.email ?? '', firstName: v.firstName ?? '', lastName: v.lastName ?? '', phone: v.phone ?? '' } }
}

/** Уезд — из закрытого списка рынка: поле выбора шлёт его имя, а чужое имя
 *  (правленый адрес, старая форма) не угадывается — просит выбрать. */
export const isRegion = (s: string): boolean => (MARKET.regions as readonly string[]).includes(s)

/** Адрес доставки. Страна, запись индекса и список уездов — рынка
 *  (`MARKET`), не формы. */
export function parseAddress(lang: Lang, form: FormData): Parsed<Address> {
  const v = read(form, ['street', 'city', 'region', 'postalCode'])
  const postal = new RegExp(MARKET.postal.pattern)
  const errors = check(lang, v, {
    street: any,
    city: any,
    region: (s) => (isRegion(s) ? null : t(lang, 'field.regionPick')),
    postalCode: (s) => (postal.test(s.replace(/\s/g, '')) ? null : t(lang, 'field.postal', { example: MARKET.postal.example })),
  })
  if (Object.keys(errors).length) return { ok: false, errors, values: v }
  return {
    ok: true,
    value: { street: v.street ?? '', city: v.city ?? '', region: v.region ?? '', postalCode: (v.postalCode ?? '').replace(/\s/g, ''), country: MARKET.country },
  }
}
