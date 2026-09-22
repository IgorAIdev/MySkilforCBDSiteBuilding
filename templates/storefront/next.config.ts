import type { NextConfig } from 'next'

/* Язык — первый сегмент адреса; корень ведёт на основной язык рынка. */
const config: NextConfig = {
  async redirects() {
    return [{ source: '/', destination: '/ro', permanent: false }]
  },
}

export default config
