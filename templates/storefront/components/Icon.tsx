/* Знак из листа основы (styles/icons.svg → public/icons.svg). Рисунок — в
   листе, имя — у кнопки или ссылки рядом (у безмолвной — aria-label). */
export function Icon({ id }: { id: string }) {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`/icons.svg#${id}`} />
    </svg>
  )
}
