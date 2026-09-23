import b from '@/styles/btn.module.css'
import p from '@/styles/primitives.module.css'
import s from './Header.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { NavLink } from '@/lib/shell.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'
import { CartLink } from './CartLink.tsx'
import { NavLinks } from './NavLinks.tsx'

/* Шапка — одна разметка на обе ширины. На широкой коробке шапки полки стоят
   строкой между знаком магазина и действиями; на узкой строка полок в потоке
   не помещается, и она уходит в шторку верхнего слоя (`popover`), которую
   открывает кнопка «Meniu» по `popovertarget` — без скрипта, Escape и щелчок
   мимо браузер приносит сам (правило 8), как у панели фильтров. Какой вид
   сейчас — решает контейнер шапки (Header.module.css), а не разметка. */
export function Header({ lang, nav }: { lang: Lang; nav: NavLink[] }) {
  return (
    <header className={`${p.wrap} ${s.head}`}>
      <div className={s.bar}>
        <a className={s.logo} href={hrefFor(lang, { home: true })} translate="no">CBD</a>
        <nav id="site-menu" popover="auto" className={s.nav} aria-label={t(lang, 'nav.catalog')}>
          <div className={s.sheetHead}>
            <span className={s.sheetTitle}>{t(lang, 'nav.menu')}</span>
            <button className={b.btn} data-size="sm" type="button" popoverTarget="site-menu" popoverTargetAction="hide" aria-label={t(lang, 'nav.close')}><Icon id="x" /></button>
          </div>
          <NavLinks links={nav} className={`${p.cluster} ${s.links}`} />
        </nav>
        <div className={`${p.cluster} ${s.actions}`}>
          <a className={b.btn} data-size="sm" href={hrefFor(lang, { search: '' })} aria-label={t(lang, 'nav.search')}><Icon id="search" /></a>
          <CartLink href={hrefFor(lang, { cart: true })} label={t(lang, 'nav.cart')} countUrl="/api/cart" />
          <button className={`${b.btn} ${s.menu}`} data-size="sm" type="button" popoverTarget="site-menu"><Icon id="menu" />{t(lang, 'nav.menu')}</button>
        </div>
      </div>
    </header>
  )
}
