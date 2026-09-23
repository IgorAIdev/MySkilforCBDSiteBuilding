'use client'
import { usePathname } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import s from './Footer.module.css'
import { LANG_NAMES, LOCALES, type Lang } from '@/lib/locale.ts'

const FIRST = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`)

/* Та же страница на другом языке: язык — первый сегмент адреса. Столбец
   подвала, как соседние: подпись видна («Limba»), список — под ней. */
export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const path = usePathname()
  return (
    <nav className={p.stack} aria-labelledby="lang-title">
      <p className={p.eyebrow} id="lang-title">{label}</p>
      <ul className={s.list}>
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={path.replace(FIRST, `/${l}`)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{LANG_NAMES[l]}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
