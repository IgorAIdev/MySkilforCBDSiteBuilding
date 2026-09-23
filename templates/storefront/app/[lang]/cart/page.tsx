import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { first, type Params } from '@/lib/listing.ts'
import { cartView } from '@/lib/cart-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { cartSubmit, cartCall } from '@/lib/actions/cart.ts'
import { CartView } from '@/components/CartView.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

/* Личное: `noindex`, в карте сайта нет. Без сессии — экран «корзина пуста»
   с кодом 200: адрес из дерева открывается всегда (check:open). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'cart.title'), description: t(lang, 'cart.lede'), path: (l) => hrefFor(l, { cart: true }), index: false })
}

export default async function CartPage({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const r = await commerce().checkout(await readSession(), lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const view = cartView(lang, r.value?.cart ?? null, first((await searchParams).r))
  return <CartView lang={lang} view={view} submit={cartSubmit} call={cartCall} />
}
