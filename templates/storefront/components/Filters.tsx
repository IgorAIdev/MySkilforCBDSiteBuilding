import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Filters.module.css'
import type { FiltersView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

export function Filters({ f: view }: { f: FiltersView }) {
  return (
    <form className={`${p.stack} ${p.pinned} ${s.filters}`} action={view.action} method="get" aria-label={view.title}>
      {view.facets.map((facet) => (
        <fieldset key={facet.code} className={`${f.rows} ${s.set}`}>
          <legend className={s.legend}>{facet.name}</legend>
          {facet.values.map((v) => (
            <label key={v.code} className={f.tick}>
              <input type="checkbox" name={`facet.${facet.code}`} value={v.code} defaultChecked={v.selected} />
              {v.name} <span className={p.muted}>({v.count})</span>
            </label>
          ))}
        </fieldset>
      ))}
      <label className={f.field}>
        <span className={f.label}>{view.sort.label}</span>
        <select className={f.pick} name="sort" defaultValue={view.sort.value}>
          {view.sort.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <button className={b.btn} data-voice="loud" data-wide type="submit">{view.apply}</button>
      <a className={b.btn} data-wide href={view.clear}><Icon id="x" />{view.clearLabel}</a>
    </form>
  )
}
