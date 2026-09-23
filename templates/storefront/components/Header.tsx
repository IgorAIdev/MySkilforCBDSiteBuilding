import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from './Header.module.css'
import type { Lang } from '@/lib/locale.ts'
import type { Collection } from '@/lib/source/contract.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'

export function Header({ lang, collections }: { lang: Lang; collections: Collection[] }) {
  return (
    <header className={`${p.wrap} ${s.head}`}>
      <div className={`${p.cluster} ${s.bar}`}>
        <a className={s.logo} href={hrefFor(lang, { home: true })} translate="no">CBD</a>
        <nav className={`${p.rail} ${s.nav}`} aria-label={t(lang, 'nav.catalog')}>
          <a href={hrefFor(lang, { catalog: true })}>{t(lang, 'nav.catalog')}</a>
          {collections.map((c) => <a key={c.slug} href={hrefFor(lang, { category: c.slug })}>{c.name}</a>)}
        </nav>
        <a className={b.btn} data-size="sm" href={hrefFor(lang, { search: '' })} aria-label={t(lang, 'nav.search')}><Icon id="search" /></a>
      </div>
    </header>
  )
}
