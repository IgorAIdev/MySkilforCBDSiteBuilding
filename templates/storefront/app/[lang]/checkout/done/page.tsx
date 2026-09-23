import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { doneView, noOrder } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { OrderDone } from '@/components/OrderDone.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'done.title'), description: t(lang, 'done.keep'), path: (l) => hrefFor(l, { checkout: 'done' }), index: false })
}

/* Заказ — последний заказ этой сессии, а не номер из адреса: чужой заказ по
   угаданному номеру не открывается (references/commerce-patterns.md). */
export default async function DonePage({ params }: Props) {
  const lang = await langOf(params)
  const r = await commerce().lastOrder(await readSession(), lang)
  if (!r.ok) return <Unavailable lang={lang} />
  if (!r.value) return <CheckoutEmpty empty={noOrder(lang)} />
  return <OrderDone view={doneView(lang, r.value)} />
}
