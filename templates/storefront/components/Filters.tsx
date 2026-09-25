import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Filters.module.css'
import type { FiltersView } from '@/lib/catalog-view.ts'
import { Icon } from './Icon.tsx'

/* Одна форма граней на обе ширины (разбор 24.09.2026, C1–C3, `firstScreen`).

   Широкая коробка: форма — строка раскрытий над полкой («Form ▾»,
   «Strength ▾»); каждое раскрытие — `popover` у своей кнопки, со своими
   галочками и кнопкой «применить». Колонки фильтров сбоку больше нет: при
   двух гранях она брала у полки четвёртую колонку, а первый экран кончался
   внутри одной колонки (check:detect, `firstScreen`, 1440: полка 147 % окна
   при панели в 77 %).

   Узкая коробка: формы в строке нет — её открывает кнопка «Фильтры», и
   форма становится шторкой верхнего слоя: грани в ней стоят столбиком,
   без раскрытий, «применить» и «сбросить» приклеены к её низу. Escape и
   нажатие мимо закрывают сами (правило 8).

   Какой вид сейчас — решает коробка органов полки (Filters.module.css), а
   не разметка: разметка одна. Порядок — не в форме: он ссылками
   (SortMenu.tsx) и берёт то же раскрытие (`drop`). */
export function Filters({ f: view }: { f: FiltersView }) {
  return (
    <>
      {view.facets.length ? (
        <button className={`${b.btn} ${s.open}`} type="button" popoverTarget="filters">
          <Icon id="sliders-horizontal" />{view.open}
        </button>
      ) : null}
      <form id="filters" popover="auto" className={`${p.cluster} ${s.filters}`} action={view.action} method="get" aria-label={view.title}>
        <div className={s.head}>
          <h2>{view.title}</h2>
          <button className={b.btn} data-size="sm" type="button" popoverTarget="filters" popoverTargetAction="hide" aria-label={view.close}><Icon id="x" /></button>
        </div>
        {view.facets.map((facet) => (
          <div key={facet.code} className={s.facet}>
            <button className={`${b.btn} ${s.trigger}`} type="button" popoverTarget={facet.id}>{facet.label}<Icon id="chevron-down" /></button>
            <fieldset id={facet.id} popover="auto" className={`${p.menu} ${s.drop} ${s.values}`}>
              <legend className={s.legend}>{facet.name}</legend>
              <div className={`${p.grid} ${s.ticks}`}>
                {facet.values.map((v) => (
                  <label key={v.code} className={f.tick}>
                    <input type="checkbox" name={`facet.${facet.code}`} value={v.code} defaultChecked={v.selected} />
                    <span>{v.name} <span className={p.muted}>({v.count})</span></span>
                  </label>
                ))}
              </div>
              <button className={`${b.btn} ${s.apply}`} data-wide type="submit">{view.apply}</button>
            </fieldset>
          </div>
        ))}
        <div className={s.actions}>
          <button className={b.btn} data-wide type="submit">{view.apply}</button>
          {view.clear ? <a className={b.btn} data-wide href={view.clear.href}><Icon id="x" />{view.clear.label}</a> : null}
        </div>
      </form>
    </>
  )
}
