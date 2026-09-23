import { unstable_cache } from 'next/cache'
import { cookies, draftMode } from 'next/headers' // look-panel
import BUTTONS from '../styles/buttons.json' with { type: 'json' }
import PALETTES from '../styles/palette.json' with { type: 'json' }
import type { HeaderVariant, Look } from './source/contract.ts'
import { content } from './source/index.ts'
import { FACE_IDS } from './faces.ts'

/* Вид витрины приходит ДАННЫМИ, как настройки темы: источник отдаёт
   значения (content().look() — у образца lib/source/sample/look.json, у
   Payload — global «look»), макет ставит их атрибутами на `<html>`
   (`data-face`, `data-button`, `data-header`, `data-palette`), шапка берёт
   по `header` свою разметку. Все варианты уже в сборке — шрифты
   (lib/faces.ts, грузится только стоящий), стили кнопок и наборы цвета в
   CSS, шапки в коде, — поэтому смена вида сборки не требует: сохранили в
   админке → POST /api/revalidate с тегом `look` → через секунды новый вид.
   Страницы остаются статическими: чтение закэшировано с тегом `look`. */

export const HEADERS: readonly HeaderVariant[] = ['classic', 'search', 'boutique']

/** Умолчание — на случай, когда источник молчит или прислал незнакомое:
 *  системный шрифт, первый стиль каталога, первая шапка, первый набор. */
export const FALLBACK: Look = {
  face: FACE_IDS[0], button: Object.keys(BUTTONS)[0], header: HEADERS[0], palette: Object.keys(PALETTES)[0],
}

const pick = <T extends string>(value: unknown, known: readonly T[], fallback: T): T => known.find((k) => k === value) ?? fallback

/** Значение принимается, только если такой вариант собран в сайт. */
export function accept(raw: Partial<Record<keyof Look, unknown>> | null): Look {
  return {
    face: pick(raw?.face, FACE_IDS, FALLBACK.face),
    button: pick(raw?.button, Object.keys(BUTTONS), FALLBACK.button),
    header: pick(raw?.header, HEADERS, FALLBACK.header),
    palette: pick(raw?.palette, Object.keys(PALETTES), FALLBACK.palette),
  }
}

const published = unstable_cache(async () => {
  const r = await content().look()
  return r.ok ? r.value : null
}, ['look'], { tags: ['look'] })

/* look-panel:start — просмотр вида панелью «Look» (public/look/), пока
   заказчик выбирает (LOOK_PICKER=on). Панель включает черновой режим Next
   (/api/look-preview) и пишет выбранное cookie `look`; в черновом режиме
   страница рисуется по запросу и берёт значения из cookie. Другие гости
   видят опубликованное, страницы остаются статическими. Снимается вместе с
   панелью: `npm run look:remove`. */
async function preview(base: Look): Promise<Look> {
  if (process.env.LOOK_PICKER !== 'on' || !(await draftMode()).isEnabled) return base
  try {
    const raw = JSON.parse(decodeURIComponent((await cookies()).get('look')?.value ?? '{}')) as Record<string, unknown>
    return accept({ ...base, ...raw })
  } catch {
    return base
  }
}
/* look-panel:end */

/** Вид, которым рисуется страница. */
export async function lookNow(): Promise<Look> {
  let look = accept(await published())
  look = await preview(look) // look-panel
  return look
}
