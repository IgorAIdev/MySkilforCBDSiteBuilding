/* Лист знаков основы (styles/icons.svg) отдаётся сайтом как /icons.svg:
   знак зовут <use href="/icons.svg#id">. Копия, а не второй лист: источник
   один — выпуск `npm run icons` набора. */
import { copyFileSync, mkdirSync } from 'node:fs'
mkdirSync('public', { recursive: true })
copyFileSync('styles/icons.svg', 'public/icons.svg')
