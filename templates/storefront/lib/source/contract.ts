import type { Lang } from '../locale.ts'
import type { HeaderVariant } from '../headers.ts'
import type { CardVariant } from '../cards.ts'
import type { HomeVariant } from '../homes.ts'

export type Money = { minor: number; currency: string }
export type Stock = 'in' | 'low' | 'out'
export type Image = { src: string; alt: string; width: number; height: number }
export type OptionGroup = { code: string; name: string; options: { code: string; name: string }[] }
/** `was` — цена до скидки (Shopify `compareAtPrice`; у Vendure — своё поле
 *  варианта, план 4); `null` — скидки нет. */
export type Variant = { id: string; sku: string; name: string; price: Money; was: Money | null; stock: Stock; options: Record<string, string>; batch: string | null }
export type LabReport = { batch: string; lab: string; date: string; cbdPercent: number; thcPercent: number; url: string }
/** `images` — снимки товара, первый — главный (у Vendure `featuredAsset`,
 *  за ним `assets` без него; план 4). */
export type Product = { id: string; category: string; name: string; summary: string; description: string; images: Image[]; optionGroups: OptionGroup[]; variants: Variant[]; labReports: LabReport[] }
export type Price = { kind: 'single'; value: Money } | { kind: 'range'; min: Money; max: Money }
/** Упаковка варианта — то, что покупатель CBD сравнивает на полке (shop,
 *  «Сила — две шкалы, проценты и миллиграммы»): CBD во всей упаковке, мг, и
 *  её мера — число и единица данных (`ml`, `g`, `pcs`). Процент не хранится:
 *  его считает `percentOf` (lib/facts.ts) из мг и мл — одна арифметика на
 *  полку, грань фильтра и проверку. `mg: null` — упаковка силы не заявляет. */
export type Pack = { mg: number | null; size: number; unit: 'ml' | 'g' | 'pcs' }
/** Чем товар продаётся (ось силы — свойство товара, а не категории;
 *  cbd-facet, §1): `percent` — концентрацией (масла), `mg` — содержанием
 *  (крем, капсулы). */
export type Strength = 'percent' | 'mg'
/** Товар на полке. `packs` — упаковки вариантов по порядку; у Vendure —
 *  поля варианта (план 4). `was` — цена до скидки у товара одной цены
 *  (у диапазона «от» прежней цены нет: неясно, чья она); `variant` — вариант,
 *  который кладётся в корзину прямо с полки, когда он у товара один;
 *  вариантов несколько — null, и кнопка полки ведёт к выбору (И284). */
export type Card = { id: string; category: string; name: string; image: Image; price: Price; was: Money | null; variant: string | null; stock: Stock; strength: Strength; packs: Pack[] }
/** Грань фильтра. `count` — сколько товаров даст значение ПРИ ВСЕХ ДРУГИХ
 *  гранях (cbd-facet, §3): счёт по текущей выборке гасил соседние значения
 *  той же грани, и выбрать «масло ИЛИ капсулы» было нечем. */
export type Facet = { code: string; name: string; values: { code: string; name: string; count: number; selected: boolean }[] }
/** Полка. `image` — кадр полки на главной (4 : 3); у полки без снимка — null. */
export type Collection = { slug: string; name: string; description: string; image: Image | null }
export type SortKey = 'popular' | 'price-asc' | 'price-desc'
export type ListingQuery = { category?: string; q?: string; facets: Record<string, string[]>; sort: SortKey; page: string | null }
export type Listing = { items: Card[]; total: number; page: number; pages: number; facets: Facet[]; invalid: string[] }
export type Doc = { slug: string; title: string; summary: string; sections: { heading: string; body: string }[]; table: 'delivery' | null }
export type Block =
  /** Герой — заголовок, абзац и кнопка ПОВЕРХ широкого снимка (`image`, ≈ 16:10). */
  | { type: 'hero'; title: string; lede: string; cta: string; image: Image }
  | { type: 'categories'; title: string }
  | { type: 'featured'; title: string; ids: string[] }
  /** `report` — образец протокола рядом с текстом: партия, лаборатория, замер. */
  | { type: 'lab'; title: string; body: string; report: LabReport | null }
  | { type: 'delivery'; title: string; items: { title: string; body: string }[] }
  | { type: 'faq'; title: string; items: { q: string; a: string }[] }
  /** Слово магазина — заголовок, несколько предложений своими словами и
   *  снимок с подписью. Место заказчика (docs/design/home.md, «Пустые
   *  места»): пустое молчит — ни заглушки, ни рамки на витрине. */
  | { type: 'story'; title: string; body: string; image: Image | null }
export type Page = { slug: string; title: string; description: string; blocks: Block[] }
/** Обещания магазина, которые витрина печатает у кнопки заказа, — числом из
 *  данных, а не словом в коде. `returnDays` — срок возврата в днях (закон ЕС
 *  даёт не меньше 14, Директива 2011/83/ЕС, ст. 9; магазин вправе дать
 *  больше); `null` — магазин срок не назвал, и строки о возврате нет. У
 *  Payload — поле global «shop» (план 4). */
export type ShopFacts = { returnDays: number | null }
/** Вид витрины — ОДИН, готовыми значениями (CLAUDE.md, «Панель настройки
 *  физически отделена от сайта»; И270): свойства CSS обеих тем (`vars`,
 *  имя → значение из закрытого списка lib/look-slots.json), варианты шапки
 *  и карточки товара, состав главной (`header`, `card`, `home` — разметка из
 *  lib/headers.ts, lib/cards.ts, lib/homes.ts),
 *  шрифты со своих адресов (`fonts`, пусто — системный) и имена вариантов,
 *  из которых вид собран (`names`, для людей и панели; сайт их не читает).
 *  Каталога вариантов в сайте нет — он у панели вида. */
export type LookFont = { family: string; files: { url: string; weight: string; range: string }[] }
export type Look = { header: HeaderVariant; card: CardVariant; home: HomeVariant; vars: Record<string, string>; fonts: LookFont[]; names: Record<string, string> }
export type Result<T> = { ok: true; value: T } | { ok: false; reason: 'unavailable' | 'not-found' | 'bad-request' }

/** Торговля: Vendure в плане 4, образец — сейчас. */
export type Source = {
  collections(lang: Lang): Promise<Result<Collection[]>>
  collection(lang: Lang, slug: string): Promise<Result<Collection>>
  listing(lang: Lang, query: ListingQuery): Promise<Result<Listing>>
  cards(lang: Lang, ids: string[]): Promise<Result<Card[]>>
  product(lang: Lang, id: string): Promise<Result<Product>>
  related(lang: Lang, id: string, limit: number): Promise<Result<Card[]>>
  productIds(): Promise<Result<string[]>>
}

/** Содержание: Payload в плане 4, образец — сейчас. */
export type Content = {
  page(lang: Lang, slug: string): Promise<Result<Page>>
  docs(lang: Lang): Promise<Result<Doc[]>>
  doc(lang: Lang, slug: string): Promise<Result<Doc>>
  /** Обещания магазина у кнопки заказа: срок возврата (`ShopFacts`). */
  facts(): Promise<Result<ShopFacts>>
  /** Вид витрины: у образца — lib/source/sample/look.json, у Payload — global
   *  «look» (план 4). `draft` — черновик для чернового режима (у образца
   *  look.draft.json рядом, у Payload — черновая версия global); черновика
   *  нет — опубликованный. Источник отдаёт как хранит; проверяет `accept`. */
  look(options?: { draft?: boolean }): Promise<Result<unknown>>
}

/* ── Покупка ─────────────────────────────────────────────────────────────
   Корзина, оформление, заказ. Итоги, скидку, доставку и допустимость оплаты
   считает источник (Vendure — сервер; образец — sample/commerce.ts), витрина
   не складывает цены. Доставка и оплата — общий механизм (И261): вид способа
   — закрытый список, имя службы — строка данных. */
export type CartLine = {
  id: string; productId: string; variantId: string; name: string
  options: { group: string; code: string; name: string }[]
  image: Image; unit: Money; quantity: number; total: Money
}
export type Cart = {
  lines: CartLine[]; quantity: number; subtotal: Money
  discounts: { code: string; amount: Money }[]; delivery: Money | null; total: Money
}
export type DeliveryKind = 'address' | 'pickup'
export type PointType = 'office' | 'locker' | 'partner' | 'shop'
export type DeliveryMethod = {
  id: string; kind: DeliveryKind; carrier: string | null; name: string; description: string
  price: Money; days: { min: number; max: number } | null
}
export type PickupPoint = { id: string; type: PointType; name: string; address: string; city: string; hours: string | null }
export type Address = { street: string; city: string; region: string; postalCode: string; country: string }
export type Contact = { email: string; firstName: string; lastName: string; phone: string }
export type Delivery = { method: DeliveryMethod; address: Address | null; point: PickupPoint | null }
export type DeliveryChoice = { methodId: string; address: Address | null; pointId: string | null }
export type PaymentKind = 'on-delivery' | 'transfer' | 'online'
export type PaymentMethod = { code: string; kind: PaymentKind; name: string; description: string; eligible: boolean; reason: string | null }
export type Checkout = { cart: Cart; contact: Contact | null; delivery: Delivery | null }
export type Order = { code: string; placedAt: string; contact: Contact; delivery: Delivery; payment: PaymentMethod; cart: Cart }
export type CommerceError =
  | 'unavailable' | 'not-found' | 'out-of-stock' | 'quantity'
  | 'coupon-invalid' | 'coupon-expired'
  | 'empty-cart' | 'no-contact' | 'no-delivery' | 'point-missing'
  | 'payment-ineligible' | 'payment-declined'
  /** Итог корзины не тот, что покупатель видел у кнопки заказа (И262). */
  | 'changed'
  /** Корзина пуста, а заказ этой сессии поставлен недавно — второе нажатие. */
  | 'placed'
  /** Источник заказов не ставит: витрина подключена к действующему магазину
   *  для показа (у Vendure — без `VENDURE_PLACE_ORDERS=on`). */
  | 'orders-off'
/** Запись. `added` — только у частичного успеха: сколько на самом деле в
 *  строке после записи, когда просили больше, чем есть на складе. */
export type Change<T> = { ok: true; value: T; added?: number } | { ok: false; error: CommerceError }

/** Покупка: Vendure в плане 4, образец — сейчас. `session` — непрозрачный
 *  ключ сессии из cookie; `null` — сессии ещё нет. Первое добавление её
 *  заводит и возвращает. */
export type Commerce = {
  checkout(session: string | null, lang: Lang): Promise<Result<Checkout | null>>
  add(session: string | null, lang: Lang, variantId: string, quantity: number): Promise<{ session: string | null; change: Change<Cart> }>
  setQuantity(session: string, lang: Lang, lineId: string, quantity: number): Promise<Change<Cart>>
  remove(session: string, lang: Lang, lineId: string): Promise<Change<Cart>>
  applyCoupon(session: string, lang: Lang, code: string): Promise<Change<Cart>>
  removeCoupon(session: string, lang: Lang, code: string): Promise<Change<Cart>>
  setContact(session: string, lang: Lang, contact: Contact): Promise<Change<Checkout>>
  deliveryMethods(session: string | null, lang: Lang): Promise<Result<DeliveryMethod[]>>
  /** Точки способа `pickup`. Пустой город — все точки, если их у способа
   *  мало (магазин продавца), иначе пусто: тысячи постаматов списком не
   *  отдаются, их ищут по городу. */
  pickupPoints(lang: Lang, methodId: string, city: string): Promise<Result<PickupPoint[]>>
  setDelivery(session: string, lang: Lang, choice: DeliveryChoice): Promise<Change<Checkout>>
  paymentMethods(session: string, lang: Lang): Promise<Result<PaymentMethod[]>>
  /** Заказ — только по итогу, который покупатель видел у кнопки (Директива
   *  2011/83/ЕС, ст. 8(2); И262): `expected` — этот итог; иной у корзины —
   *  `'changed'`, заказ не ставится. */
  placeOrder(session: string, lang: Lang, paymentCode: string, expected: Money): Promise<Change<Order>>
  /** Заказ этой сессии, поставленный недавно (окно — у источника; у
   *  Vendure гость видит заказ два часа), иначе null. */
  lastOrder(session: string | null, lang: Lang): Promise<Result<Order | null>>
}
