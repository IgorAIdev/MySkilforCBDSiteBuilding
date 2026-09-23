import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './StateScreen.module.css'
import type { Lang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'

type Kind = 'empty' | 'none' | 'unavailable' | 'not-found'

/* Пустой экран — почему пусто и куда дальше (слой 12, «Слова»). Источник
   не ответил — свой экран, не «пусто»: это разные состояния. */
export function StateScreen({ level, kind, title, step, href }: { level: 1 | 2; kind: Kind; title: string; step: string; href: string }) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <section className={`${p.stack} ${s.state}`} data-kind={kind} role={kind === 'unavailable' ? 'alert' : undefined}>
      <H className={s.title}>{title}</H>
      <a className={go.go} href={href}>{step}<Icon id="arrow-right" /></a>
    </section>
  )
}

export function Unavailable({ lang }: { lang: Lang }) {
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="unavailable" title={t(lang, 'unavailable.title')} step={t(lang, 'unavailable.step')} href={hrefFor(lang, { home: true })} />
    </main>
  )
}
