/*
 * Словарь слов витрины (`docs/words.md`, слой 12 основания, И250).
 *
 * Меряется УСТРОЙСТВО, а не формулировки: формулировки — работа заказчика
 * (CLAUDE.md, «Граница ответственности»). Устройство — это то, что делает
 * текст рабочим: разделы на месте; у каждой ошибки у поля и каждого пустого
 * экрана есть следующий шаг; румынский написан своими `ș ț`, а не седильными
 * `ş ţ` (docs/open.md: хвостик вместо запятой видит румын и не видим мы).
 */

export const WORD_SECTIONS = ['Голос', 'Глоссарий', 'Кнопки', 'Ошибки у поля', 'Пустые экраны']
const STEPPED = ['Ошибки у поля', 'Пустые экраны']
const CEDILLA = /[ŞşŢţ]/

/** Таблица раздела: заголовки и строки ячеек. */
function table(text, section) {
  const at = text.search(new RegExp(`^## ${section}\\s*$`, 'm'))
  if (at < 0) return null
  const body = text.slice(at).split('\n').slice(1)
  const end = body.findIndex((line) => /^## /.test(line))
  const rows = (end < 0 ? body : body.slice(0, end))
    .filter((line) => /^\|/.test(line.trim()))
    .map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
  if (rows.length < 2) return { head: rows[0] ?? [], rows: [] }
  return { head: rows[0], rows: rows.slice(2) }
}

/** @returns {string[]} находки; пустой список — словарь устроен. */
export function auditWords(text) {
  const found = []
  for (const section of WORD_SECTIONS) {
    if (!new RegExp(`^## ${section}\\s*$`, 'm').test(text)) found.push(`нет раздела «${section}»`)
  }
  for (const section of STEPPED) {
    const t = table(text, section)
    if (!t) continue
    const step = t.head.indexOf('Шаг')
    if (step < 0) { found.push(`в разделе «${section}» нет колонки «Шаг»`); continue }
    for (const row of t.rows) {
      const cell = row[step] ?? ''
      if (!cell || /^[—–-]$/.test(cell)) found.push(`«${section}»: у «${row[0]}» нет следующего шага`)
    }
  }
  for (const section of WORD_SECTIONS) {
    const t = table(text, section)
    const ro = t?.head.indexOf('ro') ?? -1
    if (ro < 0) continue
    for (const row of t.rows) {
      const cell = row[ro] ?? ''
      if (CEDILLA.test(cell)) {
        found.push(`«${section}»: «${row[0]}» по-румынски «${cell}» — седильные ş ţ вместо ș ț (U+0219, U+021B)`)
      }
    }
  }
  return found
}
