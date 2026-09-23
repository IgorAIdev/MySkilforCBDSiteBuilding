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

export function Footer({ lang, docs }: { lang: Lang; docs: Doc[] }) {
  const links = (slugs: string[]) => docs.filter((d) => slugs.includes(d.slug)).map((d) => <li key={d.slug}><a href={hrefFor(lang, { doc: d.slug })}>{d.title}</a></li>)
  return (
    <footer className={`${p.wrap} ${p.sheet} ${p.section} ${s.foot}`} data-ground="paper">
      <div className={`${p.grid} ${s.cols}`}>
        <div className={p.stack}>
          <h2 className={s.h}>{t(lang, 'footer.help')}</h2>
          <ul className={s.list}>{links(HELP)}</ul>
        </div>
        <div className={p.stack}>
          <h2 className={s.h}>{t(lang, 'footer.legal')}</h2>
          <ul className={s.list}>
            {links(LEGAL)}
            <li><a href={ANPC_SAL_URL} rel="noopener">{t(lang, 'footer.anpc')}</a></li>
            <li><a href={SOL_URL} rel="noopener">{t(lang, 'footer.sol')}</a></li>
          </ul>
        </div>
        <div className={p.stack}>
          <h2 className={s.h}>{t(lang, 'footer.company')}</h2>
          <address className={s.addr}>
            <span translate="no">{COMPANY.name}</span><br />
            CUI {COMPANY.cui} · {COMPANY.regCom}<br />
            {COMPANY.address}<br />
            <a href={telHref()}>{CONTACTS.phone}</a><br />
            <a href={mailHref()}>{CONTACTS.email}</a>
          </address>
          {COMPANY_IS_REAL ? null : <p className={p.muted}>{t(lang, 'sample')}</p>}
        </div>
        <LangSwitch lang={lang} label={t(lang, 'nav.lang')} />
      </div>
    </footer>
  )
}
