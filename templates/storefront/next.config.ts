import type { NextConfig } from 'next'

/* Язык — первый сегмент адреса; корень ведёт на основной язык рынка.
   `globalNotFound` — адрес мимо дерева маршрутов получает свою страницу
   app/global-not-found.tsx: корневой макет витрины — `[lang]`, и собрать
   «не найдено» из макета и not-found.tsx корня нечем (И257). */
const config: NextConfig = {
  experimental: { globalNotFound: true },
  async redirects() {
    return [{ source: '/', destination: '/en', permanent: false }]
  },
}

export default config
