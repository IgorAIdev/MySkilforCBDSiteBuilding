import type { Metadata } from 'next'
import type { Lang } from '@/lib/locale.ts'
import { langOf } from '@/lib/route.ts'
import { commerce, content, source } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { first, type Params } from '@/lib/listing.ts'
import { cartView, type CartExtras } from '@/lib/cart-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { cartSubmit, cartCall } from '@/lib/actions/cart.ts'
import { CartView } from '@/components/CartView.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

/* Ходовых товаров на полке пустой корзины — один ряд полки главной. */
const POPULAR = 4

/* Личное: `noindex`, в карте сайта нет. Без сессии — экран «корзина пуста»
   с кодом 200: адрес из дерева открывается всегда (check:open). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'cart.title'), description: t(lang, 'cart.lede'), path: (l) => hrefFor(l, { cart: true }), index: false })
}

/* Страница ходит за данными, вид их складывает: у полной корзины — способы
   оплаты ЭТОЙ корзины, способы доставки и срок возврата для обещаний у
   кнопки; у пустой — ходовые товары для полки. Молчит источник чего-то из
   этого — строки нет, корзина стоит. */
async function extrasOf(lang: Lang, session: string | null, filled: boolean): Promise<CartExtras> {
  if (!filled) {
    const shelf = await source().listing(lang, { facets: {}, sort: 'popular', page: null })
    return { payments: null, methods: null, returnDays: null, popular: shelf.ok ? shelf.value.items.slice(0, POPULAR) : [] }
  }
  const [payments, methods, facts] = await Promise.all([
    session ? commerce().paymentMethods(session, lang) : null,
    commerce().deliveryMethods(session, lang),
    content().facts(),
  ])
  return {
    payments: payments?.ok ? payments.value : null,
    methods: methods.ok ? methods.value : null,
    returnDays: facts.ok ? facts.value.returnDays : null,
    popular: [],
  }
}

export default async function CartPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const session = await readSession()
  const r = await commerce().checkout(session, lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const cart = r.value?.cart ?? null
  const extras = await extrasOf(lang, session, Boolean(cart?.lines.length))
  const view = cartView(lang, cart, first((await searchParams).r), extras)
  return <CartView lang={lang} view={view} submit={cartSubmit} call={cartCall} />
}
