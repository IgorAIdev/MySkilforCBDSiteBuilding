import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { commerce, content } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { stepFor } from '@/lib/checkout-steps.ts'
import { emptyCheckout, frameText, paymentView, stepsView } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { TERMS_DOC } from '@/lib/company.ts'
import { placeOrder } from '@/lib/actions/checkout.ts'
import { CheckoutFrame, CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { PaymentForm } from '@/components/PaymentForm.tsx'
import { OrderReview } from '@/components/OrderReview.tsx'
import { OrderTotals } from '@/components/OrderTotals.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'checkout.step.payment'), description: t(lang, 'checkout.lede'), path: (l) => hrefFor(l, { checkout: 'payment' }), index: false })
}

export default async function PaymentStep({ params }: Props) {
  const lang = await langOf(params)
  const session = await readSession()
  const r = await commerce().checkout(session, lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const go = stepFor(r.value, 'payment')
  if (!r.value || !session || go === 'cart') return <CheckoutEmpty empty={emptyCheckout(lang)} />
  if (go !== 'payment') redirect(hrefFor(lang, { checkout: go }))
  const [pay, terms] = await Promise.all([commerce().paymentMethods(session, lang), content().doc(lang, TERMS_DOC)])
  if (!pay.ok) return <Unavailable lang={lang} />
  const view = paymentView(lang, {
    methods: pay.value, checkout: r.value,
    terms: { title: terms.ok ? terms.value.title : t(lang, 'footer.legal'), href: hrefFor(lang, { doc: TERMS_DOC }) },
  })
  return (
    <CheckoutFrame text={frameText(lang)} steps={stepsView(lang, 'payment')} totals={null}>
      <PaymentForm view={view} action={placeOrder.bind(null, lang)} permalink={hrefFor(lang, { checkout: 'payment' })}>
        <OrderReview title={view.review} recaps={view.recaps} itemsTitle={view.itemsTitle} items={view.items} />
        <OrderTotals totals={view.totals} />
      </PaymentForm>
    </CheckoutFrame>
  )
}
