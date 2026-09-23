import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { OptionGroupLinks } from '@/lib/variant.ts'

/* Выбор — ссылками: адрес несёт вариант, Back возвращает прежний, работает
   без JavaScript. Сочетания нет — опция без адреса и помечена. */
export function VariantPicker({ groups }: { groups: OptionGroupLinks[] }) {
  return groups.map((g) => (
    <fieldset key={g.code} className={s.group}>
      <legend className={s.legend}>{g.name}</legend>
      <div className={p.seg}>
        {g.options.map((o) => o.href
          ? <a key={o.code} href={o.href} aria-current={o.current ? 'true' : undefined}>{o.name}</a>
          : <a key={o.code} aria-disabled="true">{o.name}</a>)}
      </div>
    </fieldset>
  ))
}
