'use client'
import { usePathname } from 'next/navigation'
import s from './Header.module.css'
import { LANG_NAMES, LOCALES, type Lang } from '@/lib/locale.ts'
import { Icon } from './Icon.tsx'

const FIRST = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`)

/* Выбор языка в шапке: «EN ▾» открывает список имён языков на них самих —
   `popover` по `popovertarget`, без скрипта; ссылка ведёт на ту же страницу
   на другом языке. `list` — тот же выбор строкой: в шторке меню и в панели
   полок, где раскрывать второй слой поверх первого незачем. */
export function LangMenu({ lang, label, id, list = false }: { lang: Lang; label: string; id: string; list?: boolean }) {
  const path = usePathname()
  const items = LOCALES.map((l) => (
    <li key={l}><a href={path.replace(FIRST, `/${l}`)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{LANG_NAMES[l]}</a></li>
  ))
  if (list) return <ul className={s.langLine} aria-label={label}>{items}</ul>
  return (
    <>
      <button className={`${s.glyph} ${s.langBtn}`} type="button" popoverTarget={id} aria-label={`${label}: ${LANG_NAMES[lang]}`}>
        <span aria-hidden="true">{lang.toUpperCase()}</span><Icon id="chevron-down" />
      </button>
      <ul id={id} popover="auto" className={s.langList} aria-label={label} data-plate>{items}</ul>
    </>
  )
}
