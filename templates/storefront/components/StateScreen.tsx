import type { ReactNode } from 'react'
import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import b from '@/styles/btn.module.css'
import s from './StateScreen.module.css'
import type { Lang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { Icon } from './Icon.tsx'
import { SearchForm } from './SearchForm.tsx'

type Kind = 'empty' | 'none' | 'unavailable' | 'not-found'

/* Пустой экран — почему пусто и куда дальше (слой 12, «Слова»). Источник
   не ответил — свой экран, не «пусто»: это разные состояния.

   Заголовок набирает уровень, а не экран: экран-страница (`level` 1) — имя
   страницы, той же ролью, что у каждого h1 сайта; экран внутри страницы
   (пустая полка) — заголовок раздела. Роль у элемента (base.css, «Лестница
   заголовков»); «Страница не найдена» стояла ролью h2 при уровне h1 — самым
   мелким именем страницы на сайте (разбор 24.09.2026, X1).

   Под заголовком — пути дальше одной группой (`ways`): что передал зовущий
   (поле поиска у «не найдено») и шаг. Экран, который и есть вся страница
   (пустая корзина), стоит по центру со знаком в круге (`icon`), а шаг —
   громкой кнопкой (`loud`): на экране это единственное действие. */
export function StateScreen({ level, kind, title, step, href, icon, loud = false, children }: { level: 1 | 2; kind: Kind; title: string; step: string; href: string; icon?: string; loud?: boolean; children?: ReactNode }) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <section className={s.state} data-kind={kind} data-center={icon ? '' : undefined} role={kind === 'unavailable' ? 'alert' : undefined}>
      {icon ? <span className={s.mark}><Icon id={icon} /></span> : null}
      <H>{title}</H>
      <div className={`${p.stack} ${s.ways}`}>
        {children}
        {loud
          ? <a className={b.btn} data-voice="loud" data-size="lg" href={href}>{step}</a>
          : <a className={go.go} href={href}>{step}<Icon id="arrow-right" /></a>}
      </div>
    </section>
  )
}

export function Unavailable({ lang }: { lang: Lang }) {
  return (
    <main id="main" className={`${p.wrap} ${p.section}`} data-air="head">
      <StateScreen level={1} kind="unavailable" title={t(lang, 'unavailable.title')} step={t(lang, 'unavailable.step')} href={hrefFor(lang, { home: true })} />
    </main>
  )
}

/* «Не найдено» — один экран на оба пути: промах данных (app/[lang]/not-found.tsx,
   после гидратации) и адрес мимо дерева (app/global-not-found.tsx, с сервера).
   Выход — не одна ссылка: адрес сломан, а что искали, человек знает, —
   поле поиска первым путём, «ко всем товарам» — вторым (разбор, E1). Поле —
   тот же орган, что на странице поиска: один орган, одно место. */
export function Missing({ lang }: { lang: Lang }) {
  return (
    <main id="main" className={`${p.wrap} ${p.section}`} data-air="head">
      <StateScreen level={1} kind="not-found" title={t(lang, 'notFound.title')} step={t(lang, 'notFound.step')} href={hrefFor(lang, { catalog: true })}>
        <SearchForm action={hrefFor(lang, { search: '' })} q="" label={t(lang, 'search.label')} submit={t(lang, 'search.submit')} />
      </StateScreen>
    </main>
  )
}
