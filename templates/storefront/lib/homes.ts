import type { Block } from './source/contract.ts'

/* Варианты главной (app/[lang]/page.tsx, components/blocks/*): разметка, а
   не значения — порядок блоков, какие стоят и как каждый разложен. Вид
   называет один из них полем `home`; слова, снимки, протокол и способы
   доставки — данные страницы, одни на все варианты (docs/design/home.md).
   Первый — умолчание: главная, какой она была до вариантов (И360). */
// look-home:* Пока вид выбирается, в коде стоят все варианты. Когда выбран,
// look-home:* `npm run look:remove` удаляет строки и блоки с меткой вариантов,
// look-home:* которых вид не носит, — здесь, в components/blocks и в протоколе партии (components/LabReport).
export const HOMES = [
  'scene', // look-home:scene
  'counter', // look-home:counter
  'proof', // look-home:proof
  'journal', // look-home:journal
  'cabinet', // look-home:cabinet
  'showroom', // look-home:showroom
] as const

export type HomeVariant = (typeof HOMES)[number]

/** Место на главной: блок данных по типу или `still` — снимок героя
 *  отдельной паузой без слов (у варианта, где герой стоит без снимка). */
export type Slot = Block['type'] | 'still'
/** Воздух над местом — роль примитива `section` (`data-air`): `head` —
 *  группа (место продолжает соседа сверху), `band` — полоса; нет — раздел. */
export type Air = 'head' | 'band'
export type Step = readonly [Slot, Air?]

/** Состав главной по варианту: порядок мест и воздух над каждым. Тип блока,
 *  которого рецепт не называет, не пропадает — встаёт в конец по порядку
 *  данных: блок владельца на витрине, пока владелец его не снял. */
export const RECIPES: Record<HomeVariant, readonly Step[]> = {
  /* look-home:scene:start */
  /* Сцена со снимком, полки, ходовые, лист протокола, справка. */
  scene: [['hero'], ['categories'], ['featured'], ['lab'], ['story'], ['delivery'], ['faq']],
  /* look-home:scene:end */
  /* look-home:counter:start */
  /* Магазин сразу: обещание, полки и ходовые — одна группа первого экрана. */
  counter: [['hero', 'head'], ['categories', 'head'], ['featured', 'head'], ['lab'], ['story'], ['delivery'], ['faq']],
  /* look-home:counter:end */
  /* look-home:proof:start */
  /* Протокол сразу: обещание и лист протокола — пара первого экрана. */
  proof: [['hero', 'head'], ['lab', 'head'], ['featured'], ['categories'], ['story'], ['delivery'], ['faq']],
  /* look-home:proof:end */
  /* look-home:journal:start */
  /* Заголовок сразу, полки оглавлением, слово магазина за ходовыми. */
  journal: [['hero', 'band'], ['categories'], ['featured'], ['story'], ['lab'], ['delivery'], ['faq']],
  /* look-home:journal:end */
  /* look-home:cabinet:start */
  /* Тихая аптека: заголовок по середине, ящики полок, товар, пауза снимком. */
  cabinet: [['hero', 'band'], ['categories', 'head'], ['featured'], ['still'], ['lab'], ['story'], ['delivery'], ['faq']],
  /* look-home:cabinet:end */
  /* look-home:showroom:start */
  /* Витрина салона: снимок со скруглением и заголовком на нём, кнопка в
     вырезе угла, товар карточкой на снимке; полки — одной крупной строкой. */
  showroom: [['hero'], ['categories'], ['featured'], ['lab'], ['story'], ['delivery'], ['faq']],
  /* look-home:showroom:end */
}

export type Placed = { slot: Slot; block: Block; air: Air | null; key: string }

/** Блоки страницы в порядке варианта. `still` берёт блок героя (его снимок);
 *  блоков одного типа несколько — стоят подряд на месте типа, в порядке
 *  данных; тип вне рецепта — в конце. Чистая функция: вид не решает, ЧТО
 *  на странице, — только где. */
export function arrange(blocks: readonly Block[], home: HomeVariant): Placed[] {
  const out: Placed[] = []
  const recipe = RECIPES[home]
  const named = new Set<Slot>(recipe.map(([slot]) => slot))
  recipe.forEach(([slot, air], at) => {
    const of = slot === 'still' ? blocks.filter((b) => b.type === 'hero') : blocks.filter((b) => b.type === slot)
    of.forEach((block, i) => out.push({ slot, block, air: air ?? null, key: `${at}-${slot}-${i}` }))
  })
  blocks.forEach((block, i) => { if (!named.has(block.type)) out.push({ slot: block.type, block, air: null, key: `x${i}-${block.type}` }) })
  return out
}
