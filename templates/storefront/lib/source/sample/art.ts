/* Снимок-образец: нарисованный флакон цвета товара с пометкой «sample».
   Настоящие снимки — от заказчика; этот не выдаёт себя за фотографию. */
export function bottle(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="hsl(${hue} 28% 90%)"/><rect x="340" y="170" width="120" height="60" rx="10" fill="hsl(${hue} 22% 28%)"/><rect x="290" y="230" width="220" height="400" rx="36" fill="hsl(${hue} 30% 40%)"/><text x="400" y="450" font-family="sans-serif" font-size="44" fill="#fff" text-anchor="middle">${label}</text><text x="400" y="740" font-family="sans-serif" font-size="28" fill="hsl(${hue} 20% 35%)" text-anchor="middle">sample</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
