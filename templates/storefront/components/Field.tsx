import p from '@/styles/primitives.module.css'
import f from '@/styles/form.module.css'
import type { FieldRow, FieldView } from '@/lib/checkout-view.ts'
import type { FormState } from '@/lib/checkout-form.ts'

/* Поле — тройка «подпись, ввод, строка под ним» (styles/form.module.css):
   ошибка стоит у своего поля и связана с вводом `aria-describedby`. Выбор
   из закрытого списка рынка (уезд) — `select` той же коробкой, первым —
   пустой пункт «выберите»: без выбора форма его и просит. */
export function Field({ field, value, error, side = false }: { field: FieldView; value: string; error: string | null; side?: boolean }) {
  const id = `f-${field.name}`
  const say = `${id}-say`
  const common = {
    id, name: field.name, autoComplete: field.autoComplete, defaultValue: value, required: true,
    'aria-invalid': error ? ('true' as const) : undefined, 'aria-describedby': error ? say : undefined,
  }
  return (
    <div className={side ? `${f.field} ${p.aside}` : f.field}>
      <label className={f.label} htmlFor={id}>{field.label}</label>
      {field.options ? (
        <select className={f.pick} {...common}>
          <option value="">{field.options.none}</option>
          {field.options.values.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : (
        <input className={f.box} {...common} type={field.type} inputMode={field.inputMode ?? undefined} maxLength={field.max} />
      )}
      {error ? <p className={f.say} id={say} data-state="error">{error}</p> : null}
    </div>
  )
}

/* Ряды формы: одно поле — во всю меру формы; два — парой. Имя и фамилия —
   ровной парой (`switcher`): узкой коробке — столбиком, без шва. Короткое
   поле (индекс) — узкой колонкой рядом с длинным (`sidebar`): поле шириной
   с ожидаемый ввод (Baymard), а не полоса в девятьсот пикселей (разбор
   24.09.2026, O4). */
export function Fields({ rows, state }: { rows: FieldRow[]; state: FormState }) {
  const cell = (fd: FieldView, side = false) => <Field key={fd.name} field={fd} value={state?.values[fd.name] ?? fd.value} error={state?.errors[fd.name] ?? null} side={side} />
  return rows.map((row) => {
    const key = row.map((x) => x.name).join('-')
    if (row.length === 1) return cell(row[0])
    return row[0].short
      ? <div key={key} className={`${p.sidebar} ${f.pair}`}>{row.map((fd, i) => cell(fd, i === 0))}</div>
      : <div key={key} className={`${p.switcher} ${f.pair}`}>{row.map((fd) => cell(fd))}</div>
  })
}
