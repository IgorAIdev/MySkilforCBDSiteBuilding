import p from '@/styles/primitives.module.css'
import f from '@/styles/form.module.css'
import s from './Header.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { NavLink } from '@/lib/shell.ts'
import type { HeaderVariant } from '@/lib/look.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'
import { CartLink } from './CartLink.tsx'
import { NavLinks } from './NavLinks.tsx'
import { LangMenu } from './LangMenu.tsx'

type Props = { lang: Lang; nav: NavLink[]; variant: HeaderVariant }

/* Шапка — своя полоса поверхности с волоском снизу, на голом полу страницы
   она не лежит никогда. Вариант приходит значением (lib/look.ts): разметка
   рисуется своя у каждого, три варианта спрятанными не рисуются.

   · classic   — знак, полки строкой рядом; справа язык, поиск, корзина;
   · search    — полоса обещания магазина с языком; строка знака, широкого
                 поиска и корзины со словом; строка полок;
   · boutique  — знак по центру; слева «Shop» — панель полок с кадрами;
                 справа поиск и корзина.

   Знаки шапки (поиск, корзина, меню) — тихие глифы ростом с цель
   (`--ctrl-target`), не кнопки действия: стиль кнопок сайта их не касается.
   На узкой коробке шапки у classic и search строка одна — знак, поиск,
   корзина, меню; полки уходят в шторку по `popovertarget`, без скрипта. */
export function Header({ lang, nav, variant }: Props) {
  const search = hrefFor(lang, { search: '' })
  const logo = <a className={s.logo} href={hrefFor(lang, { home: true })} translate="no">CBD</a>
  const cart = <CartLink href={hrefFor(lang, { cart: true })} label={t(lang, 'nav.cart')} countUrl="/api/cart" labelled={variant === 'search'} />
  const find = <a className={s.glyph} href={search} aria-label={t(lang, 'nav.search')}><Icon id="search" /></a>
  const menu = <button className={`${s.glyph} ${s.menu}`} type="button" popoverTarget="site-menu" aria-label={t(lang, 'nav.menu')}><Icon id="menu" /></button>
  const shelves = (
    <nav id="site-menu" popover="auto" className={s.nav} aria-label={t(lang, 'nav.categories')}>
      <div className={s.sheetHead}>
        <span className={s.sheetTitle}>{t(lang, variant === 'boutique' ? 'nav.shop' : 'nav.menu')}</span>
        <button className={s.glyph} type="button" popoverTarget="site-menu" popoverTargetAction="hide" aria-label={t(lang, 'nav.close')}><Icon id="x" /></button>
      </div>
      <NavLinks links={nav} className={s.links} />
      <div className={s.sheetLang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-sheet" list /></div>
    </nav>
  )

  if (variant === 'search') {
    return (
      <header className={s.head} data-variant="search">
        <div className={s.strip} data-ground="deck">
          <div className={`${p.wrap} ${s.stripRow}`}>
            <p className={s.promise}>{t(lang, 'header.promise')}</p>
            <div className={s.lang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-strip" /></div>
          </div>
        </div>
        <div className={`${p.wrap} ${s.bar}`}>
          {logo}
          <form className={s.field} action={search} method="get" role="search">
            <input className={f.box} type="search" name="q" aria-label={t(lang, 'search.label')} placeholder={t(lang, 'search.label')} enterKeyHint="search" />
            <button className={s.glyph} type="submit" aria-label={t(lang, 'nav.search')}><Icon id="search" /></button>
          </form>
          <div className={s.actions}>{cart}{menu}</div>
        </div>
        <div className={`${p.wrap} ${s.shelfRow}`}>{shelves}</div>
      </header>
    )
  }

  if (variant === 'boutique') {
    return (
      <header className={s.head} data-variant="boutique">
        <div className={`${p.wrap} ${s.bar}`}>
          <button className={`${s.glyph} ${s.shop}`} type="button" popoverTarget="site-menu"><Icon id="menu" />{t(lang, 'nav.shop')}</button>
          {logo}
          <div className={s.actions}>{find}{cart}</div>
          {shelves}
        </div>
      </header>
    )
  }

  return (
    <header className={s.head} data-variant="classic">
      <div className={`${p.wrap} ${s.bar}`}>
        {logo}
        {shelves}
        <div className={s.actions}>
          <div className={s.lang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-bar" /></div>
          {find}{cart}{menu}
        </div>
      </div>
    </header>
  )
}
