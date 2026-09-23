import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { langOf } from '@/lib/route.ts'
import { commerce, content } from '@/lib/source/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { t } from '@/lib/i18n/index.ts'
import { deliveryTable } from '@/lib/checkout-view.ts'
import { toMetadata } from '@/lib/seo.ts'
import { breadcrumbLd } from '@/lib/ld.ts'
import { Breadcrumbs } from '@/components/Breadcrumbs.tsx'
import { DeliveryTable } from '@/components/DeliveryTable.tsx'
import { DocView } from '@/components/DocView.tsx'
import { JsonLd } from '@/components/JsonLd.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'

type Props = { params: Promise<{ lang: string; doc: string }> }

/* Вынесено из тела страницы: массив-литерал, собранный прямо в JSX-пропе,
   ловит react-perf/jsx-no-new-array-as-prop даже будучи присвоен константе
   в той же области видимости — только вызов функции СНАРУЖИ снимает находку. */
const docTrail = (home: { name: string; href: string }, title: string) => [home, { name: title }]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const { doc } = await params
  const r = await content().doc(lang, doc)
  if (!r.ok) return {}
  return toMetadata(lang, { title: r.value.title, description: r.value.summary, path: (l) => hrefFor(l, { doc }) })
}

export default async function DocPage({ params }: Props) {
  const lang = await langOf(params)
  const { doc } = await params
  const r = await content().doc(lang, doc)
  if (!r.ok) {
    if (r.reason === 'unavailable') return <Unavailable lang={lang} />
    notFound()
  }
  const home = { name: t(lang, 'crumb.home'), href: hrefFor(lang, { home: true }) }
  /* Документ просит таблицу способов — она из списка оформления; источник
     покупки молчит — документ стоит без таблицы, а не падает. */
  const methods = r.value.table === 'delivery' ? await commerce().deliveryMethods(null, lang) : null
  const table = methods?.ok ? <DeliveryTable view={deliveryTable(lang, methods.value)} /> : null
  return (
    <main id="main" className={p.wrap}>
      <JsonLd data={breadcrumbLd([home, { name: r.value.title, href: hrefFor(lang, { doc }) }])} />
      <Breadcrumbs trail={docTrail(home, r.value.title)} label={t(lang, 'crumb.label')} />
      <DocView doc={r.value} table={table} />
    </main>
  )
}
