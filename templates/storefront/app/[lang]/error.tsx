'use client'
import { usePathname } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from '@/components/StateScreen.module.css'
import { langOfPath } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'

/* Экран сбоя — та же раскладка, что у экрана состояния (StateScreen): имя
   страницы ролью h1 (base.css), путь дальше под ним. Своя разметка только
   потому, что путь здесь — кнопка повтора, а не ссылка. */
export default function ErrorScreen({ reset }: { reset: () => void }) {
  const lang = langOfPath(usePathname())
  return (
    <main id="main" className={`${p.wrap} ${p.section}`} data-air="head">
      <section className={s.state} role="alert">
        <h1>{t(lang, 'error.title')}</h1>
        <div className={`${p.stack} ${s.ways}`}><button className={b.btn} type="button" onClick={reset}>{t(lang, 'error.retry')}</button></div>
      </section>
    </main>
  )
}
