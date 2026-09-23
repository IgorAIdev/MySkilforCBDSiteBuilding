import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './SearchForm.module.css'
import { Icon } from './Icon.tsx'

export function SearchForm({ action, q, label, submit }: { action: string; q: string; label: string; submit: string }) {
  return (
    <form className={`${p.cluster} ${s.form}`} action={action} method="get" role="search">
      <label className={`${f.field} ${s.field}`}>
        <span className={f.label}>{label}</span>
        <input className={f.box} name="q" type="search" defaultValue={q} enterKeyHint="search" />
      </label>
      <button className={b.btn} data-voice="loud" type="submit"><Icon id="search" />{submit}</button>
    </form>
  )
}
