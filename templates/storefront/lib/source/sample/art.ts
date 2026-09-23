/* Снимок-образец: нарисованный флакон цвета товара с пометкой «sample».
   Настоящие снимки — от заказчика; этот не выдаёт себя за фотографию. */
export function bottle(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="hsl(${hue} 28% 90%)"/><rect x="340" y="170" width="120" height="60" rx="10" fill="hsl(${hue} 22% 28%)"/><rect x="290" y="230" width="220" height="400" rx="36" fill="hsl(${hue} 30% 40%)"/><text x="400" y="450" font-family="sans-serif" font-size="44" fill="hsl(${hue} 30% 96%)" text-anchor="middle">${label}</text><text x="400" y="740" font-family="sans-serif" font-size="28" fill="hsl(${hue} 20% 35%)" text-anchor="middle">sample</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/* Предмет сцены: флакон (горлышко и тело) или баночка крема (крышка шире
   горла). Координаты — по полу сцены: `x` — середина, `w`×`h` — тело. */
type Piece = { x: number; w: number; h: number; hue: number; label: string; jar?: boolean }
const FLOOR = 760
const piece = ({ x, w, h, hue, label, jar }: Piece): string => {
  const top = FLOOR - h
  const neck = jar
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
    { x: 1420, w: 190, h: 120, hue: 20, label: 'crema', jar: true },
  ]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">`
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
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
