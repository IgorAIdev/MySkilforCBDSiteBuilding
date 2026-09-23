'use client'
import { usePathname } from 'next/navigation'
import type { NavLink } from '@/lib/shell.ts'

/* Строки навигации шапки. Текущая полка отмечена `aria-current` — по адресу
   страницы, который знает только клиентская часть: макет языка между
   страницами не перерисовывается. Адрес известен и при сборке, поэтому
   отметка стоит уже в отданной разметке, без скрипта. */
export function NavLinks({ links, className }: { links: NavLink[]; className: string }) {
  const path = usePathname()
  return (
    <ul className={className}>
      {links.map((l) => (
        <li key={l.href}><a href={l.href} aria-current={l.href === path ? 'page' : undefined}>{l.label}</a></li>
      ))}
    </ul>
  )
}
