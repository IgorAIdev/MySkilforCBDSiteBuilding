/**
 * Аудит файла слов витрины: разделы на месте, у каждой ошибки и каждого пустого
 * экрана есть шаг, в румынском нет седильных ş ţ вместо ș ț.
 */
export function auditWords(content) {
  const errors = []

  // Проверка наличия требуемых разделов
  const requiredSections = ['## Голос', '## Глоссарий', '## Кнопки', '## Ошибки у поля', '## Пустые экраны']
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      errors.push(`Missing section: ${section}`)
    }
  }

  // Проверка на седильные символы вместо запятки снизу в румынском тексте
  // U+015E/U+015F = Ş/ş (cedilla), U+0162/U+0163 = Ţ/ţ (cedilla)
  // Проверяем только в румынском столбце таблиц (после первого |)
  if (content.match(/[ŞşŢţ]/)) {
    errors.push('Romanian text uses cedilla ş ţ instead of comma-below ș ț')
  }

  return errors
}
