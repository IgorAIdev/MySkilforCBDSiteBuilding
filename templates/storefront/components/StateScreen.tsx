import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import b from '@/styles/btn.module.css'
import s from './StateScreen.module.css'
import type { Lang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'

type Kind = 'empty' | 'none' | 'unavailable' | 'not-found'

/* Пустой экран — почему пусто и куда дальше (слой 12, «Слова»). Источник
   не ответил — свой экран, не «пусто»: это разные состояния.

   Экран, который и есть вся страница (пустая корзина), стоит по центру со
   знаком в круге (`icon`), а шаг дальше — громкой кнопкой (`loud`): на
   экране это единственное действие. Внутри страницы (пустая полка) —
   строкой со стрелкой, как было. */
export function StateScreen({ level, kind, title, step, href, icon, loud = false }: { level: 1 | 2; kind: Kind; title: string; step: string; href: string; icon?: string; loud?: boolean }) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <section className={`${p.stack} ${s.state}`} data-kind={kind} data-center={icon ? '' : undefined} role={kind === 'unavailable' ? 'alert' : undefined}>
      {icon ? <span className={s.mark}><Icon id={icon} /></span> : null}
      <H className={s.title}>{title}</H>
      {loud
        ? <a className={b.btn} data-voice="loud" data-size="lg" href={href}>{step}</a>
        : <a className={go.go} href={href}>{step}<Icon id="arrow-right" /></a>}
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

/* «Не найдено» — один экран на оба пути: промах данных (app/[lang]/not-found.tsx,
   после гидратации) и адрес мимо дерева (app/global-not-found.tsx, с сервера). */
export function Missing({ lang }: { lang: Lang }) {
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="not-found" title={t(lang, 'notFound.title')} step={t(lang, 'notFound.step')} href={hrefFor(lang, { catalog: true })} />
    </main>
  )
}
