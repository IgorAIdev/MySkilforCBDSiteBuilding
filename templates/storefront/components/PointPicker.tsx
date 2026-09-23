import p from '@/styles/primitives.module.css'
import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './Checkout.module.css'
import type { PickupDetails } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'
import { StateScreen } from './StateScreen.tsx'
import { PointForm } from './PointForm.tsx'

type Action = (prev: FormState, form: FormData) => Promise<FormState>

/* Пункт выдачи ищется по городу: тысячи постаматов списком не отдаются.
   Точек мало (магазин продавца) — поиска нет, точки сразу. */
export function PointPicker({ details, action, permalink }: { details: PickupDetails; action: Action; permalink: string }) {
  return (
    <section className={p.stack} aria-labelledby="points-title">
      <h2 id="points-title" className={s.title}>{details.title}</h2>
      {details.search ? (
        <form className={s.search} action={details.search.action} method="get" role="search">
          <label className={f.field}>
            <span className={f.label}>{details.search.label}</span>
            <input className={f.box} name="city" defaultValue={details.search.value} autoComplete="address-level2" />
          </label>
          <button className={b.btn} type="submit">{details.search.submit}</button>
        </form>
      ) : null}
      {details.prompt ? <p className={p.muted}>{details.prompt}</p> : null}
      {details.empty ? <StateScreen level={2} kind="none" title={details.empty.title} step={details.empty.step} href={details.empty.href} /> : null}
      {details.points.length ? <PointForm details={details} action={action} permalink={permalink} /> : null}
    </section>
  )
}
