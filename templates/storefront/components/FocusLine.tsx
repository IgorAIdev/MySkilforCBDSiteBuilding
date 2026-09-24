'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/* Строка ошибки, на которую переходит фокус, когда она появилась («Choose an
   option» у групп выбора). Без скрипта фокус ставит браузер — атрибутом
   `autofocus` в разметке сервера. Со скриптом страница приходит мягким
   переходом, а React сам ставит фокус по `autoFocus` только органам формы
   (button, input, select, textarea) — строке текста его ставит эффект при
   появлении. Помнит компонент одно — свой узел. */
export function FocusLine({ id, className, children }: { id: string; className: string; children: ReactNode }) {
  const line = useRef<HTMLParagraphElement>(null)
  useEffect(() => { line.current?.focus() }, [])
  /* Исключение из jsx-a11y/no-autofocus — намеренное и одно: фокус ставится
     не при открытии страницы, а в ответ на нажатие «в корзину» без выбора, и
     без скрипта другого способа его поставить нет (И284). */
  // oxlint-disable-next-line jsx-a11y/no-autofocus
  return <p ref={line} className={className} id={id} data-state="error" tabIndex={-1} autoFocus>{children}</p>
}
