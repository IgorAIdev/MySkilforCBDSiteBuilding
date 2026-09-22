import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    // Vendored source is outside this fixture; resolve its dependencies here.
    alias: Object.fromEntries(['react', 'react-dom', 'radix-ui', 'class-variance-authority',
      'lucide-react', 'clsx', 'tailwind-merge'].map(name =>
      [name, fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url))])),
  },
})
