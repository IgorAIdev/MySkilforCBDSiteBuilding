import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Filters.module.css'
import type { FiltersView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

/* Одна форма на обе ширины. На широком контейнере она колонка рядом с полкой;
   на узком её в потоке нет — она шторка верхнего слоя (`popover`), и
   открывает её кнопка по `popovertarget`, без скрипта: Escape и щелчок мимо
   браузер приносит сам (правило 8). Какой вид сейчас — решает контейнер
   каталога (Filters.module.css), а не разметка: разметка одна. */
export function Filters({ f: view }: { f: FiltersView }) {
  return (
    <>
      <button className={`${b.btn} ${s.open}`} type="button" popoverTarget="filters">
        <Icon id="sliders-horizontal" />{view.chosen ? `${view.open} (${view.chosen})` : view.open}
      </button>
      <form id="filters" popover="auto" className={`${p.stack} ${p.pinned} ${s.filters}`} action={view.action} method="get" aria-label={view.title}>
        <div className={s.head}>
          <h2 className={s.title}>{view.title}</h2>
          <button className={b.btn} data-size="sm" type="button" popoverTarget="filters" popoverTargetAction="hide" aria-label={view.close}><Icon id="x" /></button>
        </div>
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
    </>
  )
}
