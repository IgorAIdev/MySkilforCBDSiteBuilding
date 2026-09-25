'use client'
import { usePathname } from 'next/navigation'
import s from './Header.module.css'
import type { NavLink } from '@/lib/shell.ts'
import { Icon } from './Icon.tsx'
import { shot } from '@/lib/shot.ts'

/* Полки шапки. Каждая строка несёт всё, чем её может нарисовать шапка:
   кадр полки, имя, строку о полке, стрелку. Строкой текста в ряду, рядом в
   шторке телефона или плиткой в панели «Shop» — решает вид шапки
   (Header.module.css), разметка одна. Текущая полка — `aria-current` по
   адресу страницы: его знает клиентская часть, и при сборке тоже, так что
   отметка стоит уже в отданной разметке. */
export function NavLinks({ links, className }: { links: NavLink[]; className: string }) {
  const path = usePathname()
  return (
    <ul className={className}>
      {links.map((l) => (
        <li key={l.href} data-all={l.image ? undefined : ''}>
          <a href={l.href} aria-current={l.href === path ? 'page' : undefined}>
            {l.image
              ? <img className={s.thumb} {...shot(l.image, 'thumb', true)} alt="" decoding="async" />
              : <span className={s.thumb} aria-hidden="true"><Icon id="package" /></span>}
            <span className={s.name}>{l.label}</span>
            {l.line ? <span className={s.line}>{l.line}</span> : null}
            <span className={s.chev} aria-hidden="true"><Icon id="chevron-right" /></span>
          </a>
        </li>
      ))}
    </ul>
  )
}
