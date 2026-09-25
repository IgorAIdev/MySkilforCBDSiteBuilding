import p from '@/styles/primitives.module.css'
import s from './Footer.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { Doc } from '@/lib/source/contract.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { COMPANY, ANPC_SAL_URL, SOL_URL, TERMS_DOC } from '@/lib/company.ts'
import { CONTACTS, telHref, mailHref } from '@/lib/contacts.ts'
import { COMPANY_IS_REAL } from '@/lib/flags.ts'
import { LangSwitch } from './LangSwitch.tsx'

const HELP = ['livrare-si-plata', 'retur', 'contact', 'despre-noi']
const LEGAL = [TERMS_DOC, 'confidentialitate']

/* Подписи столбцов — подписи, а не заголовки: мелкие и полужирные (роль
   надзаголовка), а заголовок h2 такого кегля вставал в лестнице страницы
   ниже заголовков карточек (check:craft, лестница заголовков). Столбцы
   ссылок — навигация, названная своей подписью (`aria-labelledby`).

   Столбец — группа (`col`): подпись к своим строкам ближе, чем столбцы друг к
   другу. Стояло одним шагом — 16 внутри и 16 между, — и на телефоне, где
   четыре столбца ложатся два на два, «Компания» читалась пятой строкой
   «Помощи» (разбор 24.09.2026, S5; check:design, flatRhythm). */
export function Footer({ lang, docs, variant = 'full' }: { lang: Lang; docs: Doc[]; variant?: 'full' | 'legal' }) {
  const links = (slugs: string[]) => docs.filter((d) => slugs.includes(d.slug)).map((d) => <li key={d.slug}><a href={hrefFor(lang, { doc: d.slug })}>{d.title}</a></li>)
  /* Подвал кассы — строка на полу страницы, а не тёмная плита: в коридоре
     оформления нечего выбирать, кроме того, что обязано быть по закону
     (условия, возврат, данные, ANPC и SOL), и того, что помогает довести
     заказ, — телефона (разбор 24.09.2026, S2; Baymard: контакт поддержки в
     оформлении). */
  if (variant === 'legal') {
    return (
      <footer className={s.legal}>
        <div className={`${p.wrap} ${s.legalRow}`}>
          <p>{t(lang, 'checkout.help')} <a href={telHref()}>{CONTACTS.phone}</a></p>
          <ul className={s.legalLinks}>
            {links([...LEGAL, 'retur'])}
            <li><a href={ANPC_SAL_URL} rel="noopener">{t(lang, 'footer.anpc')}</a></li>
            <li><a href={SOL_URL} rel="noopener">{t(lang, 'footer.sol')}</a></li>
          </ul>
          <p><span translate="no">{COMPANY.name}</span> · CUI {COMPANY.cui}{COMPANY_IS_REAL ? null : ` · ${t(lang, 'sample')}`}</p>
        </div>
      </footer>
    )
  }
  return (
    <footer className={s.foot} data-ground="deck">
      <div className={`${p.wrap} ${p.grid} ${s.cols}`}>
        <nav className={`${p.stack} ${s.col}`} aria-labelledby="foot-help">
          <p className={p.eyebrow} id="foot-help">{t(lang, 'footer.help')}</p>
          <ul className={s.list}>{links(HELP)}</ul>
        </nav>
        <nav className={`${p.stack} ${s.col}`} aria-labelledby="foot-legal">
          <p className={p.eyebrow} id="foot-legal">{t(lang, 'footer.legal')}</p>
          <ul className={s.list}>
            {links(LEGAL)}
            <li><a href={ANPC_SAL_URL} rel="noopener">{t(lang, 'footer.anpc')}</a></li>
            <li><a href={SOL_URL} rel="noopener">{t(lang, 'footer.sol')}</a></li>
          </ul>
        </nav>
        <div className={`${p.stack} ${s.col}`}>
          <p className={p.eyebrow}>{t(lang, 'footer.company')}</p>
          <address className={s.addr}>
            <span translate="no">{COMPANY.name}</span><br />
            CUI {COMPANY.cui} · {COMPANY.regCom}<br />
            {COMPANY.address}<br />
            <a href={telHref()}>{CONTACTS.phone}</a><br />
            <a href={mailHref()}>{CONTACTS.email}</a>
          </address>
          {COMPANY_IS_REAL ? null : <p className={p.note}>{t(lang, 'sample')}</p>}
        </div>
        <LangSwitch lang={lang} label={t(lang, 'nav.lang')} />
      </div>
    </footer>
  )
}
