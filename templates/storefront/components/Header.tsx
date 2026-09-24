import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import f from '@/styles/form.module.css' // look-header:search
import go from '@/styles/go.module.css'
import s from './Header.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { NavLink } from '@/lib/shell.ts'
import type { HeaderVariant } from '@/lib/headers.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'
import { CartLink } from './CartLink.tsx'
import { NavLinks } from './NavLinks.tsx'
import { LangMenu } from './LangMenu.tsx'

type Props = { lang: Lang; nav: NavLink[]; variant: HeaderVariant }

/* Шапка — своя полоса поверхности с волоском снизу, на голом полу страницы
   она не лежит никогда. Вариант приходит значением вида (lib/look.ts):
   разметка своя у каждого, спрятанными варианты не рисуются.
   look-header:* Пока вид выбирается, в коде стоят все (lib/headers.ts);
   look-header:* `npm run look:remove` оставляет выбранный.

   Знаки шапки (поиск, корзина, меню) — тихие глифы ростом с цель
   (`--ctrl-target`), не кнопки действия: стиль кнопок сайта их не касается.
   На узкой коробке шапки у строки одна — знак, поиск, корзина, меню; полки
   уходят в шторку по `popovertarget`, без скрипта. */

const logo = (lang: Lang) => <a className={s.logo} href={hrefFor(lang, { home: true })} translate="no">CBD</a>
const cart = (lang: Lang, labelled: boolean) => <CartLink href={hrefFor(lang, { cart: true })} label={t(lang, 'nav.cart')} countUrl="/api/cart" labelled={labelled} />
/* look-header:classic,boutique:start */
const find = (lang: Lang) => <a className={s.glyph} href={hrefFor(lang, { search: '' })} aria-label={t(lang, 'nav.search')}><Icon id="search" /></a>
/* look-header:classic,boutique:end */
/* look-header:classic,search:start */
const menu = (lang: Lang) => <button className={`${s.glyph} ${s.menu}`} type="button" popoverTarget="site-menu" aria-label={t(lang, 'nav.menu')}><Icon id="menu" /></button>
/* look-header:classic,search:end */
const shelves = (lang: Lang, nav: NavLink[], title: string) => (
  <nav id="site-menu" popover="auto" className={s.nav} aria-label={t(lang, 'nav.categories')}>
    <div className={s.sheetHead}>
      <span className={s.sheetTitle}>{title}</span>
      <button className={s.glyph} type="button" popoverTarget="site-menu" popoverTargetAction="hide" aria-label={t(lang, 'nav.close')}><Icon id="x" /></button>
    </div>
    <NavLinks links={nav} className={s.links} />
    <div className={s.sheetLang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-sheet" list /></div>
  </nav>
)

/* look-header:classic:start */
/* classic — знак, полки строкой рядом; справа язык, поиск, корзина. */
const classic = (lang: Lang, nav: NavLink[]) => (
  <header className={s.head} data-variant="classic">
    <div className={`${p.wrap} ${s.bar}`}>
      {logo(lang)}
      {shelves(lang, nav, t(lang, 'nav.menu'))}
      <div className={s.actions}>
        <div className={s.lang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-bar" /></div>
        {find(lang)}{cart(lang, false)}{menu(lang)}
      </div>
    </div>
  </header>
)
/* look-header:classic:end */

/* look-header:search:start */
/* search — полоса обещания магазина с языком; строка знака, широкого
   поиска и корзины со словом; строка полок. */
const search = (lang: Lang, nav: NavLink[]) => (
  <header className={s.head} data-variant="search">
    <div className={s.strip} data-ground="deck">
      <div className={`${p.wrap} ${s.stripRow}`}>
        <p className={s.promise}>{t(lang, 'header.promise')}</p>
        <div className={s.lang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-strip" /></div>
      </div>
    </div>
    <div className={`${p.wrap} ${s.bar}`}>
      {logo(lang)}
      <form className={s.field} action={hrefFor(lang, { search: '' })} method="get" role="search">
        <input className={f.box} type="search" name="q" aria-label={t(lang, 'search.label')} placeholder={t(lang, 'search.label')} enterKeyHint="search" />
        <button className={s.glyph} type="submit" aria-label={t(lang, 'nav.search')}><Icon id="search" /></button>
      </form>
      <div className={s.actions}>{cart(lang, true)}{menu(lang)}</div>
    </div>
    <div className={`${p.wrap} ${s.shelfRow}`}>{shelves(lang, nav, t(lang, 'nav.menu'))}</div>
  </header>
)
/* look-header:search:end */

/* look-header:boutique:start */
/* boutique — знак по центру, слева язык, справа поиск и корзина; полки —
   строкой под знаком, в той же полосе шапки. На узкой коробке слева «Shop»
   — шторка полок от левого края. Панели полок окном поверх страницы нет:
   слово заказчика 25.09.2026 — «так не делают, меню в верхней полосе должно
   быть». */
const boutique = (lang: Lang, nav: NavLink[]) => (
  <header className={s.head} data-variant="boutique">
    <div className={`${p.wrap} ${s.bar}`}>
      <button className={`${s.glyph} ${s.shop}`} type="button" popoverTarget="site-menu"><Icon id="menu" />{t(lang, 'nav.shop')}</button>
      <div className={`${s.lang} ${s.side}`}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-bar" /></div>
      {logo(lang)}
      <div className={s.actions}>{find(lang)}{cart(lang, false)}</div>
    </div>
    <div className={`${p.wrap} ${s.shelfRow}`}>{shelves(lang, nav, t(lang, 'nav.shop'))}</div>
  </header>
)
/* look-header:boutique:end */

const DRAW: Record<HeaderVariant, (lang: Lang, nav: NavLink[]) => ReactNode> = {
  classic, // look-header:classic
  search, // look-header:search
  boutique, // look-header:boutique
}

export function Header({ lang, nav, variant }: Props) {
  return DRAW[variant](lang, nav)
}

/* Шапка кассы — закрытая (разбор 24.09.2026, S2 и X5; Baymard «enclosed
   checkout»): знак ведёт домой, «назад в корзину» — единственный выход,
   полок, поиска и языка нет — на шагах оформления их не выбирают. Та же
   полоса и тот же знак, что у шапки магазина: рисунок один, меняется только
   состав строки. Вариантом вида она не является и снятию панелью не
   подлежит. */
export function CheckoutHeader({ lang }: { lang: Lang }) {
  return (
    <header className={s.head} data-variant="checkout">
      <div className={`${p.wrap} ${s.bar}`}>
        {logo(lang)}
        <div className={s.actions}>
          <a className={go.go} data-to="back" href={hrefFor(lang, { cart: true })}><Icon id="arrow-left" />{t(lang, 'checkout.back')}</a>
        </div>
      </div>
    </header>
  )
}
