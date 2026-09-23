'use client'
import { usePathname } from 'next/navigation'
import s from './Footer.module.css'
import { LOCALES, type Lang } from '@/lib/locale.ts'

const NAMES: Record<Lang, string> = { ro: 'Română', en: 'English', hu: 'Magyar' }
const FIRST = new RegExp(`^/(${LOCALES.join('|')})(?=/|$)`)

/* Та же страница на другом языке: язык — первый сегмент адреса. */
export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const path = usePathname()
  return (
    <nav aria-label={label}>
      <ul className={s.list}>
        {LOCALES.map((l) => (
          <li key={l}>
            <a href={path.replace(FIRST, `/${l}`)} hrefLang={l} lang={l} aria-current={l === lang ? 'true' : undefined}>{NAMES[l]}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
