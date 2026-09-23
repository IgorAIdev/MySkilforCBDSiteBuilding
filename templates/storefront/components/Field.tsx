import f from '@/styles/form.module.css'
import type { FieldView } from '@/lib/checkout-view.ts'

/* Поле — тройка «подпись, ввод, строка под ним» (styles/form.module.css):
   ошибка стоит у своего поля и связана с вводом `aria-describedby`. */
export function Field({ field, value, error }: { field: FieldView; value: string; error: string | null }) {
  const id = `f-${field.name}`
  const say = `${id}-say`
  return (
    <div className={f.field}>
      <label className={f.label} htmlFor={id}>{field.label}</label>
      <input
        className={f.box} id={id} name={field.name} type={field.type} autoComplete={field.autoComplete}
        inputMode={field.inputMode ?? undefined} maxLength={field.max} defaultValue={value} required
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? say : undefined}
      />
      {error ? <p className={f.say} id={say} data-state="error">{error}</p> : null}
    </div>
  )
}
