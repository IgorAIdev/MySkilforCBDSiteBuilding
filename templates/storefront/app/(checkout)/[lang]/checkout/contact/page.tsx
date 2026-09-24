import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { stepFor } from '@/lib/checkout-steps.ts'
import { contactView, emptyCheckout, stepsView, summaryView } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { saveContact } from '@/lib/actions/checkout.ts'
import { CheckoutFrame, CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { ContactForm } from '@/components/ContactForm.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'checkout.step.contact'), description: t(lang, 'checkout.lede'), path: (l) => hrefFor(l, { checkout: 'contact' }), index: false })
}

export default async function ContactStep({ params }: Props) {
  const lang = await langOf(params)
  const r = await commerce().checkout(await readSession(), lang)
  if (!r.ok) return <Unavailable lang={lang} />
  if (!r.value || stepFor(r.value, 'contact') === 'cart') return <CheckoutEmpty empty={emptyCheckout(lang)} />
  return (
    <CheckoutFrame steps={stepsView(lang, 'contact')} summary={summaryView(lang, r.value.cart)}>
      <ContactForm view={contactView(lang, r.value.contact)} action={saveContact.bind(null, lang)} permalink={hrefFor(lang, { checkout: 'contact' })} />
    </CheckoutFrame>
  )
}
