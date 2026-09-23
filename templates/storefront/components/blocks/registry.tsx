import type { ReactNode } from 'react'
import type { Block } from '@/lib/source/contract.ts'
import type { BlockCtx } from './types.ts'
import { Hero } from './Hero.tsx'
import { Categories } from './Categories.tsx'
import { Featured } from './Featured.tsx'
import { Lab } from './Lab.tsx'
import { Delivery } from './Delivery.tsx'
import { Faq } from './Faq.tsx'

type Renderers = { [K in Block['type']]: (props: { block: Extract<Block, { type: K }>; ctx: BlockCtx }) => ReactNode }

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
} satisfies Renderers

/* Ключ — тип плюс заголовок блока, не индекс массива (check:lint,
   react/no-array-index-key): порядок блоков на странице неизменен, но имя
   должно отличать блоки, а не место, где они стоят. */
export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: BlockCtx }) {
  return blocks.map((block) => {
    const Render = RENDERERS[block.type] as (props: { block: Block; ctx: BlockCtx }) => ReactNode
    return <Render key={`${block.type}-${block.title}`} block={block} ctx={ctx} />
  })
}
