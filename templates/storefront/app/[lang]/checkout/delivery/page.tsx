import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { langOf } from '@/lib/route.ts'
import { commerce } from '@/lib/source/index.ts'
import { readSession } from '@/lib/session.ts'
import { first, type Params } from '@/lib/listing.ts'
import { stepFor } from '@/lib/checkout-steps.ts'
import { deliveryView, emptyCheckout, frameText, stepsView, type Pickup } from '@/lib/checkout-view.ts'
import { totalsView } from '@/lib/cart-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { toMetadata } from '@/lib/seo.ts'
import { chooseMethod, saveAddress, choosePoint } from '@/lib/actions/checkout.ts'
import { CheckoutFrame, CheckoutEmpty } from '@/components/CheckoutFrame.tsx'
import { MethodForm } from '@/components/MethodForm.tsx'
import { AddressForm } from '@/components/AddressForm.tsx'
import { PointPicker } from '@/components/PointPicker.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Params> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  return toMetadata(lang, { title: t(lang, 'checkout.step.delivery'), description: t(lang, 'checkout.lede'), path: (l) => hrefFor(l, { checkout: 'delivery' }), index: false })
}

export default async function DeliveryStep({ params, searchParams }: Props) {
  const lang = await langOf(params)
  const session = await readSession()
  const r = await commerce().checkout(session, lang)
  if (!r.ok) return <Unavailable lang={lang} />
  const go = stepFor(r.value, 'delivery')
  if (!r.value || go === 'cart') return <CheckoutEmpty empty={emptyCheckout(lang)} />
  if (go !== 'delivery') redirect(hrefFor(lang, { checkout: go }))
  const c = r.value
  const methods = await commerce().deliveryMethods(session, lang)
  if (!methods.ok) return <Unavailable lang={lang} />
  const method = c.delivery?.method
  let pickup: Pickup | null = null
  if (method?.kind === 'pickup') {
    /* Точек мало — источник отдаёт их без города. Иначе город: из адреса
       поиска, а если его нет — город уже выбранной точки, чтобы она была
       видна при возврате на шаг. */
    const listed = await commerce().pickupPoints(lang, method.id, '')
    if (!listed.ok) return <Unavailable lang={lang} />
    const city = (first((await searchParams).city) ?? '').trim() || c.delivery?.point?.city || ''
    const found = listed.value.length || !city ? listed : await commerce().pickupPoints(lang, method.id, city)
    if (!found.ok) return <Unavailable lang={lang} />
    pickup = { listed: listed.value.length > 0, city, points: found.value }
  }
  const view = deliveryView(lang, { methods: methods.value, delivery: c.delivery, pickup })
  const here = hrefFor(lang, { checkout: 'delivery' })
  /* Отказ формы точки без скрипта рисуется по адресу формы: без города в нём
     вернулись бы поле поиска и пустота — ни списка, ни слов об ошибке. */
  const pointsHere = pickup?.city ? hrefFor(lang, { checkout: 'delivery', city: pickup.city }) : here
  return (
    <CheckoutFrame text={frameText(lang)} steps={stepsView(lang, 'delivery')} totals={totalsView(lang, c.cart)}>
      <MethodForm view={view} action={chooseMethod.bind(null, lang)} permalink={here} />
      {view.details?.kind === 'address' ? <AddressForm details={view.details} action={saveAddress.bind(null, lang)} permalink={here} /> : null}
      {view.details?.kind === 'pickup' ? <PointPicker details={view.details} action={choosePoint.bind(null, lang)} permalink={pointsHere} /> : null}
    </CheckoutFrame>
  )
}
