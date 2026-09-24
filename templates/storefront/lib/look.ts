import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import SLOTS from './look-slots.json' with { type: 'json' }
import type { Look } from './source/contract.ts'
import { content } from './source/index.ts'
import { HEADERS } from './headers.ts'
import type { Slots } from './look-values.ts'
import { acceptLook, type Facts } from './look-rule.ts'

/* Вид витрины — ОДИН, готовыми значениями (CLAUDE.md, «Панель настройки
   физически отделена от сайта»; И270). Источник отдаёт опубликованный вид
   (content().look() — у образца lib/source/sample/look.json, у Payload —
   global «look»); сайт проверяет каждое значение (lib/look-values.ts:
   закрытый список свойств, род значения) и сочетание (lib/look-rule.ts:
   уступает младшая группа), и макет кладёт вид блоком `<style href="look">`
   поверх умолчаний своих стилей. Каталога вариантов в сайте нет, смена вида
   сборки не требует: сохранили в админке → POST /api/revalidate с тегом
   `look` → через секунды новый вид. Страницы статические: чтение
   закэшировано с тегом `look`.

   Черновой режим Next — общий механизм предпросмотра содержания: в нём
   источник отдаёт черновик вида (у образца look.draft.json, у Payload —
   черновую версию global), страница рисуется по запросу, остальные гости
   видят опубликованное. Кто включает черновой режим и пишет черновик —
   сайту всё равно: сейчас панель вида, в плане 4 — живой предпросмотр
   Payload. */

const slots = SLOTS.slots as Slots
const facts = SLOTS.facts as Facts

/** Вид по умолчанию — пустой: всё берут стили сайта. */
export const FALLBACK: Look = { header: HEADERS[0], vars: {}, fonts: [], names: {} }

/** Сохранённое → вид, которым рисуется страница. Отброшенное называется
 *  в журнале сервера: свойство, род или группа и почему. */
export function accept(raw: unknown): Look {
  if (raw === null || raw === undefined) return FALLBACK
  const { look, notes } = acceptLook(raw, slots, facts, HEADERS)
  for (const n of notes) console.warn(`look: ${n.what} ${n.why} — the site default stays`)
  return look
}

const published = unstable_cache(async () => {
  const r = await content().look()
  return r.ok ? r.value : null
}, ['look'], { tags: ['look'] })

/** Вид, которым рисуется страница: опубликованный, а в черновом режиме —
 *  черновик источника. */
export async function lookNow(): Promise<Look> {
  if ((await draftMode()).isEnabled) {
    const r = await content().look({ draft: true })
    return accept(r.ok ? r.value : null)
  }
  return accept(await published())
}
