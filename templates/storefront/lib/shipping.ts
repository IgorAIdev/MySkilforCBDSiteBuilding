import type { Lang } from './locale.ts'

type T = Record<Lang, string>
export type SampleMethod = { id: string; kind: 'address' | 'pickup'; carrier: string | null; name: T; description: T; price: number; days: [number, number] | null }
export type SamplePoint = { id: string; method: string; type: 'office' | 'locker' | 'partner' | 'shop'; name: string; address: string; city: string; hours: T | null }
export type SamplePayment = { code: string; kind: 'on-delivery' | 'transfer'; name: T; description: T; limit: number | null; reason: T | null }

const H = (ro: string, en: string, hu: string): T => ({ ro, en, hu })

/* Образец служб рынка — данные, не код (И261). Имена служб Румынии — из
   справочника набора (skills/site-building/assets/commerce/carriers.json);
   какие службы возьмёт магазин, решает заказчик. Цены, сроки и точки —
   образец: настоящие назначает магазин в Vendure, точки приходят от службы.
   Суммы — в минорных единицах валюты рынка (lib/market.ts, у образца —
   евроцентах): курьер 4,99, постамат 3,49, порог оплаты при получении 400.
   Точки выдуманы и помечены «exemplu». */
export const METHODS: SampleMethod[] = [
  {
    id: 'curier', kind: 'address', carrier: 'FAN Courier', price: 499, days: [1, 2],
    name: H('Curier la domiciliu', 'Courier to your door', 'Futár házhoz'),
    description: H('Curierul vă sună înainte de livrare.', 'The courier calls you before delivery.', 'A futár kiszállítás előtt felhívja.'),
  },
  {
    id: 'locker', kind: 'pickup', carrier: 'Sameday', price: 349, days: [1, 2],
    name: H('Locker', 'Parcel locker', 'Csomagautomata'),
    description: H('Ridicați coletul oricând, cu codul primit prin SMS.', 'Collect the parcel any time with the code sent by text message.', 'Az SMS-ben kapott kóddal bármikor átveheti a csomagot.'),
  },
  {
    id: 'magazin', kind: 'pickup', carrier: null, price: 0, days: null,
    name: H('Ridicare din magazin', 'Pick up at our shop', 'Átvétel az üzletben'),
    description: H('Comanda este gata de ridicare în 24 de ore.', 'Your order is ready to collect within 24 hours.', 'A rendelés 24 órán belül átvehető.'),
  },
]

const OPEN = H('Luni–vineri 10:00–18:00', 'Monday–Friday 10:00–18:00', 'Hétfő–péntek 10:00–18:00')

export const POINTS: SamplePoint[] = [
  { id: 'lk-buc-1', method: 'locker', type: 'locker', name: 'Locker Piața Romană (exemplu)', address: 'Bd. Exemplului 1', city: 'București', hours: null },
  { id: 'lk-buc-2', method: 'locker', type: 'locker', name: 'Locker Titan (exemplu)', address: 'Str. Exemplului 12', city: 'București', hours: null },
  { id: 'lk-buc-3', method: 'locker', type: 'locker', name: 'Locker Drumul Taberei (exemplu)', address: 'Str. Exemplului 30', city: 'București', hours: null },
  { id: 'lk-clj-1', method: 'locker', type: 'locker', name: 'Locker Mărăști (exemplu)', address: 'Str. Exemplului 5', city: 'Cluj-Napoca', hours: null },
  { id: 'lk-clj-2', method: 'locker', type: 'locker', name: 'Locker Zorilor (exemplu)', address: 'Str. Exemplului 9', city: 'Cluj-Napoca', hours: null },
  { id: 'lk-is-1', method: 'locker', type: 'locker', name: 'Locker Copou (exemplu)', address: 'Bd. Exemplului 3', city: 'Iași', hours: null },
  { id: 'lk-tm-1', method: 'locker', type: 'locker', name: 'Locker Iosefin (exemplu)', address: 'Str. Exemplului 7', city: 'Timișoara', hours: null },
  { id: 'lk-bv-1', method: 'locker', type: 'locker', name: 'Locker Tractorul (exemplu)', address: 'Str. Exemplului 21', city: 'Brașov', hours: null },
  { id: 'mg-buc', method: 'magazin', type: 'shop', name: 'Magazinul nostru (exemplu)', address: 'Str. Exemplului 10', city: 'București', hours: OPEN },
]

export const PAYMENTS: SamplePayment[] = [
  {
    code: 'ramburs', kind: 'on-delivery', limit: 40000,
    name: H('Plata la livrare (ramburs)', 'Cash on delivery', 'Utánvét'),
    description: H('Plătiți la primirea coletului.', 'Pay when the parcel arrives.', 'A csomag átvételekor fizet.'),
    reason: H('Plata la livrare este disponibilă pentru comenzi de până la {limit}.', 'Cash on delivery is available for orders up to {limit}.', 'Utánvét {limit} értékig választható.'),
  },
  {
    code: 'transfer', kind: 'transfer', limit: null, reason: null,
    name: H('Transfer bancar', 'Bank transfer', 'Banki átutalás'),
    description: H('Trimitem datele de plată după plasarea comenzii; expediem după ce primim plata.', 'We send the payment details after you order and ship once the payment arrives.', 'A rendelés után elküldjük az utalási adatokat; a befizetés után szállítunk.'),
  },
]

/* Коды скидки образца. Map, а не объект: код приходит от покупателя, и
   «constructor» не должен найтись в прототипе. */
export const COUPONS = new Map<string, { percent: number; expired: boolean }>([
  ['CBD10', { percent: 10, expired: false }],
  ['EXPIRAT', { percent: 15, expired: true }],
])

