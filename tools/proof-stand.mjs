/*
 * Страница-доказательство основы: обычная страница магазина, собранная ТОЛЬКО
 * из того, что набор выпускает, — шкал, ролей, двенадцати примитивов, кнопки
 * и поля. Своих чисел на ней нет: блок страницы ставит ручки примитивов и
 * берёт роли, как это делал бы сайт.
 *
 * Зачем она (И243): зелёные проверки по файлам говорят «правила соблюдены»,
 * а не «на ширине 700 ничего не налезает». Основа, которая обещает
 * адаптивность без медиазапросов, доказывает это отрисованной страницей на
 * всех ширинах свипа — `tools/proof-sweep.mjs`.
 *
 *   node tools/proof-stand.mjs [куда.html]        по умолчанию proof-stand.html
 *
 * На странице нарочно лежит то, на чём адаптивность ломается чаще всего:
 * длинное название товара, длинное слово без пробела, цена с валютой,
 * ряд кнопок, фильтр рядом с полкой, пара «кадр и описание», форма
 * оформления, сводка корзины, подвал в четыре колонки.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const read = (p) => (existsSync(path.resolve(p)) ? readFileSync(path.resolve(p), 'utf8') : '')
const need = ['styles/palette.css', 'styles/scale.css', 'styles/tokens.css', 'styles/base.css', 'styles/primitives.module.css', 'styles/btn.module.css', 'styles/form.module.css', 'styles/go.module.css']
const sheet = read('styles/icons.svg').replace(/<svg /, '<svg style="display:none" ')
/** Знак из листа: рисунок — в листе, имя — на кнопке (у безмолвной). */
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`
const missing = need.filter((p) => !read(p))
if (missing.length) {
  console.error(`✗ Нет ${missing.join(', ')} — доказывать нечем.`)
  process.exit(1)
}
/* `composes` — единственное, чем модуль отличается от простого CSS; снимается,
   а взятые классы ставятся на элемент рядом (`box pick`, `input box`). */
const plain = (p) => read(p).replace(/composes\s*:[^;}]*;?/g, '')
const css = need.map(plain).join('\n')

const img = (label, hue) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 30% 88%)"/><stop offset="1" stop-color="hsl(${hue} 35% 72%)"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><rect x="160" y="90" width="80" height="30" rx="6" fill="hsl(${hue} 25% 30%)"/><rect x="140" y="120" width="120" height="200" rx="18" fill="hsl(${hue} 30% 42%)"/><text x="200" y="230" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">${label}</text></svg>`)}`

const products = [
  ['Масло с CBD 10 %', '10 мл · 1000 мг', '29,90 €', 145],
  ['Пълноспектърно масло с CBD 30 % в MCT, 10 мл, с капкомер и сертификат за партидата', '10 мл · 3000 мг', '79,00 €', 30],
  ['Капсули с CBD', '30 бр · 25 мг', '34,50 €', 200],
  ['Крем за стави', '50 мл · 500 мг', '24,00 €', 20],
  ['Бонбони с CBD', '20 бр · 10 мг', '14,90 €', 330],
  ['Масло за кучета', '10 мл · 500 мг', '19,90 €', 60],
  ['Чай от коноп', '40 г', '7,50 €', 100],
  ['Балсам за устни', '5 г · 50 мг', '6,90 €', 280],
]

const card = ([name, facts, price, hue], i) => `
      <article class="card stack">
        <a class="frame shot" href="#p${i}"><img src="${img(facts.split(' ')[0], hue)}" alt="${name}" width="400" height="400" loading="${i < 4 ? 'eager' : 'lazy'}"></a>
        <p class="eyebrow">${i % 2 ? 'Масла' : 'Козметика'}</p>
        <h3 class="name"><a href="#p${i}">${name}</a></h3>
        <p class="muted facts">${facts}</p>
        <div class="cluster buy">
          <b class="price">${price}</b>
          <button class="btn" data-size="sm" type="button">В количката</button>
        </div>
      </article>`

const html = `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Доказателство за основата</title>
<style>
${css}
/* ── блоки страницы: только ручки примитивов и роли ── */
.head{padding-block:var(--air-row)}
.head .cluster{justify-content:space-between}
.logo{font-size:var(--h3-size);font-weight:var(--h3-weight);color:var(--ink)}
.nav a,.foot a,.logo{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target);min-inline-size:var(--ctrl-target)}
.nav a{font-size:var(--ctrl-fs-sm);color:var(--ink-soft)}
.shelf{--cols:4;--cell-min:200px}
.card{--stack:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card);box-shadow:var(--sh-raised)}
.shot{--frame:1 / 1;border-radius:var(--r-ctrl)}
.name{font-size:var(--h3-size);line-height:var(--h3-lead);font-weight:var(--h3-weight)}
.name a{display:inline-flex;align-items:center;min-block-size:var(--ctrl-target)}
.facts{font-size:var(--note-size)}
.buy{justify-content:space-between}
.price{font-size:var(--h3-size);font-weight:var(--h3-weight);color:var(--ink)}
.filters{--stack:var(--air-group);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.filters fieldset{border:0;padding:0;margin:0}
.filters legend{font-weight:600;margin-bottom:var(--air-row)}
.pdp{--switch-at:720px}
.gallery{--frame:4 / 5}
.offer{--stack:var(--air-group)}
.cart{--side-w:320px}
.lines{--stack:var(--air-row)}
.line{--side-w:96px;--side-at:60%;background:var(--surface);border-radius:var(--r-card);padding:var(--pad-inner)}
.line .frame{--frame:1 / 1;border-radius:var(--r-ctrl)}
.sum{--stack:var(--air-row);background:var(--surface);border-radius:var(--r-card);padding:var(--pad-card)}
.row{justify-content:space-between}
.foot{--cols:4;--cell-min:160px;--cols-min:1}
.foot ul{list-style:none;padding:0;margin:0}
.long{overflow-wrap:anywhere}
.offer .cluster > svg{inline-size:calc(var(--ctrl-h-sm) * .6);block-size:calc(var(--ctrl-h-sm) * .6);flex:none}
.probe svg{flex:none}
</style>
</head>
<body>
${sheet}
<a class="skip" href="#main">Към съдържанието</a>
<header class="wrap head">
  <div class="cluster">
    <a class="logo" href="#">Коноп и Мед</a>
    <nav class="rail nav" aria-label="Категории">
      <a href="#">Масла</a><a href="#">Капсули</a><a href="#">Козметика</a><a href="#">За домашни любимци</a><a href="#">Блог</a><a href="#">Лабораторни протоколи</a>
    </nav>
    <div class="cluster">
      <button class="btn" data-size="sm" type="button" aria-label="Търсене">${icon('search')}</button>
      <button class="btn" data-size="sm" type="button">${icon('shopping-cart')}Количка · 2</button>
    </div>
  </div>
</header>

<main id="main">
  <section class="wrap lede">
    <div class="ledeText">
      <h1>Масла с CBD, изпитани в <em>независима лаборатория</em></h1>
      <p>Всяка партида има протокол: CBD, THC, тежки метали, пестициди и разтворители. Номерът на партидата на етикета съвпада с номера в протокола.</p>
      <div class="cluster">
        <a class="btn" data-voice="loud" data-size="lg" href="#shop">Към магазина</a>
        <a class="btn" data-size="lg" href="#lab">Протоколи</a>
      </div>
    </div>
    <div class="frame"><img src="${img('CBD', 145)}" alt="Бутилка масло с CBD" width="400" height="400"></div>
  </section>

  <section class="wrap section" id="shop">
    <div class="sectionHead"><h2>Всички продукти</h2><p>Филтрирайте по форма и сила. Цената е с ДДС.</p><a class="go" href="#lab">Лабораторни протоколи${icon('arrow-right')}</a></div>
    <div class="sidebar">
      <aside class="aside"><form class="filters stack pinned" aria-label="Филтри">
        <fieldset class="rows"><legend>Форма</legend>
          <label class="tick"><input type="checkbox" checked> Масла</label>
          <label class="tick"><input type="checkbox"> Капсули</label>
          <label class="tick"><input type="checkbox"> Козметика</label>
        </fieldset>
        <fieldset class="rows"><legend>Сила</legend>
          <div class="seg"><button type="button" aria-pressed="false">5 %</button><button type="button" aria-pressed="true">10 %</button><button type="button" aria-pressed="false">30 %</button></div>
        </fieldset>
        <label class="field"><span class="label">Подреди по</span>
          <select class="box pick"><option>Най-продавани</option><option>Цена: ниска към висока</option></select>
        </label>
        <button class="btn" data-wide type="reset">${icon('x')}Изчисти филтрите</button>
      </form></aside>
      <div class="grid shelf">${products.map(card).join('')}
      </div>
    </div>
  </section>

  <section class="wrap section">
    <div class="switcher pdp">
      <div class="frame gallery"><img src="${img('30 %', 30)}" alt="Масло 30 %" width="400" height="500"></div>
      <div class="stack offer">
        <a class="go" data-to="back" href="#shop">${icon('arrow-left')}Назад към продуктите</a>
        <p class="eyebrow">Масла · партида B-2409</p>
        <h2 class="long">Пълноспектърно масло с CBD 30 % — Hanfsamenölextraktkonzentrat</h2>
        <b class="price">79,00 €</b>
        <div class="seg"><button type="button" aria-pressed="false">10 %</button><button type="button" aria-pressed="false">20 %</button><button type="button" aria-pressed="true">30 %</button></div>
        <div class="cluster">
          <div class="qty"><button type="button" aria-label="По-малко">${icon('minus')}</button><b>1</b><button type="button" aria-label="Повече">${icon('plus')}</button></div>
          <button class="btn" data-voice="loud" data-size="lg" type="button">Добави в количката</button>
        </div>
        <p class="muted cluster">${icon('truck')}Доставка до офис на куриер за 1–2 работни дни. Наложен платеж.</p>
        <p class="muted cluster">${icon('flask-conical')}Протокол на лабораторията за партида B-2409</p>
      </div>
    </div>
  </section>

  <section class="wrap section" id="lab">
    <div class="sectionHead"><h2>Количка и поръчка</h2></div>
    <div class="sidebar cart">
      <div class="stack lines">
        ${products.slice(0, 2).map(([name, facts, price, hue]) => `<div class="sidebar line"><div class="aside frame"><img src="${img('', hue)}" alt="" width="96" height="96"></div><div class="stack"><b>${name}</b><div class="cluster row"><span class="muted">${facts}</span><b>${price}</b></div></div></div>`).join('\n        ')}
        <form class="rows" aria-label="Данни за доставка">
          <label class="field"><span class="label">Имейл</span><input class="box" type="email" autocomplete="email" aria-invalid="true" aria-describedby="e1" value="ivan@"><span class="say" data-state="error" id="e1">Въведете имейл, например name@example.com</span></label>
          <label class="field"><span class="label">Телефон</span><input class="box" type="tel" autocomplete="tel"><span class="say">Куриерът ще се обади преди доставка</span></label>
          <label class="field"><span class="label">Бележка</span><textarea class="box"></textarea></label>
          <label class="tick"><input type="checkbox"> Съгласен съм с условията и политиката за поверителност</label>
        </form>
      </div>
      <aside class="aside"><div class="sum stack pinned">
        <div class="cluster row"><span>Междинна сума</span><b>108,90 €</b></div>
        <div class="cluster row"><span>Доставка</span><b>4,90 €</b></div>
        <div class="cluster row"><strong>Общо</strong><strong class="price">113,80 €</strong></div>
        <button class="btn" data-voice="loud" data-size="lg" data-wide type="button">Към плащане</button>
      </div></aside>
    </div>
  </section>

  <section class="wrap section prose">
    <div class="sectionHead"><h2>Често задавани въпроси</h2></div>
    <details><summary>Законно ли е CBD в България?</summary><p>Продаваме продукти от сортове от общия каталог на ЕС. Категорията на продукта е въпрос към юрист, не към витрината.</p></details>
    <details><summary>Как да чета протокола на лабораторията?</summary><p>Номерът на партидата на етикета съвпада с номера в протокола; измерват се CBD, THC, тежки метали, пестициди и разтворители.</p></details>
  </section>
</main>

<footer class="wrap sheet section" data-ground="paper">
  <div class="grid foot">
    <div><h3>Магазин</h3><ul><li><a href="#">Масла</a></li><li><a href="#">Капсули</a></li><li><a href="#">Козметика</a></li></ul></div>
    <div><h3>Помощ</h3><ul><li><a href="#">Доставка и плащане</a></li><li><a href="#">Връщане</a></li><li><a href="#">Контакти</a></li></ul></div>
    <div><h3>За нас</h3><ul><li><a href="#">Лаборатория</a></li><li><a href="#">Блог</a></li></ul></div>
    <div><h3>Абонамент</h3><form class="rows"><label class="field"><span class="label">Имейл</span><input class="box" type="email"></label><button class="btn" type="button">Абонирай се</button></form></div>
  </div>
</footer>
</body>
</html>
`

const out = process.argv[2] ?? 'proof-stand.html'
writeFileSync(out, html)
console.log(`✓ страница-доказательство: ${out} (${Math.round(html.length / 1024)} КБ)`)
