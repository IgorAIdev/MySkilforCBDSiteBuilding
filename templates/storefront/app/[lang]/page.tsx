import type { Metadata } from 'next'
import { langOf } from '@/lib/route.ts'
import { source, content, commerce } from '@/lib/source/index.ts'
import { shelfCard } from '@/lib/view.ts'
import { deliveryView } from '@/lib/checkout-view.ts'
import { hrefFor } from '@/lib/href.ts'
import { toMetadata } from '@/lib/seo.ts'
import { organizationLd, websiteLd } from '@/lib/ld.ts'
import { COMPANY_IS_REAL } from '@/lib/flags.ts'
import { lookNow } from '@/lib/look.ts'
import { arrange } from '@/lib/homes.ts'
import { pledgesView } from '@/lib/pledges.ts'
import { Blocks } from '@/components/blocks/registry.tsx'
import { JsonLd } from '@/components/JsonLd.tsx'
import { Unavailable } from '@/components/StateScreen.tsx'
import type { BlockCtx } from '@/components/blocks/types.ts'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return {}
  return toMetadata(lang, { title: page.value.title, description: page.value.description, path: (l) => hrefFor(l, { home: true }) })
}

export default async function Home({ params }: Props) {
  const lang = await langOf(params)
  const page = await content().page(lang, 'home')
  if (!page.ok) return <Unavailable lang={lang} />
  const ids = page.value.blocks.flatMap((b) => (b.type === 'featured' ? b.ids : []))
  /* Способы доставки — тот же список, что выбор на оформлении (И95); и
     страница условий доставки — та, что просит таблицу способов. Молчит
     источник покупки — блок стоит без строк способов, а не падает. */
  const [cols, cards, methods, docs, facts, look] = await Promise.all([
    source().collections(lang), source().cards(lang, ids),
    commerce().deliveryMethods(null, lang), content().docs(lang), content().facts(), lookNow(),
  ])
  if (!cols.ok || !cards.ok) return <Unavailable lang={lang} />
  const terms = docs.ok ? docs.value.find((d) => d.table === 'delivery') : undefined
  /* Обещания покупки — из данных магазина, как у кнопки заказа (И332):
     доставка «от» из того же списка способов и срок возврата. Оплату при
     получении главная не обещает: её допустимость зависит от суммы корзины,
     а корзины у главной нет. */
  const pledges = pledgesView(lang, { payments: null, methods: methods.ok ? methods.value : null, returnDays: facts.ok ? facts.value.returnDays : null })
  const ctx: BlockCtx = {
    lang, home: look.home, collections: cols.value, pledges, cards: Object.fromEntries(cards.value.map((c) => [c.id, shelfCard(lang, c)])),
    delivery: {
      methods: methods.ok ? deliveryView(lang, { methods: methods.value, delivery: null, pickup: null }).methods : [],
      terms: terms ? hrefFor(lang, { doc: terms.slug }) : null,
    },
  }
  return (
    /* Вариант главной — разметкой (lib/homes.ts): порядок и раскладка блоков
       приходят из вида, как шапка и карточка товара; `data-home` — по нему
       проверки видят, какая главная нарисована. */
    <main id="main" data-home={look.home}>
      {/* Сведения об организации машина читает как факт: образец компании в
          них не публикуется (флаг настоящести COMPANY_IS_REAL). */}
      {COMPANY_IS_REAL && <JsonLd data={organizationLd()} />}
      {COMPANY_IS_REAL && <JsonLd data={websiteLd()} />}
      <Blocks placed={arrange(page.value.blocks, look.home)} ctx={ctx} />
    </main>
  )
}
