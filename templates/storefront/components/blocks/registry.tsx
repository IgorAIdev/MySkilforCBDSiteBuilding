import type { ReactNode } from 'react'
import type { Block } from '@/lib/source/contract.ts'
import type { Placed } from '@/lib/homes.ts'
import type { BlockCtx, Place } from './types.ts'
import { Hero } from './Hero.tsx'
import { Still } from './Hero.tsx' // look-home:cabinet
import { Categories } from './Categories.tsx'
import { Featured } from './Featured.tsx'
import { Lab } from './Lab.tsx'
import { Delivery } from './Delivery.tsx'
import { Faq } from './Faq.tsx'
import { Story } from './Story.tsx'

type Renderers = { [K in Block['type']]: (props: { block: Extract<Block, { type: K }>; ctx: BlockCtx; place: Place }) => ReactNode }

/* Реестр блоков (references/payload.md): тип блока → отрисовка. Новый тип
   в договоре без строки здесь — ошибка сборки через satisfies; строка без
   типа в данных — красный tests/blocks.test.ts. */
export const RENDERERS = {
  hero: Hero,
  categories: Categories,
  featured: Featured,
  lab: Lab,
  delivery: Delivery,
  faq: Faq,
  story: Story,
} satisfies Renderers

/* Порядок и воздух — у варианта главной (lib/homes.ts, `arrange`); здесь
   только отрисовка места. Ключ — место рецепта, а не индекс массива
   (check:lint, react/no-array-index-key). `still` — снимок героя отдельной
   паузой: место, а не тип блока данных. */
export function Blocks({ placed, ctx }: { placed: Placed[]; ctx: BlockCtx }) {
  return placed.map(({ slot, block, air, key }) => {
    if (slot === 'still') return block.type === 'hero' ? <Still key={key} block={block} ctx={ctx} place={{ air }} /> : null // look-home:cabinet
    const Render = RENDERERS[block.type] as (props: { block: Block; ctx: BlockCtx; place: Place }) => ReactNode
    return <Render key={key} block={block} ctx={ctx} place={{ air }} />
  })
}
