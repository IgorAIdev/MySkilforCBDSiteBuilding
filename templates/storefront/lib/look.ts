import { cookies } from 'next/headers' // look-panel

/* Вид витрины — утверждённые значения, и только они. Макет ставит их
   атрибутами на `<html>` (`data-face`, `data-button`, `data-header`), шапка
   берёт по `header` свою разметку. Шрифт, стиль кнопок и шапку заказчик
   выбирает глазами на самой витрине (панель «Look», public/look/); выбранное
   он передаёт словами — «Copy settings», — и значения переписываются СЮДА.
   Панель сама файлов не пишет, а сайт из панели не берёт ничего. */

/** Варианты шапки — разметка каждого в components/Header.tsx. */
export const HEADERS = ['classic', 'search', 'boutique'] as const
export type HeaderVariant = (typeof HEADERS)[number]
export type Look = { face: string; button: string; header: HeaderVariant }

/** Утверждено. `face` — блок `[data-face]` в styles/storefront.css; `button` —
 *  стиль из styles/buttons.json (первый — умолчание); `header` — из HEADERS. */
export const LOOK: Look = { face: 'system', button: 'Пилюля', header: 'classic' }

/* look-panel:start — пока заказчик выбирает (LOOK_PICKER=on), те же значения
   может передать панель cookie `look`. Выключено — не делается ничего, и
   страницы остаются статическими. Снимается вместе с панелью:
   `npm run look:remove` удаляет всё, что помечено `look-panel`. */
const WORD = /^[\p{L}\p{N} -]{1,40}$/u
const word = (x: unknown): x is string => typeof x === 'string' && WORD.test(x)
async function fromPanel(base: Look): Promise<Look> {
  let v: Record<string, unknown> = {}
  try { v = JSON.parse(decodeURIComponent((await cookies()).get('look')?.value ?? '{}')) as Record<string, unknown> } catch { return base }
  const header = HEADERS.find((h) => h === v.header)
  return { face: word(v.face) ? v.face : base.face, button: word(v.button) ? v.button : base.button, header: header ?? base.header }
}
/* look-panel:end */

/** Вид, которым рисуется страница. */
export async function lookNow(): Promise<Look> {
  /* look-panel:start */
  if (process.env.LOOK_PICKER === 'on') return fromPanel(LOOK)
  /* look-panel:end */
  return LOOK
}
