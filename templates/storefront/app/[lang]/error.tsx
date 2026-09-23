'use client'
import { usePathname } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import s from '@/components/StateScreen.module.css'
import { DEFAULT_LANG, isLang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'

export default function ErrorScreen({ reset }: { reset: () => void }) {
  const segment = usePathname().split('/')[1] ?? ''
  const lang = isLang(segment) ? segment : DEFAULT_LANG
  return (
    <main id="main" className={p.wrap}>
      <section className={`${p.stack} ${s.state}`} role="alert">
        <h1 className={s.title}>{t(lang, 'error.title')}</h1>
        <div><button className={b.btn} type="button" onClick={reset}>{t(lang, 'error.retry')}</button></div>
      </section>
    </main>
  )
}
