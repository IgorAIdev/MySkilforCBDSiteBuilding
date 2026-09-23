/* Рисунки-образцы: товар, полка и герой. Настоящие снимки — от заказчика;
   эти не выдают себя за фотографию — на каждом пометка «sample». Рисунок
   детерминирован: те же данные дают тот же SVG, байт в байт.

   Язык рисунка один на все три — сцена героя (`scene`): тонированный фон со
   светом справа, пол, предмет с тенью. Предметы — флакон с пипеткой
   (стекло с бликом, резиновая груша, бумажная этикетка с коротким текстом
   товара), банка капсул, баночка крема. */

const svg = (w: number, h: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`
const r = (n: number) => Math.round(n * 10) / 10
const rect = (x: number, y: number, w: number, h: number, rx: number, fill: string) =>
  `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${r(rx)}" fill="${fill}"/>`
/* Кегль этикетки — по длине подписи: «balsam» и «10 %» лежат на одной ширине бумаги. */
const text = (x: number, y: number, size: number, width: number, fill: string, value: string) => {
  const fit = Math.min(size, width / Math.max(1, value.length * 0.62))
  return `<text x="${r(x)}" y="${r(y)}" font-family="sans-serif" font-weight="700" font-size="${r(fit)}" fill="${fill}" text-anchor="middle">${value}</text>`
}

/* Стекло: тёмные края, светлая середина со сдвигом влево — объём и свет справа. */
const glass = (id: string, hue: number) =>
  `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">`
  + `<stop offset="0" stop-color="hsl(${hue} 45% 14%)"/><stop offset=".22" stop-color="hsl(${hue} 50% 34%)"/>`
  + `<stop offset=".5" stop-color="hsl(${hue} 48% 27%)"/><stop offset=".85" stop-color="hsl(${hue} 50% 19%)"/>`
  + `<stop offset="1" stop-color="hsl(${hue} 45% 11%)"/></linearGradient>`
/* Белый пластик банки капсул и металл крышки крема — та же схема света. */
const matte = (id: string, hue: number, light: number) =>
  `<linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">`
  + `<stop offset="0" stop-color="hsl(${hue} 12% ${light - 22}%)"/><stop offset=".3" stop-color="hsl(${hue} 14% ${light + 6}%)"/>`
  + `<stop offset=".7" stop-color="hsl(${hue} 12% ${light - 4}%)"/><stop offset="1" stop-color="hsl(${hue} 10% ${light - 26}%)"/></linearGradient>`

/** Предмет: середина `x`, пол `floor`, масштаб `k` (1 — рост в кадре 800×800). */
type Thing = { x: number; floor: number; k: number; hue: number; label: string; id: string }

const shadow = ({ x, floor, k, hue }: Thing, w: number) =>
  `<ellipse cx="${r(x + w * 0.18 * k)}" cy="${r(floor + 4 * k)}" rx="${r(w * 0.72 * k)}" ry="${r(16 * k)}" fill="hsl(${hue} 30% 10% / .28)"/>`

const paw = (x: number, y: number, k: number, fill: string) =>
  `<ellipse cx="${r(x)}" cy="${r(y + 8 * k)}" rx="${r(16 * k)}" ry="${r(12 * k)}" fill="${fill}"/>`
  + [-20, -7, 7, 20].map((dx, i) => `<circle cx="${r(x + dx * k)}" cy="${r(y - (i === 0 || i === 3 ? 6 : 14) * k)}" r="${r(6 * k)}" fill="${fill}"/>`).join('')

/** Флакон с пипеткой: стекло, горло, воротник и груша, бумажная этикетка. */
function dropper(t: Thing, pet = false): { defs: string; body: string } {
  const { x, floor: f, k, hue, label, id } = t
  const ink = `hsl(${hue} 35% 20%)`
  return {
    defs: glass(`g${id}`, hue),
    body: shadow(t, 200)
      + rect(x - 100 * k, f - 300 * k, 200 * k, 300 * k, 38 * k, `url(#g${id})`)
      + rect(x - 80 * k, f - 282 * k, 15 * k, 236 * k, 7 * k, 'hsl(0 0% 100% / .26)')
      + rect(x - 36 * k, f - 330 * k, 72 * k, 36 * k, 6 * k, `hsl(${hue} 40% 12%)`)
      + rect(x - 52 * k, f - 392 * k, 104 * k, 66 * k, 10 * k, 'hsl(30 6% 13%)')
      + [0, 1, 2].map((i) => rect(x - 52 * k, f - (380 - i * 18) * k, 104 * k, 3 * k, 1, 'hsl(30 6% 22%)')).join('')
      + rect(x - 31 * k, f - 502 * k, 62 * k, 120 * k, 31 * k, 'hsl(30 6% 9%)')
      + rect(x - 20 * k, f - 486 * k, 8 * k, 72 * k, 4 * k, 'hsl(0 0% 100% / .16)')
      + rect(x - 80 * k, f - 232 * k, 160 * k, 150 * k, 6 * k, 'hsl(40 33% 95%)')
      + rect(x - 80 * k, f - 232 * k, 160 * k, 16 * k, 6 * k, `hsl(${hue} 42% 38%)`)
      + text(x, f - 158 * k, 46 * k, 140 * k, ink, label)
      + (pet
        ? paw(x, f - 118 * k, k, `hsl(${hue} 30% 40%)`)
        : rect(x - 50 * k, f - 128 * k, 100 * k, 4 * k, 2, `hsl(${hue} 15% 72%)`) + rect(x - 36 * k, f - 114 * k, 72 * k, 4 * k, 2, `hsl(${hue} 15% 72%)`)),
  }
}

/** Банка: капсулы — высокая, белый пластик и крышка марки; крем — низкая,
 *  стекло и металлическая крышка. */
function jar(t: Thing, cream = false): { defs: string; body: string } {
  const { x, floor: f, k, hue, label, id } = t
  const [w, h, lid] = cream ? [300, 132, 70] : [250, 220, 62]
  const ink = `hsl(${hue} 35% 20%)`
  const bodyFill = cream ? `url(#g${id})` : `url(#m${id})`
  const lidFill = cream ? `url(#m${id})` : `hsl(${hue} 38% 28%)`
  const ridges = cream ? '' : Array.from({ length: 9 }, (_, i) => rect(x - (w / 2 + 4) * k + (14 + i * 30) * k, f - (h + lid - 6) * k, 3 * k, (lid - 14) * k, 1, `hsl(${hue} 30% 20%)`)).join('')
  const labelH = cream ? 76 : 124
  const labelTop = cream ? h - 30 : h - 50
  return {
    defs: (cream ? glass(`g${id}`, hue) + matte(`m${id}`, 40, 86) : matte(`m${id}`, hue, 90)),
    body: shadow(t, w)
      + rect(x - w / 2 * k, f - h * k, w * k, h * k, (cream ? 26 : 32) * k, bodyFill)
      + rect(x - (w / 2 - 18) * k, f - (h - 16) * k, 13 * k, (h - 40) * k, 6 * k, 'hsl(0 0% 100% / .3)')
      + rect(x - (w / 2 + 10) * k, f - (h + lid - 8) * k, (w + 20) * k, lid * k, 14 * k, lidFill)
      + ridges
      + rect(x - (w / 2 - 26) * k, f - labelTop * k, (w - 52) * k, labelH * k, 6 * k, 'hsl(40 33% 95%)')
      + rect(x - (w / 2 - 26) * k, f - labelTop * k, (w - 52) * k, 14 * k, 6 * k, `hsl(${hue} 42% 38%)`)
      + text(x, f - (labelTop - labelH / 2 - 22) * k, 44 * k, (w - 80) * k, ink, label),
  }
}

/** Капсула на полу: две половины оболочки, лёгкий наклон. */
const capsule = (x: number, y: number, k: number, turn: number, hue: number) =>
  `<g transform="rotate(${turn} ${r(x)} ${r(y)})">`
  + rect(x - 44 * k, y - 17 * k, 88 * k, 34 * k, 17 * k, 'hsl(40 30% 92%)')
  + rect(x - 44 * k, y - 17 * k, 50 * k, 34 * k, 17 * k, `hsl(${hue} 55% 42%)`)
  + rect(x - 10 * k, y - 17 * k, 16 * k, 34 * k, 0, `hsl(${hue} 55% 42%)`)
  + rect(x - 34 * k, y - 11 * k, 30 * k, 5 * k, 2, 'hsl(0 0% 100% / .35)')
  + '</g>'

/** Фон сцены: тон, свет справа, пол, пометка «sample». */
const stage = (w: number, h: number, floor: number, hue: number, things: { defs: string; body: string }[], extra = '') =>
  svg(w, h,
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 26% 90%)"/><stop offset="1" stop-color="hsl(${hue} 22% 80%)"/></linearGradient>`
    + `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 18% 76%)"/><stop offset="1" stop-color="hsl(${hue} 20% 66%)"/></linearGradient>`
    + `<radialGradient id="lt" cx=".72" cy=".22" r=".62"><stop offset="0" stop-color="hsl(48 70% 98% / .85)"/><stop offset="1" stop-color="hsl(48 70% 98% / 0)"/></radialGradient>`
    + things.map((t) => t.defs).join('') + '</defs>'
    + `<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="${h}" fill="url(#lt)"/>`
    + `<rect y="${floor}" width="${w}" height="${h - floor}" fill="url(#fl)"/>`
    + things.map((t) => t.body).join('') + extra
    + `<text x="${w / 2}" y="${h - 26}" font-family="sans-serif" font-size="26" fill="hsl(${hue} 15% 42%)" text-anchor="middle">sample</text>`)

/** Снимок-образец товара по его полке: масло — флакон с пипеткой, капсулы
 *  — банка, косметика — баночка крема, для животных — флакон с лапой. */
export function productArt(category: string, hue: number, label: string): string {
  const at = { x: 400, floor: 650, hue, label, id: 'p' }
  if (category === 'capsule') {
    const caps = capsule(170, 676, 1, -18, hue) + capsule(630, 684, 1, 12, hue)
    return stage(800, 800, 650, hue, [jar({ ...at, k: 1.25 })], caps)
  }
  if (category === 'cosmetice') return stage(800, 800, 650, hue, [jar({ ...at, k: 1.4 }, true)])
  return stage(800, 800, 650, hue, [dropper({ ...at, k: 1.1 }, category === 'animale')])
}

/** Кадр полки 4 : 3 — несколько предметов этой полки на одном полу. */
export function categoryArt(slug: string): string {
  const f = 470
  if (slug === 'capsule') {
    return stage(800, 600, f, 32, [jar({ x: 330, floor: f, k: 0.95, hue: 30, label: '25 mg', id: 'a' }), jar({ x: 560, floor: f + 10, k: 0.72, hue: 45, label: '10 mg', id: 'b' })],
      capsule(170, f + 40, 0.8, -14, 30) + capsule(700, f + 48, 0.8, 18, 45))
  }
  if (slug === 'cosmetice') {
    return stage(800, 600, f, 345, [dropper({ x: 560, floor: f, k: 0.66, hue: 300, label: 'ser', id: 'a' }), jar({ x: 330, floor: f + 12, k: 0.95, hue: 20, label: 'crema', id: 'b' }, true)])
  }
  if (slug === 'animale') {
    return stage(800, 600, f, 90, [dropper({ x: 300, floor: f, k: 0.78, hue: 90, label: 'dog', id: 'a' }, true), dropper({ x: 540, floor: f + 10, k: 0.62, hue: 60, label: 'cat', id: 'b' }, true)])
  }
  return stage(800, 600, f, 145, [
    dropper({ x: 250, floor: f, k: 0.62, hue: 190, label: '10 %', id: 'a' }),
    dropper({ x: 420, floor: f + 8, k: 0.78, hue: 145, label: 'CBD', id: 'b' }),
    dropper({ x: 590, floor: f, k: 0.62, hue: 250, label: '20 %', id: 'c' }),
  ])
}

/* Предмет сцены: флакон (горлышко и тело) или баночка крема (крышка шире
   горла). Координаты — по полу сцены: `x` — середина, `w`×`h` — тело. */
type Piece = { x: number; w: number; h: number; hue: number; label: string; lidded?: boolean }
const FLOOR = 760
const piece = ({ x, w, h, hue, label, lidded }: Piece): string => {
  const top = FLOOR - h
  const neck = lidded
    ? `<rect x="${x - w / 2 - 6}" y="${top - 44}" width="${w + 12}" height="52" rx="14" fill="hsl(${hue} 20% 26%)"/>`
    : `<rect x="${x - w * 0.2}" y="${top - h * 0.16}" width="${w * 0.4}" height="${h * 0.18}" rx="8" fill="hsl(${hue} 20% 24%)"/>`
  return `<ellipse cx="${x + w * 0.35}" cy="${FLOOR + 6}" rx="${w * 0.75}" ry="14" fill="hsl(160 30% 6% / .45)"/>`
    + neck
    + `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" rx="${Math.min(28, w * 0.18)}" fill="hsl(${hue} 32% 42%)"/>`
    + `<rect x="${x - w / 2 + w * 0.12}" y="${top + h * 0.1}" width="${w * 0.1}" height="${h * 0.7}" rx="6" fill="hsl(${hue} 40% 70% / .35)"/>`
    + `<rect x="${x - w * 0.36}" y="${top + h * 0.38}" width="${w * 0.72}" height="${Math.min(90, h * 0.26)}" rx="8" fill="hsl(${hue} 30% 92%)"/>`
    + `<text x="${x}" y="${top + h * 0.38 + Math.min(90, h * 0.26) / 2 + 11}" font-family="sans-serif" font-size="${Math.round(Math.min(30, w * 0.2))}" fill="hsl(${hue} 30% 26%)" text-anchor="middle">${label}</text>`
}

/* Сцена героя — широкий кадр-образец: несколько флаконов на тонированном
   полу, свет справа, левый нижний угол тёмный — туда ложится текст героя.
   Предметы собраны в правой половине (58–88 % ширины): на широком окне их
   не закрывает текст, на узком кадр кадрируется вокруг них
   (`object-position` героя). Пометка «sample» — как у флаконов, под
   предметами, где её не срезает кадрирование: это рисунок, а не
   фотография; настоящий снимок героя — от заказчика. */
export function scene(): string {
  const items: Piece[] = [
    { x: 960, w: 150, h: 330, hue: 190, label: '10 %' },
    { x: 1130, w: 190, h: 430, hue: 145, label: 'CBD' },
    { x: 1300, w: 150, h: 300, hue: 30, label: '25 mg' },
    { x: 1420, w: 190, h: 120, hue: 20, label: 'crema', lidded: true },
  ]
  const body = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">`
    + `<defs><linearGradient id="w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="hsl(160 22% 14%)"/><stop offset=".55" stop-color="hsl(150 20% 26%)"/><stop offset="1" stop-color="hsl(140 24% 40%)"/></linearGradient>`
    + `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(150 18% 30%)"/><stop offset="1" stop-color="hsl(160 22% 12%)"/></linearGradient>`
    + `<radialGradient id="l" cx=".72" cy=".42" r=".42"><stop offset="0" stop-color="hsl(48 60% 80% / .55)"/><stop offset="1" stop-color="hsl(48 60% 80% / 0)"/></radialGradient></defs>`
    + `<rect width="1600" height="1000" fill="url(#w)"/>`
    + `<rect width="1600" height="1000" fill="url(#l)"/>`
    + `<circle cx="1180" cy="430" r="300" fill="hsl(48 40% 70% / .18)"/>`
    + `<rect y="${FLOOR}" width="1600" height="${1000 - FLOOR}" fill="url(#f)"/>`
    + items.map(piece).join('')
    + `<text x="1180" y="940" font-family="sans-serif" font-size="28" fill="hsl(150 20% 70%)" text-anchor="middle">sample</text>`
    + `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(body)}`
}
