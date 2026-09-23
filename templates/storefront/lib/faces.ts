import { IBM_Plex_Sans, Inter, Manrope, Source_Serif_4 } from 'next/font/google'

/* Шрифты вида — все кандидаты собраны в сайт заранее, чтобы смена шрифта в
   источнике (content().look()) не требовала сборки. `preload: false`: браузер
   не просит файл, пока `[data-face]` его не назвал, — грузится только
   стоящий шрифт, у системного — ни одного. Подмножества — латиница и
   расширенная (румынские ș ț ă î â, венгерские ő ű); веса — те, что берут
   роли: 400 текст, 500 «Тонкий люкс» и полки шапки, 600 заголовки и
   кнопки, 700 заголовок страницы. У всех цифры равной ширины есть (`tnum`,
   docs/decisions.md). Переменные `--f-*` читают блоки `[data-face]` в
   styles/storefront.css. Значения — литералами: next/font разбирает их при
   сборке и переменных не принимает. */
const manrope = Manrope({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], preload: false, display: 'swap', variable: '--f-manrope' })
const plex = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], preload: false, display: 'swap', variable: '--f-plex' })
const inter = Inter({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], preload: false, display: 'swap', variable: '--f-inter' })
/* Засечный — только заголовкам (пара «Source Serif 4 + IBM Plex Sans»). */
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], weight: ['600', '700'], preload: false, display: 'swap', variable: '--f-serif' })

/** Шрифты, которые сайт умеет ставить; первый — умолчание. */
export const FACE_IDS = ['system', 'manrope', 'plex', 'inter', 'serif'] as const

/** Классы, объявляющие переменные шрифтов на `<html>`. */
export const FACE_VARS = [manrope, plex, inter, serif].map((f) => f.variable).join(' ')
