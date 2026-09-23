/* Варианты панели «Look» — public/look/options.json, при сборке и запуске.

   Панель — отдельный контейнер (public/look/): сайт у неё ничего не берёт, а
   она у сайта — только роли стилей и атрибуты на <html>. Варианты кнопок —
   каталог styles/buttons.json и его замер на палитре сайта тем же кодом,
   что выпускает styles/buttons.css (`availability`, tools/buttons.mjs), —
   здесь, в сборке, а не на сервере страниц. Панели нет (снята
   `npm run look:remove`) — выпускать нечего, и сборка идёт дальше. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

if (existsSync('public/look')) {
  const { availability } = await import('../tools/buttons.mjs')
  const styles = JSON.parse(readFileSync('styles/buttons.json', 'utf8'))
  const { off } = availability(styles, JSON.parse(readFileSync('styles/palette.json', 'utf8')))
  /* Имена стилей в панели — по-английски; ключ каталога остаётся значением. */
  const TITLES = {
    'Пилюля': 'Pill', 'Строгий угол': 'Sharp corner', 'Мягкий тон': 'Soft tone', 'Контур': 'Outline',
    'Заглавные': 'Capitals', 'С тенью': 'Shadow', 'Тонкий люкс': 'Quiet luxury', 'Аптека': 'Pharmacy',
    'Округлый': 'Rounded', 'Плотный': 'Dense',
  }
  const buttons = Object.keys(styles).map((name) => {
    const f = off[name]?.[0]
    return { name, title: TITLES[name] ?? name, on: !f, why: f ? `Not available on this palette: contrast ${f.got}, needs ${f.need}` : '' }
  })
  /* Шрифты: id — FACE_IDS в lib/faces.ts и блоки [data-face] в
     styles/storefront.css (все собраны в сайт, грузится стоящий). */
  const NAMES = { system: 'System', manrope: 'Manrope', plex: 'IBM Plex Sans', inter: 'Inter', serif: 'Source Serif 4 + IBM Plex Sans' }
  const ids = [...(readFileSync('lib/faces.ts', 'utf8').match(/FACE_IDS = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1])
  const faces = ids.map((id) => ({ id, name: NAMES[id] ?? id }))
  /* Шапки: id — HEADERS в lib/look.ts. */
  const headers = [
    { id: 'classic', name: 'Classic', line: 'A bar with the categories beside the logo' },
    { id: 'search', name: 'Search first', line: 'Shop promise on top, a wide search field, categories below' },
    { id: 'boutique', name: 'Boutique', line: 'Centred logo, a Shop panel with pictures' },
  ]
  writeFileSync('public/look/options.json', JSON.stringify({ faces, buttons, headers }, null, 2) + '\n')
}
