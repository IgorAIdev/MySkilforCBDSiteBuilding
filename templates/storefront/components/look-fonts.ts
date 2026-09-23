import { IBM_Plex_Sans, Inter, Manrope, Source_Serif_4 } from 'next/font/google'

/* Шрифты панели «Вид» (lib/look.ts). Каждый — своей переменной, которую
   читает блок `[data-face]` в styles/storefront.css. Подмножества — латиница
   и расширенная (румынские ș ț ă î â, венгерские ő ű); веса — только те, что
   берут роли: 400 текст, 500 «Тонкий люкс», 600 заголовки и кнопки, 700
   заголовок страницы. `preload: false`: файл шрифта не просится, пока
   `[data-face]` его не назвал, — без выбора страница не тянет ничего сверх
   системного стека. У всех пяти цифры равной ширины есть (`tnum`,
   docs/decisions.md), `tabular-nums` тела их и просит.

   Значения — литералами в каждом вызове: next/font разбирает их при сборке
   и переменных не принимает. */
const manrope = Manrope({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], preload: false, display: 'swap', variable: '--f-manrope' })
const plex = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], preload: false, display: 'swap', variable: '--f-plex' })
const inter = Inter({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], preload: false, display: 'swap', variable: '--f-inter' })
/* Засечный — только заголовкам (пара «Source Serif 4 + IBM Plex Sans»). */
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], weight: ['600', '700'], preload: false, display: 'swap', variable: '--f-serif' })

/** Классы, объявляющие четыре переменные на `<html>`. */
export const LOOK_FONTS = [manrope, plex, inter, serif].map((f) => f.variable).join(' ')
