import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import f from '@/styles/form.module.css' // look-header:search
import go from '@/styles/go.module.css'
import s from './Header.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { NavGroup, NavLink } from '@/lib/shell.ts'
import type { HeaderVariant } from '@/lib/headers.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'
import { CartLink } from './CartLink.tsx'
import { NavLinks } from './NavLinks.tsx'
import { LangMenu } from './LangMenu.tsx'

/** Меню шапки: полки и группы шторки («по поводу» — грани каталога, И430). */
type Menu = { links: NavLink[]; groups: NavGroup[] }
type Props = { lang: Lang; nav: NavLink[]; groups: NavGroup[]; variant: HeaderVariant }

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
const cart = (lang: Lang, labelled: boolean) => <CartLink href={hrefFor(lang, { cart: true })} label={t(lang, 'nav.cart')} added={t(lang, 'cart.added')} countUrl={`/api/cart?lang=${lang}`} labelled={labelled} />
/* look-header:classic,boutique,tray,nested,step:start */
const find = (lang: Lang) => <a className={s.glyph} href={hrefFor(lang, { search: '' })} aria-label={t(lang, 'nav.search')}><Icon id="search" /></a>
/* look-header:classic,boutique,tray,nested,step:end */
/* look-header:classic,search,tray,nested,step:start */
const menu = (lang: Lang) => <button className={`${s.glyph} ${s.menu}`} type="button" popoverTarget="site-menu" aria-label={t(lang, 'nav.menu')}><Icon id="menu" /></button>
/* look-header:classic,search,tray,nested,step:end */
/* Группы шторки — пилюлями под полками, когда вид держит меню телефона
   пилюлями (`--drawer-look: pills`, меню телефона cbdin.bg, И430): там
   выбирают поводом, а не местом. Без этого вида групп не видно; разметка
   одна на оба вида. Пилюля — фишка набора в одежде пути (`data-chip="nav"`):
   меню не мельче тела (И286, И448). */
const shelves = (lang: Lang, nav: Menu, title: string) => (
  <nav id="site-menu" popover="auto" className={s.nav} aria-label={t(lang, 'nav.categories')}>
    <div className={s.sheetHead}>
      <span className={s.sheetTitle}>{title}</span>
      <button className={s.glyph} type="button" popoverTarget="site-menu" popoverTargetAction="hide" aria-label={t(lang, 'nav.close')}><Icon id="x" /></button>
    </div>
    <NavLinks links={nav.links} className={s.links} />
    {nav.groups.length ? (
      <div className={s.sheetGroups}>
        {nav.groups.map((g, i) => (
          <div key={g.name} className={s.sheetGroup}>
            <p className={s.groupName} id={`menu-group-${i}`}>{g.name}</p>
            <ul className={`${p.cluster} ${s.pills}`} aria-labelledby={`menu-group-${i}`}>
              {g.links.map((l) => <li key={l.href}><a className={p.chip} data-chip="nav" href={l.href}><span className={s.pillName}>{l.label}</span></a></li>)}
            </ul>
          </div>
        ))}
      </div>
    ) : null}
    <div className={s.sheetLang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-sheet" list /></div>
  </nav>
)

/* look-header:classic:start */
/* classic — знак, полки строкой рядом; справа язык, поиск, корзина. */
const classic = (lang: Lang, nav: Menu) => (
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
const search = (lang: Lang, nav: Menu) => (
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
const boutique = (lang: Lang, nav: Menu) => (
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

/* look-header:tray,nested,step:start */
/* tray, nested, step — сборки шапки cbdin.bg (слово заказчика 25.09.2026:
   «шапки из cbdin.bg — в панель»; И425). Разметка одна: светлая полоса —
   обещание магазина и язык; под ней тёмная рабочая строка на полу палубы —
   меню (на узкой коробке), знак, полки, поиск, корзина. Сборки различает
   только то, как пара лежит на листе (Header.module.css): tray — полоса на
   белом листе, строка ложится на его нижний край; nested — один лист держит
   обе с полем вокруг; step — лист тоном, у строки свои плечи. Шторка полок
   открывается из тёмной строки и остаётся в её краске. */
const board = (lang: Lang, nav: Menu) => (
  <div className={p.wrap}>
    <div className={s.board}>
      <div className={s.util}>
        <p className={s.promise}>{t(lang, 'header.promise')}</p>
        <div className={s.lang}><LangMenu lang={lang} label={t(lang, 'nav.lang')} id="lang-util" /></div>
      </div>
      <div className={`${s.bar} ${s.row}`} data-ground="deck">
        {menu(lang)}
        {logo(lang)}
        {shelves(lang, nav, t(lang, 'nav.menu'))}
        <div className={s.actions}>{find(lang)}{cart(lang, false)}</div>
      </div>
    </div>
  </div>
)
/* look-header:tray,nested,step:end */
/* look-header:tray:start */
const tray = (lang: Lang, nav: Menu) => <header className={s.head} data-variant="tray">{board(lang, nav)}</header>
/* look-header:tray:end */
/* look-header:nested:start */
const nested = (lang: Lang, nav: Menu) => <header className={s.head} data-variant="nested">{board(lang, nav)}</header>
/* look-header:nested:end */
/* look-header:step:start */
const step = (lang: Lang, nav: Menu) => <header className={s.head} data-variant="step">{board(lang, nav)}</header>
/* look-header:step:end */

const DRAW: Record<HeaderVariant, (lang: Lang, nav: Menu) => ReactNode> = {
  classic, // look-header:classic
  search, // look-header:search
  boutique, // look-header:boutique
  tray, // look-header:tray
  nested, // look-header:nested
  step, // look-header:step
}

export function Header({ lang, nav, groups, variant }: Props) {
  return DRAW[variant](lang, { links: nav, groups })
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
