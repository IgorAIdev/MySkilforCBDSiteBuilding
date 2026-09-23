'use client'
import { usePathname } from 'next/navigation'
import p from '@/styles/primitives.module.css'
import { DEFAULT_LANG, isLang } from '@/lib/locale.ts'
import { t } from '@/lib/i18n/index.ts'
import { hrefFor } from '@/lib/href.ts'
import { StateScreen } from '@/components/StateScreen.tsx'

/* «Не найдено» параметров не получает: язык — из первого сегмента адреса. */
export default function NotFound() {
  const segment = usePathname().split('/')[1] ?? ''
  const lang = isLang(segment) ? segment : DEFAULT_LANG
  return (
    <main id="main" className={p.wrap}>
      <StateScreen level={1} kind="not-found" title={t(lang, 'notFound.title')} step={t(lang, 'notFound.step')} href={hrefFor(lang, { catalog: true })} />
    </main>
  )
}
