/*
 * Лист палитры: ВСЕ краски набора, обе темы, каждая подписана работой.
 *
 * Заведено по вопросу заказчика 20.09.2026: «в палитре сколько цветов ты
 * вообще палитру показывал?» — и вопрос был точный. На стенде выбора стояло
 * 14 переменных из 45: он выбирал набор по трети палитры, а две трети
 * машина вывела, и он их не видел ни разу. Это расходится с CLAUDE.md,
 * «Выбор показывается глазами, а не списком»: показать нужно ВСЁ, чем
 * покрашен сайт, а не то, что поместилось на карточку.
 *
 *   node tools/palette-sheet.mjs [--set "Имя"] [куда.html]
 *
 * Подписи ступеней — не мои слова, а назначение ступеней у Radix
 * (research/.../radix-colors/docs-understanding-the-scale.mdx):
 * 1–2 фоны, 3–5 фоны органов управления, 6–8 границы, 9–10 заливки,
 * 11–12 текст. Краски считаются тем же кодом, что красит сайт.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { roles, ratio, inkOn, saleFrom, NEED } from './palette.mjs'

const args = process.argv.slice(2)
const ИМЯ = args.find((a, i) => args[i - 1] === '--set' && !a.startsWith('--'))
const ВЫХОД = args.find((a, i) => a.endsWith('.html') && args[i - 1] !== '--set') || 'лист-палитры.html'

const load = (p) => (existsSync(path.resolve(p)) ? JSON.parse(readFileSync(path.resolve(p), 'utf8')) : {})
const наборы = { ...load('styles/palette.json'), ...load('templates/palette.json') }
const имя = ИМЯ || Object.keys(load('styles/palette.json'))[0] || Object.keys(наборы)[0]
if (!наборы[имя]) {
  console.error(`Набора «${имя}» нет. Есть: ${Object.keys(наборы).join(', ')}`)
  process.exit(1)
}

/* Работа каждой ступени — по Radix. Не «светлее/темнее», а ЧТО ею красят:
   иначе лист снова превращается в список кодов, от которого правило и
   заводили. */
const РАБОТА = [
  'фон страницы',
  'фон тихой подложки, карточки',
  'фон органа в покое',
  'фон под рукой (наведение)',
  'фон нажатого, выбранного',
  'граница того, что не нажимают: карточка, разделитель',
  'граница того, что нажимают',
  'сильная граница, кольцо фокуса',
  'заливка: кнопка, плашка',
  'заливка под рукой',
  'приглушённый текст',
  'основной текст',
]
const СИГНАЛЫ = [
  ['e', 'Ошибка', 'поле не принято, платёж отклонён'],
  ['sale', 'Скидка', 'цена зачёркнута, плашка «−20%»'],
  ['warn', 'Внимание', 'осталось две штуки, срок годности'],
  ['ok', 'Успех', 'добавлено в корзину, заказ принят'],
]
const СТУПЕНИ_СИГНАЛА = [
  [2, 'тихая плашка'],
  [9, 'заливка'],
  [11, 'текст на бумаге'],
]

const набор = наборы[имя]
const темы = { light: roles(набор.light, 'light'), dark: roles(набор.dark, 'dark') }

/* Восьмая краска — сведение. Её в наборе нет, и это видно только рядом:
   сообщение о ФАКТЕ («доставка 3–5 дней») сейчас красится либо успехом
   (зелёный врёт: ничего не удалось), либо вниманием (оранжевый врёт:
   ничего не случилось). Radix об этом прямо: «If you map `blue` to
   "accent", you might also need `blue` to communicate "info"» — у нас
   марка латунная, значит сведению нужна своя краска, а не марка. */
const сведение = {
  light: roles({ ...набор.light, sale: набор.light.sale || saleFrom(набор.light.accent),
    info: undefined, error: '#2C6FD1' }, 'light'),
  dark: roles({ ...набор.dark, sale: набор.dark.sale || saleFrom(набор.dark.accent),
    info: undefined, error: '#5B9DF7' }, 'dark'),
}

/* Знак на плитке — не «белый через difference», а тот же расчёт, которым
   набор выбирает знак на заливке кнопки: на средних ступенях смешение
   давало серое по серому, и подпись пропадала ровно там, где её и надо
   читать. Показывать выбор нечитаемым — то же, что не показывать. */
const плитка = (имяПер, тема, подпись) => {
  const hex = темы[тема][имяПер]
  const знак = inkOn(hex)
  return `<div class="плитка" style="background:${hex};color:${знак}">
    <span class="имя">${имяПер}</span>
    <span class="код">${hex}</span>
    <span class="работа">${подпись}</span>
  </div>`
}

const лестница = (префикс, заголовок, пояснение) => `
  <section class="ряд">
    <h3>${заголовок}</h3>
    <p class="пояснение">${пояснение}</p>
    ${['light', 'dark'].map((тема) => `
      <div class="тема" data-тема="${тема}">
        <span class="ярлык">${тема === 'light' ? 'светлая' : 'тёмная'}</span>
        <div class="лестница">
          ${РАБОТА.map((р, i) => плитка(`--${префикс}-${i + 1}`, тема, r_short(r_i(i), р))).join('')}
        </div>
      </div>`).join('')}
  </section>`
const r_i = (i) => i + 1
const r_short = (n, р) => `${n} · ${р}`

/* Две краски, которых на лестнице нет: знак НА заливке марки и ступень
   нажатия. Обе считаются, обе уезжают в сайт — значит обе показываются.
   Поймано тестом: работали на листе, но не были названы. */
const рука = () => `
  <section class="ряд">
    <h3>Знак на марке и ответ на руку</h3>
    <p class="пояснение">Двух этих красок в лестнице нет: знак на заливке выбирается замером (белый или чёрный — что читается), нажатие уходит вдвое дальше наведения.</p>
    ${['light', 'dark'].map((тема) => `
      <div class="тема" data-тема="${тема}">
        <span class="ярлык">${тема === 'light' ? 'светлая' : 'тёмная'}</span>
        <div class="рука-ряд" style="background:${темы[тема]['--n-1']}">
          <div class="кнопка" style="background:${темы[тема]['--a-9']};color:${темы[тема]['--on-a-9']}">
            Купить · 24,90 лв
            <small>--a-9 на фоне, --on-a-9 ${темы[тема]['--on-a-9']} · ${ratio(темы[тема]['--on-a-9'], темы[тема]['--a-9']).toFixed(1)}</small>
          </div>
          <div class="кнопка" style="background:${темы[тема]['--a-10']};color:${темы[тема]['--on-a-9']}">
            под рукой
            <small>--a-10 ${темы[тема]['--a-10']} · наведение</small>
          </div>
          <div class="кнопка" style="background:${темы[тема]['--a-press']};color:${темы[тема]['--on-a-9']}">
            нажата
            <small>--a-press ${темы[тема]['--a-press']} · вдвое дальше наведения</small>
          </div>
        </div>
      </div>`).join('')}
  </section>`

const сигналы = () => `
  <section class="ряд">
    <h3>Сигналы — четыре краски по три ступени</h3>
    <p class="пояснение">У сигнала не вся лестница: ему нужны тихая плашка, заливка и текст. Двенадцать переменных вместо сорока восьми.</p>
    ${['light', 'dark'].map((тема) => `
      <div class="тема" data-тема="${тема}">
        <span class="ярлык">${тема === 'light' ? 'светлая' : 'тёмная'}</span>
        <div class="сетка-сигналов">
          ${СИГНАЛЫ.map(([к, титул, где]) => `
            <div class="сигнал">
              <b>${титул}</b><i>${где}</i>
              <div class="трио">
                ${СТУПЕНИ_СИГНАЛА.map(([ст, раб]) => плитка(`--${к}-${ст}`, тема, раб)).join('')}
              </div>
              <div class="проба" style="background:${темы[тема][`--${к}-9`]};color:${темы[тема][`--on-${к}-9`]}">
                --on-${к}-9 · знак на заливке · ${ratio(темы[тема][`--on-${к}-9`], темы[тема][`--${к}-9`]).toFixed(1)}
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </section>`

const линии = () => `
  <section class="ряд">
    <h3>Линии, окантовки и кольцо фокуса — да, они в палитре</h3>
    <p class="пояснение">Три краски, и ни одна не записана рукой: разделитель — тихая шестая ступень серого, граница и кольцо берутся ЗАМЕРОМ — первая ступень, которая даёт ${NEED.control}:1 к своему фону.</p>
    ${['light', 'dark'].map((тема) => `
      <div class="тема" data-тема="${тема}">
        <span class="ярлык">${тема === 'light' ? 'светлая' : 'тёмная'}</span>
        <div class="окантовки" style="background:${темы[тема]['--n-1']};color:${темы[тема]['--n-12']}">
          <div class="обр" style="border-top:1px solid ${темы[тема]['--line']}">
            <b>--line</b> ${темы[тема]['--line']}<br><i>разделитель: строки таблицы, конец блока</i>
          </div>
          <div class="обр">
            <span class="поле" style="border:1px solid ${темы[тема]['--border']};color:${темы[тема]['--n-11']}">поле ввода</span>
            <b>--border</b> ${темы[тема]['--border']}<br><i>окантовка органа · ${ratio(темы[тема]['--border'], темы[тема]['--n-2']).toFixed(1)}:1 к подложке</i>
          </div>
          <div class="обр">
            <span class="поле фокус" style="border:1px solid ${темы[тема]['--border']};box-shadow:0 0 0 2px ${темы[тема]['--ring']};color:${темы[тема]['--n-11']}">под фокусом</span>
            <b>--ring</b> ${темы[тема]['--ring']}<br><i>кольцо фокуса · ${ratio(темы[тема]['--ring'], темы[тема]['--n-1']).toFixed(1)}:1 к бумаге</i>
          </div>
        </div>
      </div>`).join('')}
  </section>`

const восьмая = () => `
  <section class="ряд восьмая">
    <h3>Восьмая краска: сведение — её в наборе НЕТ</h3>
    <p class="пояснение">Сообщение о факте — «доставка 3–5 дней», «закон ЕС: до 0,2 % ТГК» — сейчас красить нечем. Слева то, что есть; справа то, чего нет. Выбирать вам.</p>
    ${['light', 'dark'].map((тема) => `
      <div class="тема" data-тема="${тема}">
        <span class="ярлык">${тема === 'light' ? 'светлая' : 'тёмная'}</span>
        <div class="вести" style="background:${темы[тема]['--n-1']}">
          <div class="весть" style="background:${темы[тема]['--ok-2']};color:${темы[тема]['--ok-11']};border-inline-start:3px solid ${темы[тема]['--ok-9']}">
            <b>успехом</b> доставка 3–5 дней<br><i>врёт: ничего не удалось</i>
          </div>
          <div class="весть" style="background:${темы[тема]['--warn-2']};color:${темы[тема]['--warn-11']};border-inline-start:3px solid ${темы[тема]['--warn-9']}">
            <b>вниманием</b> доставка 3–5 дней<br><i>врёт: ничего не случилось</i>
          </div>
          <div class="весть" style="background:${сведение[тема]['--e-2']};color:${сведение[тема]['--e-11']};border-inline-start:3px solid ${сведение[тема]['--e-9']}">
            <b>сведением</b> доставка 3–5 дней<br><i>восьмая краска, если скажете</i>
          </div>
        </div>
      </div>`).join('')}
  </section>`

const счёт = Object.keys(темы.light).length
const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Лист палитры — ${имя}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:32px;font:16px/1.5 system-ui,sans-serif;background:#16161a;color:#e8e6e3}
  h1{font-size:28px;margin:0 0 4px}
  h1 small{display:block;font-weight:400;font-size:15px;opacity:.65;margin-top:6px}
  h3{font-size:19px;margin:0 0 4px}
  .пояснение{margin:0 0 14px;opacity:.7;font-size:14px;max-width:80ch}
  .ряд{margin:36px 0;padding-top:22px;border-top:1px solid #33333a}
  .тема{margin:14px 0}
  .ярлык{display:inline-block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.55;margin-bottom:6px}
  .лестница{display:grid;grid-template-columns:repeat(12,1fr);gap:4px}
  .плитка{min-height:104px;padding:7px;border-radius:6px;display:flex;flex-direction:column;gap:2px;
    font-size:10.5px;line-height:1.25;overflow:hidden;border:1px solid rgba(128,128,128,.28)}
  .плитка .имя{font-weight:700;font-family:ui-monospace,monospace}
  .плитка .код{font-family:ui-monospace,monospace;opacity:.8}
  .плитка .работа{margin-top:auto;opacity:.92}
  .рука-ряд{padding:18px;border-radius:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .кнопка{padding:14px 16px;border-radius:9px;font-size:15px;font-weight:600}
  .кнопка small{display:block;font-weight:400;font-size:11.5px;opacity:.85;margin-top:5px;font-family:ui-monospace,monospace}
  .сетка-сигналов{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
  .сигнал b{font-size:15px}
  .сигнал i{display:block;opacity:.6;font-size:12.5px;margin-bottom:6px}
  .трио{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
  .проба{margin-top:6px;padding:8px;border-radius:6px;font-size:12.5px;text-align:center}
  .окантовки{padding:20px;border-radius:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .обр{font-size:12.5px;padding-top:12px}
  .обр b{font-family:ui-monospace,monospace}
  .обр i{opacity:.65}
  .поле{display:block;padding:9px 12px;border-radius:7px;margin-bottom:9px;font-size:13px}
  .вести{padding:18px;border-radius:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .весть{padding:12px 14px;border-radius:8px;font-size:13.5px}
  .весть i{opacity:.75;font-size:12px}
  [data-тема="light"] .ярлык{color:#e8e6e3}
</style></head>
<body>
  <h1>Лист палитры — ${имя}
    <small>${счёт} переменных в каждой теме, ${счёт * 2} живых цвета. Из них рукой названо ШЕСТЬ: бумага, чернила, марка, ошибка, внимание, успех. Остальное считано.</small>
  </h1>
  ${лестница('n', 'Серый ряд — двенадцать ступеней от бумаги до чернил', 'Из двух названных красок: бумаги и чернил. Ею покрашено всё, что не марка и не сигнал.')}
  ${лестница('a', 'Марка — двенадцать ступеней латуни', 'Из ОДНОЙ названной краски: тон и насыщенность марки держатся на всех ступенях, светлота идёт по тому же профилю, что и серый ряд.')}
  ${рука()}
  ${сигналы()}
  ${линии()}
  ${восьмая()}
</body></html>`

writeFileSync(ВЫХОД, html)
console.log(`Лист палитры «${имя}»: ${счёт} переменных × 2 темы → ${ВЫХОД}`)
