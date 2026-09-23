/* «Вид» — выбор шрифта и стиля кнопок на самой витрине (CLAUDE.md, «Выбор
   показывается глазами, а не списком»: «На самой витрине. Все варианты стоят
   в сайте сразу, переключаются одним движением»). Инструмент мастерской, не
   магазина: слова здесь — русские, для заказчика, и в словарь витрины
   (`lib/i18n`, `docs/words.md`) не входят.

   Здесь — список шрифтов, варианты кнопок с замером, чтение переключателя,
   строка выбора и склад выбора с его загрузочным скриптом.
   Шрифты грузит `components/look-fonts.ts`, данные собирает
   `lib/look-data.ts`, панель — `components/Look.tsx`. */

/** Шрифты на выбор. Первый — умолчание сайта (системный стек, `--face` в
 *  styles/tokens.css); у каждого — блок `[data-face]` в styles/storefront.css. */
export const FACES = [
  { id: 'system', name: 'Системный' },
  { id: 'manrope', name: 'Manrope' },
  { id: 'plex', name: 'IBM Plex Sans' },
  { id: 'inter', name: 'Inter' },
  { id: 'serif', name: 'Source Serif 4 + IBM Plex Sans' },
] as const

export type FaceId = (typeof FACES)[number]['id']
export type Face = { id: FaceId; name: string }

/** Стиль кнопки на выбор: `on` — прошёл замер на палитре сайта и выпущен в
 *  styles/buttons.css; `why` — чем не прошёл, одной строкой. */
export type ButtonOption = { name: string; on: boolean; why: string }

type Finding = { rule: string; got: number | string; need: number | string }

/** Варианты кнопок по каталогу `styles/buttons.json` и замеру
 *  `availability()` (tools/buttons.mjs): порядок — каталога, первый — умолчание.
 *  `off` — как его отдаёт замер: стиль → находки (тип у кода на JS не выведен). */
export function buttonOptions(styles: Record<string, unknown>, off: object): ButtonOption[] {
  const found = off as Partial<Record<string, Finding[]>>
  return Object.keys(styles).map((name) => {
    const f = found[name]?.[0]
    return { name, on: !f, why: f ? `не проходит на этой палитре: ${f.rule} — ${f.got} из ${f.need}` : '' }
  })
}

/** Переключатель: панель есть только там, где его включили словом
 *  `LOOK_PICKER=on` в окружении (у витрины-образца — в её `.env`). */
export function lookOn(env: Record<string, string | undefined>): boolean {
  return env.LOOK_PICKER === 'on'
}

export const LOOK_KEY = 'shop-look'

export type Choice = { face: FaceId; button: string }

/** Всё, что нужно панели: шрифты, варианты кнопок и загрузочный скрипт. */
export type LookData = { faces: readonly Face[]; buttons: ButtonOption[]; script: string }

/** Склад выбора (kit.config.json, `stores`): атрибуты на `<html>` — то,
 *  что видит страница и на что подписана панель, — и память браузера под
 *  одним ключом. Память бывает закрыта (приватное окно, запрет сайта): выбор
 *  тогда действует до перезагрузки, и это не ошибка. Читает тот же ключ
 *  загрузочный скрипт ниже — склад, записанный строкой. */
export function applyLook(c: Choice): void {
  const d = document.documentElement
  d.dataset.face = c.face
  d.dataset.button = c.button
  try { localStorage.setItem(LOOK_KEY, JSON.stringify(c)) } catch { /* без памяти */ }
}

/** Строка «Сейчас: Manrope · Пилюля» — выбор словами, чтобы его назвать. */
export function lookLine(face: FaceId, button: string, faces: readonly Face[]): string {
  return `Сейчас: ${faces.find((x) => x.id === face)?.name ?? face} · ${button}`
}

/** Загрузочный скрипт: ставит выбор на `<html>` до первой отрисовки, чтобы
 *  страница не мигнула умолчанием и осталась статической (без cookie).
 *  Сохранённое сверяется со списками: чужое и снятое замером не ставится. */
export function lookScript(faces: readonly Face[], buttons: readonly ButtonOption[]): string {
  const f = JSON.stringify(faces.map((x) => x.id))
  const b = JSON.stringify(buttons.filter((x) => x.on).map((x) => x.name)).replace(/</g, '\\u003c')
  return `try{var v=JSON.parse(localStorage.getItem(${JSON.stringify(LOOK_KEY)})||'{}'),d=document.documentElement;` +
    `if(${f}.indexOf(v.face)>-1)d.dataset.face=v.face;if(${b}.indexOf(v.button)>-1)d.dataset.button=v.button}catch(e){}`
}
