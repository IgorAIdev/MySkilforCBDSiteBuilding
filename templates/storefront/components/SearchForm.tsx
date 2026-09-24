import b from '@/styles/btn.module.css'
import f from '@/styles/form.module.css'
import s from './SearchForm.module.css'
import { Icon } from './Icon.tsx'

/* Поле поиска — одно на сайт: страница поиска и «не найдено» берут его
   отсюда. Отправка — знаком внутри поля, тихой кнопкой (разбор 24.09.2026,
   Q3): громкая «Search» рядом с полем отнимала у него на телефоне треть
   строки и тратила на поле единственный громкий голос экрана. Поле — мерой
   строки, а не во всю коробку: поле на 1300px читается полосой, а не
   местом, куда вписать слово. На странице поле одно — `id` постоянный. */
export function SearchForm({ action, q, label, submit }: { action: string; q: string; label: string; submit: string }) {
  return (
    <form className={`${f.field} ${s.form}`} action={action} method="get" role="search">
      <label className={f.label} htmlFor="search-q">{label}</label>
      <div className={s.box}>
        <input id="search-q" className={`${f.box} ${s.input}`} name="q" type="search" defaultValue={q} enterKeyHint="search" />
        <button className={`${b.btn} ${s.go}`} data-size="sm" type="submit" aria-label={submit}><Icon id="search" /></button>
      </div>
    </form>
  )
}
