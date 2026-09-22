import { createVersionedParser } from './core/snapshot.mjs'
import { variables, ramp } from './core/engine/scale.mjs'
import { roles, auditPalette } from './core/engine/palette.mjs'
import scales from './scale.json' with { type: 'json' }
export const project = { id: 'north-studio', name: 'Север · интерьерная мастерская', sourceRevision: 'portable-pilot-v1' }
export const defaults = { version: 2, bodySize: 18, headingSize: 64, width: 1200, palette: 'forest', layout: 'split' }
export const palettes = {
  forest: { paper: '#fcfbf9', ink: '#1f1e1c', accent: '#526b3d' },
  brass: { paper: '#fcfbf9', ink: '#1f1e1c', accent: '#9a7b3f' },
}
export const parse = createVersionedParser({ version: 2, supported: [1, 2], normalize: raw => {
  const design = { ...defaults, ...raw, version: 2 }
  if (raw.version === 1) design.headingSize = raw.titleSize ?? defaults.headingSize
  for (const [key, min, max] of [['bodySize', 16, 22], ['headingSize', 40, 80]]) if (!Number.isFinite(design[key]) || design[key] < min || design[key] > max) throw new Error('Invalid ' + key)
  if (![1040, 1200, 1360].includes(design.width) || !Object.hasOwn(palettes, design.palette) || !['split', 'stacked'].includes(design.layout)) throw new Error('Invalid selection')
  return Object.fromEntries(Object.keys(defaults).map(key => [key, design[key]]))
} })
export function designTokens(design) {
  const scale = structuredClone(Object.values(scales)[0])
  scale.тело = [16, design.bodySize]
  return { ...variables(scale), ...roles(palettes[design.palette], 'light'), '--site-width': design.width + 'px', '--site-title': ramp([40, design.headingSize], [560, 1080], 'rem') }
}
export const check = design => ({ findings: auditPalette(palettes[design.palette], 'light') })
export function describe(design, tokens) {
  return [
    '## Назначение и границы', '', 'Проверочный сайт вымышленной интерьерной мастерской. Содержимое демонстрационное. Форма заказа и публикация не подключены.', '',
    '## Выбранная композиция', '', 'Первый экран: ' + design.layout + '. Ширина: ' + design.width + ' CSS px.', '',
    '## Типографика', '', 'H1: 40-' + design.headingSize + ' px. Основной текст: 16-' + design.bodySize + ' px. Шрифт: системный sans-serif. Увеличение текста не отменяется.', '',
    '## Цвет, пространство и состояния', '', 'Одна светлая тема. Общий движок рассчитывает роли цвета, размеры, отступы, форму и состояния. Ненужная тёмная тема не добавлена.', '',
    '| Токен | Значение |', '| --- | --- |', ...Object.entries(tokens).map(([key, value]) => '| ' + key + ' | ' + value + ' |'), '',
    '## Поведение, адаптация и доступность', '', 'Семантические ссылки, клавиатура и видимый фокус. Текст свободной высоты. Панель немодальная; ширина выбирается числами, размер текста ползунком. Проверяются 375/1280 px и увеличенный основной шрифт.', '',
    '## Данные и интеграция', '', 'Компоненты принимают нейтральное содержимое. Отказ источника показывается явно и не превращается в пустой успешный результат. Ни Payload, ни Vendure для сайта услуг не обязательны.', '',
    '## Передача', '', 'Сохранены выбранная разметка, общие стили, токены и документы. Редактор, альтернативный вариант и исходники движков в копию не входят. Master не изменяется. Перед реальным выпуском нужны материалы и приёмка владельца.',
  ].join('\n')
}
