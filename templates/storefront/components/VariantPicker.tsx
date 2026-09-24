import f from '@/styles/form.module.css'
import p from '@/styles/primitives.module.css'
import s from './ProductView.module.css'
import type { OptionGroupLinks } from '@/lib/variant.ts'
import { FocusLine } from './FocusLine.tsx'

/* Выбор — ссылками: адрес несёт вариант, Back возвращает прежний, работает
   без JavaScript. Сочетания нет — опция без адреса и помечена.

   `error` — «Choose an option» после нажатия «в корзину» без выбора: строка
   ошибки у ПЕРВОЙ группы, где ничего не выбрано, под её опциями (как у поля
   формы, styles/form.module.css), группа описана ею. Фокус переходит на эту
   строку и без скрипта, и после мягкого перехода (FocusLine). */
export function VariantPicker({ groups, error }: { groups: OptionGroupLinks[]; error: string | null }) {
  const open = error ? groups.find((g) => !g.options.some((o) => o.current)) ?? groups[0] : null
  return groups.map((g) => (
    <fieldset key={g.code} className={s.group} aria-describedby={g === open ? 'choose-error' : undefined}>
      <legend className={s.legend}>{g.name}</legend>
      <div className={p.seg}>
        {g.options.map((o) => o.href
          ? <a key={o.code} href={o.href} aria-current={o.current ? 'true' : undefined}>{o.name}</a>
          : <a key={o.code} aria-disabled="true">{o.name}</a>)}
      </div>
      {g === open ? <FocusLine className={`${f.say} ${s.choose}`} id="choose-error">{error}</FocusLine> : null}
    </fieldset>
  ))
}
