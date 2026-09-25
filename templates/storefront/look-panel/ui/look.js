/* Панель вида — выбор на самой витрине (look-panel/PANEL.md). Отдельный
   контейнер: простой скрипт, свои стили, ни React, ни кода сайта. Сайт
   подключает её одной строкой, пока LOOK_PICKER=on, и от неё ничего не
   берёт; всё её — в look-panel/, вход — /look-panel/.

   Что она делает с сайтом — только передаёт значения:
   · щелчок по варианту сразу красит страницу своим блоком
     `<style id="look-preview">` поверх опубликованного и пишет черновик вида
     на сервер (POST /look-panel/draft) — в черновом режиме сайт рисует
     черновик, другие гости видят опубликованное;
   · своя палитра строится в разделе Color из НАМЕРЕНИЯ — цвет марки, бумага,
     чернила — строителем набора (choice.mjs → engine/palette.mjs,
     `fitPalette`): набор верен по построению, что подвинуто — одной строкой
     (И275); ошибок заказчик не видит;
   · шапка и карточка товара — другая разметка: черновик и перезагрузка;
   · «Publish» — проверка сочетания (check:choice) и публикация без сборки.
   Вариант, который с текущими не носится, погашен: пары посчитаны правилом
   сайта при сборке каталога (для своей палитры — сервером, тем же правилом).

   Высота панели — от экрана, не от содержимого: верх (заголовок, разделы,
   подразделы) и низ (действия) стоят на месте, прокручивается середина.
   «Expand» разворачивает её: каждый вариант крупным образцом на том, на чём
   встанет, — кнопка настоящей кнопкой сайта на полу и на тёмной полосе,
   палитра карточкой товара; ширина помнится за зрителем. */
(function () {
  var script = document.currentScript
  var base = new URL('.', script && script.src ? script.src : location.origin + '/look-panel/')
  var OPEN = 'look-panel-open'
  var TAB = 'look-panel-tab'
  var SUB = 'look-panel-sub-'
  var root = document.documentElement
  var SVG = 'http://www.w3.org/2000/svg'

  function el(tag, attrs, kids) {
    var n = document.createElement(tag)
    for (var k in attrs || {}) {
      var v = attrs[k]
      if (v === null || v === undefined || v === false) continue
      if (k === 'text') n.textContent = v
      else if (k === 'style') n.setAttribute('style', v)
      else n.setAttribute(k, v === true ? '' : v)
    }
    ;(kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c) })
    return n
  }
  /** Знак — рисунок линией, одной толщины: закрыть, галочка. */
  function icon(d, size) {
    var s = document.createElementNS(SVG, 'svg')
    s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('width', size || 14); s.setAttribute('height', size || 14); s.setAttribute('aria-hidden', 'true')
    var path = document.createElementNS(SVG, 'path')
    path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.75'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round')
    s.appendChild(path)
    return s
  }
  var TICK = 'M3.5 8.5l3 3 6-7'
  var CROSS = 'M4 4l8 8M12 4l-8 8'
  var ARROW = 'M3 8h10M9 4l4 4-4 4'
  /* Развернуть — уголки наружу, свернуть — внутрь. */
  var GROW = 'M9.5 2.5h4v4M13.5 2.5l-4.5 4.5M6.5 13.5h-4v-4M2.5 13.5l4.5-4.5'
  var SHRINK = 'M13 7h-4V3M9 7l4.5-4.5M3 9h4v4M7 9l-4.5 4.5'
  /* Полоса «Look»: настройка — два движка на двух линиях; открыть — уголок вверх. */
  var SLIDERS = 'M2.5 5h11M2.5 11h11M6 3.25v3.5M10 9.25v3.5'
  var UP = 'M4 10l4-4 4 4'
  function remember(key, value) {
    try { value === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value) } catch (e) { /* без памяти */ }
  }
  function recall(key) {
    try { return sessionStorage.getItem(key) } catch (e) { return null }
  }
  /* Ширина панели помнится за зрителем, а не за вкладкой: развернул однажды —
     в следующий раз панель откроется развёрнутой (localStorage этого браузера). */
  var WIDE = 'look-panel-wide'
  function keepWide(on) {
    try { on ? localStorage.setItem(WIDE, '1') : localStorage.removeItem(WIDE) } catch (e) { /* без памяти */ }
  }
  function keptWide() {
    try { return localStorage.getItem(WIDE) === '1' } catch (e) { return false }
  }
  function send(method, path, body) {
    return fetch(new URL(path, base).href, {
      method: method, credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) { return r.json().catch(function () { return { ok: r.ok } }) })
  }
  function later(fn, ms) {
    var t = 0
    return function () { clearTimeout(t); t = setTimeout(fn, ms) }
  }
  /* Роли тени — на списке полов, как их кладёт сайт (`floors` каталога,
     lib/look-values.ts, И385): на палубе и листе предпросмотр пересчитывает
     их из своих ингредиентов, а не наследует корневую строку. */
  var cssText = function (vars, floors) {
    var on = function (keep) { return Object.keys(vars).filter(keep).map(function (k) { return k + ':' + vars[k] }).join(';') }
    var shadow = function (k) { return Boolean(floors) && floors.names.indexOf(k) >= 0 }
    var rest = on(function (k) { return !shadow(k) })
    var roles = on(shadow)
    return ':root{' + rest + '}' + (roles ? '\n' + floors.selector + '{' + roles + '}' : '')
  }
  var HEX = /^#?[0-9a-f]{6}$/i
  var hexOf = function (v) { v = v.trim(); return HEX.test(v) ? (v[0] === '#' ? v : '#' + v).toUpperCase() : null }

  function build(catalog, choice, state) {
    /* Стили панели страница ставит сама, до первой отрисовки (Shell.tsx):
       в них резерв нижней полосы `--dock`, и пришедший со скриптом он
       сдвигал бы готовую страницу — галерея товара сжималась на рост
       полосы после показа (25.09.2026). Здесь — только если страница их не
       поставила. */
    var sheet = new URL('look.css', base).href
    var have = [].some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { return l.href === sheet })
    if (!have) document.head.appendChild(el('link', { rel: 'stylesheet', href: sheet }))
    /* Шрифты-кандидаты — только в предпросмотре панели: образцы шрифтов
       набраны своим шрифтом. Опубликованный вид несёт свой шрифт с адреса
       сайта, к Google страница покупателя не ходит. */
    catalog.groups.face.forEach(function (f) { if (f.google) document.head.appendChild(el('link', { rel: 'stylesheet', href: f.google })) })

    var names = choice.complete((state.previewing && state.draft) || state.published || {}, catalog)
    var setOf = function (id) { return catalog.groups.palette.find(function (o) { return o.id === id }) }
    var custom = function () { return names.palette === choice.CUSTOM }
    /* Своя палитра: намерение (цвет марки, бумага, чернила) и собранные из
       него краски. Открыта своя — её намерение; стоит набор — намерение,
       выведенное из набора. */
    var saved = (state.previewing && state.draftPaints) || state.publishedPaints
    var current = function () { return (setOf(names.palette) || catalog.groups.palette[0]) }
    var intent = custom() && saved ? Object.assign({}, saved.intent || choice.intentOf(saved)) : choice.intentOf(current().seed)
    var paints = custom() && saved ? { name: saved.name || 'Custom', light: saved.light, dark: saved.dark, intent: intent } : null
    var fitted = { notes: [] }
    var own = [] /* пары своей палитры — от сервера (POST /look-panel/guard) */
    var status = el('output', { class: 'lp-status', 'aria-live': 'polite' })
    var groups = []
    var pairs = function () { return catalog.pairs.concat(own) }
    /* Черновик на экране: полоса «Look» говорит «Draft», пока страница
       показывает не опубликованное. Сама полоса строится ниже. */
    var drafting = Boolean(state.previewing && state.draft)
    var bandSync = function () {}

    function preview() {
      var tag = document.getElementById('look-preview')
      if (!tag) { tag = el('style', { id: 'look-preview' }); document.head.appendChild(tag) }
      tag.textContent = cssText(choice.compose(names, catalog, custom() ? paints : null).look.vars, catalog.floors)
    }
    function body() {
      return Object.assign({}, names, custom() ? { paints: paints } : {})
    }
    function draft(reload) {
      drafting = true
      bandSync()
      status.textContent = 'Saving draft…'
      return send('POST', 'draft', body()).then(function (r) {
        status.textContent = r.ok ? 'Draft saved — only you see it.' : 'Draft not saved: ' + (r.error || 'error')
        if (r.ok && reload) { remember(OPEN, '1'); location.reload() }
      }, function () { status.textContent = 'Draft not saved: no answer' })
    }
    var draftLater = later(function () { draft(false) }, 700)
    function refresh() {
      groups.forEach(function (g) { g.refresh() })
      promises.refresh()
      bandSync()
      var bad = choice.clashes(names, pairs())
      publish.disabled = Boolean(bad.length)
      publish.title = bad.length ? bad[0].why : ''
    }

    function sample(field, o) {
      if (field === 'palette') {
        var dots = o.dots.light.map(function (c, i) { return el('i', { class: 'lp-dot', style: 'background:light-dark(' + c + ',' + o.dots.dark[i] + ')' }) })
        return el('span', { class: 'lp-dots', 'aria-hidden': 'true' }, dots)
      }
      if (field.indexOf('btn-') === 0 && o.vars['--ctrl-btn-tip'] !== undefined) {
        /* Форма главной кнопки — та же формула, что в btn.module.css, на
           образце высотой 18: остриё, выемка и хвост шевронов тоном. */
        var h = 18
        var num = function (k) { return Number(o.vars[k] || 0) * h }
        var tip = num('--ctrl-btn-tip'), point = num('--ctrl-btn-tip-at'), notch = num('--ctrl-btn-notch')
        var clip = 'polygon(0 0, calc(100% - ' + tip + 'px) 0, calc(100% - ' + point + 'px) 50%, calc(100% - ' + tip + 'px) 100%, 0 100%, ' + notch + 'px 50%)'
        var kids = [el('span', { class: 'lp-shaped', style: 'clip-path:' + clip })]
        if (o.vars['--ctrl-btn-echo'] === 'block') {
          var gs = [num('--ctrl-btn-trail-1'), num('--ctrl-btn-trail-2')].filter(function (g, i, all) { return all.indexOf(g) === i })
          gs.forEach(function (g, i) {
            var x = function (k) { return 'calc(100% - ' + (point + k * h - g).toFixed(1) + 'px)' }
            /* Тоны хвоста — роли палитры сайта (И295), а не смесь на месте. */
            kids.unshift(el('i', { class: 'lp-echo', style: 'clip-path:polygon(' + x(0.33) + ' 0, ' + x(0.03) + ' 0, ' + x(-0.3) + ' 50%, ' + x(0.03) + ' 100%, ' + x(0.33) + ' 100%, ' + x(0) + ' 50%);background:var(' + (i ? '--pop-trail-far' : '--pop-trail-near') + ')' }))
          })
        }
        return el('span', { class: 'lp-shape-sample', 'aria-hidden': 'true' }, kids)
      }
      if (field.indexOf('btn-') === 0) {
        /* Образец оси кнопки — роли варианта на маленькой кнопке, поверх пола
           страницы: вуаль видна такой, какой встанет на сайте. */
        var v = o.vars
        var fill = v['--ctrl-btn-fill-pop'] || v['--ctrl-btn-fill'] || 'transparent'
        var style = 'background:linear-gradient(' + fill + ',' + fill + '),var(--page, #fff);color:' + (v['--ctrl-btn-ink-pop'] || v['--ctrl-btn-ink'] || 'var(--ink)') +
          ';border-color:' + (v['--ctrl-btn-edge-pop'] || v['--ctrl-btn-edge'] || 'transparent') + ';text-transform:' + (v['--ctrl-btn-case'] || 'none') +
          ';letter-spacing:' + (v['--ctrl-btn-track'] || 'normal') + ';font-weight:' + (v['--ctrl-btn-weight'] || '600')
        return el('span', { class: 'lp-btn', style: style, 'aria-hidden': 'true', text: 'Aa' })
      }
      /* Вид поля (И390): заливка и кромка варианта поверх пола страницы;
         у тона — одна черта снизу. */
      if (field === 'field') {
        var fv = o.vars
        var ff = fv['--ctrl-field-fill'] || 'transparent'
        return el('span', { class: 'lp-field', 'data-side': fv['--ctrl-field-side'], style: 'background:linear-gradient(' + ff + ',' + ff + '),var(--page, #fff);border-color:' + (fv['--ctrl-field-edge'] || 'currentColor'), 'aria-hidden': 'true' })
      }
      /* Место подписи (И394): полоска поля и черта подписи над ним или на кромке. */
      if (field === 'field-label') return el('span', { class: 'lp-label', 'data-at': o.vars['--ctrl-field-label'], 'aria-hidden': 'true' }, [el('b'), el('i', { class: 'lp-field' })])
      /* Знак полки на фишке (И422): фишка словом или с кругом знака. */
      if (field === 'chip-sign') return el('span', { class: 'lp-chipsign', 'data-at': o.vars['--chip-sign'], 'aria-hidden': 'true' }, [el('i'), el('b')])
      /* Пара «поле и кнопка» (И421): две коробки с зазором или одна. */
      if (field === 'pair-look') return el('span', { class: 'lp-pair', 'data-at': o.vars['--pair-look'], 'aria-hidden': 'true' }, [el('i'), el('b')])
      /* Сообщение формы (И420): строка или заметка с точкой знака. */
      if (field === 'say-look') return el('span', { class: 'lp-say', 'data-at': o.vars['--say-look'], 'aria-hidden': 'true' }, [el('i'), el('b')])
      /* Знаки шапки (И398): три знака — без заливки, тоном или в лотке. */
      if (field === 'head-icons') return el('span', { class: 'lp-heads', 'data-at': o.vars['--head-icons'], 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')])
      /* Ссылка под рукой (И397): стрелка краской варианта. */
      if (field === 'go-hover') return el('span', { class: 'lp-go', style: o.vars['--go-hover'] === 'currentcolor' ? '' : 'color:' + o.vars['--go-hover'], 'aria-hidden': 'true', text: '→' })
      /* Галочка (И392): отмеченный квадрат краской варианта. */
      if (field === 'tick') return el('i', { class: 'lp-tick', style: 'background:' + o.vars['--ctrl-tick-fill'], 'aria-hidden': 'true' })
      if (field === 'corners') { var r = Math.round(parseFloat(o.vars['--r-card']) / 3) + 'px'; return el('i', { class: 'lp-shape', style: 'border-radius:' + r + ' ' + r + ' 0 0', 'aria-hidden': 'true' }) }
      /* Карта товара: доля ряда — полоса с долей галереи; пропорция — кадр;
         миниатюры — кадр с рядом под ним, полосой сбоку или точками. */
      if (field === 'pdp-gallery') return el('span', { class: 'lp-row-split', 'aria-hidden': 'true' }, [el('i', { style: 'inline-size:' + o.vars['--pdp-gallery'] })])
      /* Полка (И400): пропорция снимка — кадр; плотность — столько столбиков,
         сколько карточек в ряд. */
      if (field === 'shot-frame') return el('i', { class: 'lp-pic', style: 'aspect-ratio:' + o.vars['--shot-frame'], 'aria-hidden': 'true' })
      if (field === 'card-buy') return el('span', { class: 'lp-buy', 'data-at': o.vars['--card-buy'], 'aria-hidden': 'true' }, [el('i'), el('b')])
      /* Подпись порядка (И395): черта подписи перед кнопкой или внутри неё. */
      if (field === 'sort-label') return el('span', { class: 'lp-sort', 'data-at': o.vars['--sort-label'], 'aria-hidden': 'true' }, [el('i'), el('b', {}, [el('i')])])
      /* Выбор варианта (И396): три сегмента — отдельно, встык или в подложке. */
      if (field === 'seg-look') return el('span', { class: 'lp-seg', 'data-at': o.vars['--seg-look'], 'aria-hidden': 'true' }, [el('b'), el('i'), el('i')])
      if (field === 'shelf-cols') return el('span', { class: 'lp-cols', 'aria-hidden': 'true' }, Array.from({ length: Number(o.vars['--shelf-cols']) || 4 }, function () { return el('i') }))
      if (field === 'pdp-thumbs') {
        var at = o.vars['--pdp-thumbs']
        return el('span', { class: 'lp-thumbs', 'data-at': at, 'aria-hidden': 'true' }, [el('i', { class: 'lp-pic' })].concat([0, 1, 2].map(function () { return el('b') })))
      }
      /* Край снимка: в полях страницы — кадр со скруглением внутри рамки;
         во всю ширину — кадр от края до края рамки, лист наезжает снизу. */
      if (field === 'pdp-edge') return el('span', { class: 'lp-edge', 'data-at': o.vars['--pdp-edge'], 'aria-hidden': 'true' }, [el('i', { class: 'lp-pic' }), el('b')])
      if (field === 'shadow') return el('i', { class: 'lp-shape lp-lit', style: 'box-shadow:' + o.vars['--sh-raised'], 'aria-hidden': 'true' })
      /* Главная: первый экран схемой — из чего он сложен сверху вниз
         (catalog.json, `plan`): сцена, заголовок, фишки полок, ряд товара,
         лист, ящики, снимок, оглавление, снимок с вырезом, строка полок. */
      if (field === 'home') {
        /* Ряд, фишки, плитки и ящики — клетками; оглавление — строками. */
        var cells = { row: 4, tiles: 4, drawers: 4, chips: 4, index: 3, words: 3, tall: 4 }
        return el('span', { class: 'lp-plan', 'aria-hidden': 'true' }, (o.plan || []).map(function (k) {
          return el('i', { 'data-k': k }, Array.from({ length: cells[k] || 0 }, function () { return el('b') }))
        }))
      }
      return null
    }

    /* ── Развёрнутая панель: большие образцы ─────────────────────────────
       Слово заказчика 24.09.2026: «панель меню делай расширяемой, например
       чтоб все кнопки показать». Развёрнутая, панель показывает каждый
       вариант крупно и на том, на чём он встанет: кнопку — настоящей кнопкой
       сайта на полу страницы и на тёмной полосе, палитру — карточкой
       товара, одежду карточки — карточкой. Краски — роли сайта; образцы
       строятся, когда панель развернули впервые. */
    /* Кнопка сайта — её собственный класс, снятый со страницы: образец
       рисует тот же модуль (styles/btn.module.css), что и сайт. На странице
       без кнопки — рисунок панели той же формулой. */
    var siteButton = (function () {
      var found = document.querySelector('[data-voice]')
      var cls = found && typeof found.className === 'string' ? found.className.split(/\s+/).filter(function (c) { return c && c.indexOf('lp-') !== 0 }).join(' ') : ''
      return cls
    })()
    var AXIS_VOICE = { quiet: 'quiet' }
    function realButton(field, o, voice) {
      if (siteButton) return el('span', { class: siteButton, 'data-voice': voice, 'data-size': 'lg', text: 'Add to cart' })
      var drawn = sample(field, o)
      return el('span', { class: 'lp-zoom' }, drawn ? [drawn] : [])
    }
    function stageOf(o, kids) {
      /* Два пола: страница и тёмная полоса. Полоса — пол палубы сайта
         (`data-ground="deck"`): роли по полу на ней переназначает сам сайт
         (base.css), образец ничего не пересчитывает. Роли варианта стоят на
         самой сцене, ВНЕ полосы, — как на сайте они стоят на корне: ссылка
         `var(--pop)` в них раскрывается там, где объявлена, и полоса видит
         ту же заливку, что герой на странице. */
      var style = Object.keys(o.vars).map(function (k) { return k + ':' + o.vars[k] }).join(';')
      return el('span', { class: 'lp-stage', style: style, 'aria-hidden': 'true' }, [
        el('span', { class: 'lp-ground' }, kids()),
        el('span', { class: 'lp-ground lp-ground-deck', 'data-ground': 'deck' }, kids()),
      ])
    }
    function big(field, o) {
      if (field.indexOf('btn-') === 0) {
        var voice = AXIS_VOICE[field.slice(4)] || 'loud'
        return stageOf(o, function () { return [realButton(field, o, voice)] })
      }
      if (field === 'palette') {
        var t = choice.tileOf(o.seed, catalog.steps)
        var ld = function (k) { return 'light-dark(' + t.light[k] + ',' + t.dark[k] + ')' }
        return el('span', { class: 'lp-shop', style: 'background:' + ld('page'), 'aria-hidden': 'true' }, [
          el('span', { class: 'lp-card', style: 'background:' + ld('plate') + ';color:' + ld('ink') }, [
            el('i', { class: 'lp-card-pic', style: 'background:' + ld('pic') }, [el('b', { class: 'lp-sale', style: 'background:' + ld('sale') + ';color:' + ld('onSale'), text: '−20%' })]),
            el('b', { class: 'lp-card-name', text: 'Full-spectrum oil 10%' }),
            el('small', { style: 'color:' + ld('soft'), text: '30 ml · €1.53 / ml' }),
            el('span', { class: 'lp-card-row' }, [
              el('b', { text: '€45.90' }),
              el('span', { class: 'lp-card-buy', style: 'background:' + ld('pop') + ';color:' + ld('onPop'), text: 'Add to cart' }),
            ]),
          ]),
        ])
      }
      if (field === 'card') {
        return el('span', { class: 'lp-shop lp-shop-site', 'aria-hidden': 'true' }, [
          el('span', { class: 'lp-pcard', 'data-card': o.id }, [
            el('i', { class: 'lp-card-pic' }),
            el('b', { class: 'lp-card-name', text: 'Full-spectrum oil 10%' }),
            el('small', { text: '30 ml · €45.90' }),
          ]),
        ])
      }
      if (field === 'face') return el('span', { class: 'lp-big-well lp-face', style: 'font-family:' + o.stack, 'aria-hidden': 'true' }, [el('b', { text: 'Aa Ăă Șș' }), el('span', { text: 'Full-spectrum oil, 30 ml' })])
      if (field === 'corners') {
        return el('span', { class: 'lp-big-well lp-radii', 'aria-hidden': 'true' }, ['--r-ctrl', '--r-card', '--r-sheet'].map(function (k) { return el('i', { style: 'border-radius:' + o.vars[k] }) }))
      }
      if (field === 'shadow') return el('span', { class: 'lp-big-well lp-shop-site', 'aria-hidden': 'true' }, [el('i', { class: 'lp-lift', style: 'box-shadow:' + o.vars['--sh-raised'] })])
      var small = sample(field, o)
      return el('span', { class: 'lp-big-well', 'aria-hidden': 'true' }, [small ? el('span', { class: 'lp-zoom' }, [small]) : el('b', { class: 'lp-big-name', text: o.name })])
    }
    var pendingBig = []
    function buildBig() {
      pendingBig.splice(0).forEach(function (fn) { fn() })
    }
    function group(field, label, extra) {
      var id = 'lp-why-' + field
      var line = el('p', { class: 'lp-why', id: id })
      var chips = catalog.groups[field].map(function (o) {
        var attrs = { type: 'button', class: 'lp-chip', 'data-id': o.id, title: o.line || null }
        if (field === 'face') attrs.style = 'font-family:' + o.stack /* образец — своим шрифтом; у пары — шрифтом заголовков */
        var mini = sample(field, o)
        var cap = el('span', { class: 'lp-cap' }, [el('span', { class: 'lp-cap-name' }, [icon(TICK, 12), el('span', { text: o.name })]), o.line ? el('span', { class: 'lp-line', text: o.line }) : null])
        var chip = el('button', attrs, [mini ? el('span', { class: 'lp-mini' }, [mini]) : null, el('span', { class: 'lp-label', text: o.name }), cap])
        chip.label = o.name
        /* Крупный образец — при первом развороте панели. */
        pendingBig.push(function () { chip.insertBefore(el('span', { class: 'lp-big' }, [big(field, o)]), cap) })
        var reason = ''
        chip.addEventListener('click', function () {
          if (reason) { line.textContent = o.name + ': ' + reason; return }
          if (names[field] === o.id) return
          names[field] = o.id
          if (field === 'palette') { intent = choice.intentOf(o.seed); paints = null; fitted = { notes: [] }; builder.load() }
          refresh()
          if (choice.STRUCTURE.includes(field)) draft(true)
          else { preview(); draft(false) }
        })
        var tell = function () { if (reason) line.textContent = o.name + ': ' + reason }
        chip.addEventListener('pointerenter', tell)
        chip.addEventListener('focus', tell)
        chip.update = function () {
          var hit = choice.blockedBy(field, o.id, names, pairs())
          reason = hit ? 'not with ' + choice.title(catalog, hit.field, hit.id) + ' — ' + hit.why : ''
          chip.setAttribute('aria-pressed', String(names[field] === o.id))
          if (reason) { chip.setAttribute('aria-disabled', 'true'); chip.title = reason; chip.setAttribute('aria-describedby', id) }
          else { chip.removeAttribute('aria-disabled'); chip.title = o.line || ''; chip.removeAttribute('aria-describedby') }
          return reason
        }
        return chip
      })
      var legend = el('span', { class: 'lp-legend', id: id + '-l', text: label })
      var node = el('div', { class: 'lp-group', 'data-field': field }, [el('div', { class: 'lp-row' }, [legend, extra || null]), el('div', { class: 'lp-chips', role: 'group', 'aria-labelledby': id + '-l' }, chips), line])
      groups.push({ refresh: function () {
        var first = ''
        chips.forEach(function (c) { var r = c.update(); if (r && !first) first = c.label + ': ' + r })
        line.textContent = first
      } })
      return node
    }
    /** Сегменты: один из нескольких, нажатый — залит. */
    function segments(label, list, get, set) {
      var node = el('div', { class: 'lp-seg', role: 'group', 'aria-label': label })
      var buttons = list.map(function (x) {
        var b = el('button', { type: 'button', class: 'lp-segb', text: x[1] })
        b.addEventListener('click', function () { set(x[0]) })
        node.appendChild(b)
        return [x[0], b]
      })
      return { node: node, sync: function () { buttons.forEach(function (x) { x[1].setAttribute('aria-pressed', String(get() === x[0])) }) } }
    }

    /* ── Color: наборы, строитель из намерения, шкала, обещания ─────────── */

    var guard = later(function () {
      if (!custom()) { own = []; refresh(); return }
      send('POST', 'guard', { paints: paints }).then(function (r) { own = r.ok ? r.pairs : []; refresh() }, function () { /* без ответа — пары каталога */ })
    }, 250)
    var builder = (function () {
      var scaleTheme = 'light'
      var nameField = el('input', { class: 'lp-name', type: 'text', maxlength: '40', 'aria-label': 'Palette name', value: 'Custom' })
      nameField.addEventListener('input', function () { if (paints) { paints.name = nameField.value.trim() || 'Custom'; draftLater() } })
      /* Цвет марки: образец с выбором краски, код с логотипа, тон ползунком. */
      var brandPick = el('input', { type: 'color', class: 'lp-pick', 'aria-label': 'Brand colour' })
      var brandHex = el('input', { type: 'text', class: 'lp-hex', inputmode: 'text', spellcheck: 'false', maxlength: '7', 'aria-label': 'Brand colour hex' })
      var hue = el('input', { type: 'range', class: 'lp-hue', min: '0', max: '359', step: '1', 'aria-label': 'Brand hue' })
      var fromSw = el('i', { class: 'lp-sw' })
      var toSw = el('i', { class: 'lp-sw' })
      var adjust = el('div', { class: 'lp-adjust', hidden: true }, [
        el('span', { class: 'lp-pair' }, [fromSw, el('span', { class: 'lp-arrow' }, [icon(ARROW)]), toSw]),
        el('p', { class: 'lp-adjust-line' }),
      ])
      var paper = segments('Paper', [['warm', 'Warm'], ['neutral', 'Neutral'], ['cool', 'Cool']], function () { return intent.paper }, function (v) { intent.paper = v; changed() })
      var tint = segments('Paper tint', [['none', 'None'], ['light', 'Light']], function () { return intent.tint }, function (v) { intent.tint = v; changed() })
      var toward = el('input', { type: 'checkbox', class: 'lp-check' })
      toward.addEventListener('change', function () { intent.inkTowardBrand = toward.checked; changed() })
      var setBrand = function (hex, keep) {
        intent.brand = hex
        if (!keep) hue.value = String(Math.round(hueOf(hex)))
        changed()
      }
      brandPick.addEventListener('input', function () { brandHex.value = brandPick.value.toUpperCase(); setBrand(brandPick.value.toUpperCase()) })
      brandHex.addEventListener('input', function () {
        var v = hexOf(brandHex.value)
        if (v) { brandHex.removeAttribute('aria-invalid'); brandPick.value = v.toLowerCase(); setBrand(v) } else brandHex.setAttribute('aria-invalid', 'true')
      })
      hue.addEventListener('input', function () {
        var v = withHue(intent.brand, Number(hue.value))
        brandHex.value = v; brandPick.value = v.toLowerCase(); setBrand(v, true)
      })
      /* Тонкая настройка: свои коды бумаги, чернил и марки по темам — тоже
         доводятся до замера. */
      var exact = null
      var fineTheme = 'light'
      var fine = {}
      var fineRows = ['paper', 'ink', 'accent'].map(function (k) {
        var f = el('input', { type: 'text', class: 'lp-hex', spellcheck: 'false', maxlength: '7', 'aria-label': k + ' hex' })
        f.addEventListener('change', function () {
          var v = hexOf(f.value)
          if (!v) { f.setAttribute('aria-invalid', 'true'); return }
          f.removeAttribute('aria-invalid')
          exact = exact || { light: Object.assign({}, fitted.seed ? fitted.seed.light : {}), dark: Object.assign({}, fitted.seed ? fitted.seed.dark : {}) }
          exact[fineTheme][k] = v
          changed()
        })
        fine[k] = f
        return el('label', { class: 'lp-fine-row' }, [el('span', { class: 'lp-pname', text: { paper: 'Paper', ink: 'Ink', accent: 'Brand' }[k] }), f])
      })
      var fineSeg = segments('Theme', [['light', 'Light'], ['dark', 'Dark']], function () { return fineTheme }, function (v) { fineTheme = v; syncFine() })
      var syncFine = function () {
        fineSeg.sync()
        var src = (exact && exact[fineTheme]) || (fitted.seed && fitted.seed[fineTheme]) || {}
        ;['paper', 'ink', 'accent'].forEach(function (k) { fine[k].value = src[k] || '' })
      }
      var scaleGrid = el('div', { class: 'lp-grid', role: 'img' })
      var scaleSeg = segments('Scale theme', [['light', 'Light'], ['dark', 'Dark']], function () { return scaleTheme }, function (v) { scaleTheme = v; grid() })
      function grid() {
        scaleSeg.sync()
        var p = paints || current().seed
        var fams = choice.families(p, scaleTheme)
        scaleGrid.setAttribute('aria-label', 'Computed steps, ' + scaleTheme + ' theme: 7 families by 12 steps')
        scaleGrid.replaceChildren.apply(scaleGrid, fams.flatMap(function (f) {
          return [el('span', { class: 'lp-fam', text: f[0] })].concat(f[1].map(function (hex, i) { return el('i', { class: 'lp-cell', title: f[0] + ' ' + (i + 1) + ' · ' + hex, style: 'background:' + hex }) }))
        }))
      }
      function showAdjust() {
        var n = fitted.notes.filter(function (x) { return x.what === 'brand' })[0]
        adjust.hidden = !n
        if (!n) return
        fromSw.style.background = n.from; toSw.style.background = n.to
        fromSw.title = 'Your colour ' + n.from; toSw.title = 'Used for buttons ' + n.to
        adjust.lastChild.textContent = (n.mode === 'dark' ? 'In the dark theme your colour' : 'Your colour') + ' is used for buttons ' + n.why + '.'
      }
      /* Намерение изменилось: строитель собирает набор, который проходит
         замер; страница перекрашивается им, и только им. */
      var fit = later(function () {
        var r = choice.fitPalette(intent, exact)
        if (!r.ok) { adjust.hidden = false; adjust.lastChild.textContent = r.notes[0].why; return }
        fitted = r
        paints = { name: nameField.value.trim() || 'Custom', light: r.seed.light, dark: r.seed.dark, intent: Object.assign({}, intent) }
        names.palette = choice.CUSTOM
        showAdjust(); preview(); guard(); refresh(); grid(); syncFine(); draftLater()
      }, 90)
      function changed() { paper.sync(); tint.sync(); tint.node.toggleAttribute('data-off', intent.paper === 'neutral'); fit() }
      function load() {
        exact = null
        nameField.value = (paints && paints.name) || 'Custom'
        brandHex.value = intent.brand; brandPick.value = intent.brand.toLowerCase(); hue.value = String(Math.round(hueOf(intent.brand)))
        toward.checked = Boolean(intent.inkTowardBrand)
        paper.sync(); tint.sync(); tint.node.toggleAttribute('data-off', intent.paper === 'neutral')
        fitted = { notes: [], seed: paints ? { light: paints.light, dark: paints.dark } : null }
        showAdjust(); syncFine(); grid()
      }
      var row = function (label, kids, hint) { return el('div', { class: 'lp-brow' }, [el('span', { class: 'lp-blabel', text: label }), el('div', { class: 'lp-bctl' }, kids.concat(hint ? [el('p', { class: 'lp-bhint', text: hint })] : []))]) }
      var node = el('div', { class: 'lp-builder', hidden: true }, [
        el('span', { class: 'lp-legend', text: 'Your palette' }),
        row('Name', [nameField]),
        row('Brand', [el('div', { class: 'lp-brand' }, [el('span', { class: 'lp-swatch' }, [brandPick]), brandHex]), hue, adjust]),
        row('Paper', [paper.node, tint.node]),
        row('Ink', [el('label', { class: 'lp-toggle' }, [toward, 'Lean towards the brand'])], 'Set for you: always dark enough to read.'),
        el('details', { class: 'lp-more' }, [el('summary', { text: 'Fine-tune exact colours' }), el('div', { class: 'lp-fine' }, [fineSeg.node].concat(fineRows)), el('p', { class: 'lp-bhint', text: 'These are corrected too: a colour that would not read is moved to the nearest one that does.' })]),
        el('details', { class: 'lp-more' }, [el('summary', { text: 'Scale · 7 families × 12 steps' }), scaleSeg.node, scaleGrid]),
      ])
      load()
      return { node: node, load: load, open: function () { node.hidden = false; load(); fit() } }
    })()
    function hueOf(hex) {
      var c = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255 })
      var max = Math.max.apply(null, c), min = Math.min.apply(null, c), d = max - min
      if (!d) return 0
      var h = max === c[0] ? ((c[1] - c[2]) / d) % 6 : max === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4
      return (h * 60 + 360) % 360
    }
    /** Тот же цвет с другим тоном — светлота и насыщенность (HSL) остаются. */
    function withHue(hex, h) {
      var c = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255 })
      var max = Math.max.apply(null, c), min = Math.min.apply(null, c), l = (max + min) / 2
      var s = max === min ? 0.45 : (max - min) / (1 - Math.abs(2 * l - 1))
      var k = function (n) { return (n + h / 30) % 12 }
      var a = s * Math.min(l, 1 - l)
      var f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))) }
      return '#' + [f(0), f(8), f(4)].map(function (v) { return Math.round(v * 255).toString(16).padStart(2, '0') }).join('').toUpperCase()
    }
    var edit = el('button', { type: 'button', class: 'lp-link', text: 'Build your own' })
    edit.addEventListener('click', function () { builder.open(); edit.hidden = true })
    if (custom()) { builder.node.hidden = false; edit.hidden = true }

    /* Обещания палитры: спокойный список; числа — для любопытных. */
    var promises = (function () {
      var list = el('ul', { class: 'lp-promises', 'aria-label': 'What this palette guarantees' })
      var numbers = el('div', { class: 'lp-numbers' })
      var num = function (r) { return r.unit === ':1' ? r.got + ':1' : r.unit === 'Lc' ? 'Lc ' + Math.round(r.got) : Math.round(r.got) + ' ' + r.unit }
      function refresh() {
        var p = custom() && paints ? paints : current().seed
        var g = choice.guarantees(p, catalog.steps)
        var bad = choice.clashes(names, pairs()).filter(function (c) { return c.x.field === 'palette' || c.y.field === 'palette' })
        list.replaceChildren.apply(list, g.map(function (x) {
          return el('li', { class: x.ok ? 'lp-ok' : 'lp-bad' }, [icon(x.ok ? TICK : CROSS), el('span', { text: x.label })])
        }).concat([el('li', { class: 'lp-ok' }, [icon(TICK), el('span', { text: 'Built for the light and the dark theme' })])])
          .concat(bad.length ? [el('li', { class: 'lp-bad' }, [icon(CROSS), el('span', { text: 'Not with ' + choice.title(catalog, bad[0].x.field === 'palette' ? bad[0].y.field : bad[0].x.field, bad[0].x.field === 'palette' ? bad[0].y.id : bad[0].x.id) + ' — ' + bad[0].why })])] : []))
        numbers.replaceChildren.apply(numbers, g.map(function (x) {
          var t = ['light', 'dark'].map(function (m) { return (m === 'light' ? 'Light ' : 'Dark ') + x.rows.filter(function (r) { return r.mode === m }).map(num).join(', ') }).join(' · ')
          return el('p', {}, [el('b', { text: x.label + ': ' }), t])
        }))
      }
      return { node: el('div', { class: 'lp-group' }, [el('span', { class: 'lp-legend', text: 'Guaranteed' }), list, el('details', { class: 'lp-more' }, [el('summary', { text: 'The numbers' }), numbers])]), refresh: refresh }
    })()

    /* ── Действия ──────────────────────────────────────────────────────── */

    var copy = el('button', { type: 'button', class: 'lp-act lp-quiet', text: 'Copy settings' })
    copy.addEventListener('click', function () {
      var text = JSON.stringify(body())
      var done = function () { status.textContent = 'Copied: ' + text }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { status.textContent = text })
      else status.textContent = text
    })
    var publish = el('button', { type: 'button', class: 'lp-act lp-main', text: 'Publish' })
    /* Опубликованное доходит до статических страниц пересчётом: первый
       запрос к языку запускает его и ещё получает прежнюю страницу. Панель
       просит каждый язык без cookie (как гость) и ждёт на главной блок
       нового вида — тогда вид действительно у всех. */
    function live(r) {
      var style = /<style[^>]*data-href="look"[^>]*>([\s\S]*?)<\/style>/
      var page = function (lang) {
        return fetch('/' + lang, { cache: 'no-store', credentials: 'omit' }).then(function (x) { return x.ok ? x.text() : '' }, function () { return '' })
      }
      var tries = 0
      var poll = function () {
        return page(r.main).then(function (html) {
          var m = html.match(style)
          if (m && m[1] === r.css) return true
          if (++tries > 20) return false
          return new Promise(function (done) { setTimeout(done, 500) }).then(poll)
        })
      }
      return Promise.all(r.langs.map(page)).then(poll)
    }
    publish.addEventListener('click', function () {
      publish.disabled = true
      status.textContent = 'Checking this combination — about a minute…'
      send('POST', 'publish', body()).then(function (r) {
        if (!r.ok) { publish.disabled = false; status.textContent = 'Not published: ' + (r.verdict ? r.verdict.join(' ') : r.error); return }
        status.textContent = 'Passed the check. Publishing…'
        return live(r).then(function (done) {
          publish.disabled = false
          status.textContent = done ? 'Published. Every visitor now sees this look.' : 'Published. Pages pick it up within a minute.'
        })
      }, function () { publish.disabled = false; status.textContent = 'Not published: no answer' })
    })
    var stop = el('button', { type: 'button', class: 'lp-act lp-quiet', text: 'Stop preview' })
    stop.addEventListener('click', function () {
      remember(OPEN, '1')
      var tag = document.getElementById('look-preview')
      if (tag) tag.remove()
      send('DELETE', 'preview').then(function () { location.reload() })
    })

    /* ── Разделы и подразделы ──────────────────────────────────────────── */

    var content = function (sub) {
      return (sub.hint ? [el('p', { class: 'lp-hint', text: sub.hint })] : [])
        .concat(sub.fields.map(function (f) { return group(f[0], f[1], f[0] === 'palette' ? edit : null) }))
        .concat(sub.id === 'color' ? [builder.node, promises.node] : [])
    }
    /* Подразделы, не влезшие в ряд, уходят вбок; недоступный край растворён. */
    var fade = function (bar) {
      var start = bar.scrollLeft > 1
      var end = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1
      if (start && end) bar.dataset.more = 'both'
      else if (start) bar.dataset.more = 'start'
      else if (end) bar.dataset.more = 'end'
      else delete bar.dataset.more
    }
    var sections = choice.sectionsOf(catalog).map(function (s) {
      var tab = el('button', { type: 'button', role: 'tab', class: 'lp-tab', id: 'lp-tab-' + s.id, 'aria-controls': 'lp-subs-' + s.id, text: s.name })
      var bar = el('div', { class: 'lp-subs', role: 'tablist', id: 'lp-subs-' + s.id, 'aria-label': s.name + ' sections' })
      var subs = s.subs.map(function (sub) {
        var b = el('button', { type: 'button', role: 'tab', class: 'lp-sub', id: 'lp-sub-' + sub.id, 'aria-controls': 'lp-pane-' + sub.id, text: sub.name })
        var pane = el('div', { role: 'tabpanel', class: 'lp-pane', id: 'lp-pane-' + sub.id, 'aria-labelledby': 'lp-sub-' + sub.id }, content(sub))
        b.addEventListener('click', function () { showSub(s.id, sub.id) })
        bar.appendChild(b)
        return { id: sub.id, tab: b, pane: pane }
      })
      tab.addEventListener('click', function () { show(s.id) })
      bar.addEventListener('keydown', function (e) { arrows(e, subs, function (x) { showSub(s.id, x.id) }) })
      bar.addEventListener('scroll', function () { fade(bar) }, { passive: true })
      return { id: s.id, tab: tab, bar: bar, subs: subs }
    })
    function arrows(e, list, go) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      var i = list.findIndex(function (p) { return p.tab.getAttribute('aria-selected') === 'true' })
      var next = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]
      go(next); next.tab.focus()
    }
    function showSub(section, id) {
      var s = sections.find(function (x) { return x.id === section })
      s.subs.forEach(function (x) {
        var on = x.id === id
        x.tab.setAttribute('aria-selected', String(on))
        x.tab.tabIndex = on ? 0 : -1
        x.pane.hidden = !on
        if (on && x.tab.scrollIntoView) x.tab.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      })
      remember(SUB + section, id)
      middle.scrollTop = 0
      fade(s.bar)
    }
    function show(id) {
      sections.forEach(function (s) {
        var on = s.id === id
        s.tab.setAttribute('aria-selected', String(on))
        s.tab.tabIndex = on ? 0 : -1
        s.bar.hidden = !on
        if (!on) s.subs.forEach(function (x) { x.pane.hidden = true })
      })
      var s = sections.find(function (x) { return x.id === id })
      var want = recall(SUB + id)
      showSub(id, s.subs.some(function (x) { return x.id === want }) ? want : s.subs[0].id)
      remember(TAB, id)
    }
    var tabs = el('div', { class: 'lp-tabs', role: 'tablist', 'aria-label': 'Look sections' }, sections.map(function (s) { return s.tab }))
    tabs.addEventListener('keydown', function (e) { arrows(e, sections, function (x) { show(x.id) }) })

    var close = el('button', { class: 'lp-x', type: 'button', popovertarget: 'lp-panel', popovertargetaction: 'hide', 'aria-label': 'Close' }, [icon(CROSS, 16)])
    /* Развернуть — панель широкая, варианты крупными образцами; свернуть —
       обратно в 360. На телефоне развёрнутая — шторка во всю высоту. Панель
       остаётся немодальной: страница под ней живая, изменения видны сразу. */
    var widen = el('button', { class: 'lp-widen', type: 'button', 'aria-controls': 'lp-panel' })
    function wide(on) {
      if (on) buildBig()
      panel.toggleAttribute('data-wide', on)
      widen.setAttribute('aria-label', on ? 'Collapse the panel' : 'Expand the panel')
      widen.replaceChildren(icon(on ? SHRINK : GROW, 14), el('span', { text: on ? 'Collapse' : 'Expand' }))
      widen.title = on ? 'Back to the narrow panel' : 'Show every option large, on the page and on the dark band'
      keepWide(on)
      sections.forEach(function (s) { fade(s.bar) })
    }
    widen.addEventListener('click', function () { wide(!panel.hasAttribute('data-wide')) })
    var middle = el('div', { class: 'lp-body' }, sections.flatMap(function (s) { return s.subs.map(function (x) { return x.pane }) }))
    var panel = el('div', { id: 'lp-panel', class: 'lp-panel', popover: 'manual', role: 'region', 'aria-label': 'Look' }, [
      el('div', { class: 'lp-top' }, [el('div', { class: 'lp-head' }, [el('p', { class: 'lp-title', text: 'Look' }), tabs, widen, close])].concat(sections.map(function (s) { return s.bar }))),
      middle,
      el('div', { class: 'lp-foot' }, [
        el('div', { class: 'lp-acts' }, [publish, copy, stop]),
        el('p', { class: 'lp-note', text: 'Publishing runs the site check on this combination first.' }),
        status,
      ]),
    ])
    /* Вход в панель — полоса «Look» у низа окна со своим местом (look.css,
       «Полоса «Look»», И354): видна с любого места страницы, страница держит
       место под неё сама (резерв нижней полосы), ни одна сумма под ней не
       прячется. В полосе одна цель у её конца, по своему содержимому:
       «Look», выбор словами, «Open». Открытая панель стоит на полосе, и та
       же цель её закрывает («Close»). */
    var bandWords = el('span', { class: 'lp-band-words' })
    var bandDraft = el('span', { class: 'lp-band-draft', text: 'Draft', hidden: true })
    var bandAct = el('span', { class: 'lp-band-act' })
    var bandBtn = el('button', { class: 'lp-band-btn', type: 'button', popovertarget: 'lp-panel', 'aria-expanded': 'false' }, [
      icon(SLIDERS, 16), el('span', { class: 'lp-band-name', text: 'Look' }), bandWords, bandDraft, bandAct,
    ])
    var band = el('div', { class: 'lp-band' }, [bandBtn])
    bandSync = function () {
      var open = bandBtn.getAttribute('aria-expanded') === 'true'
      var words = [custom() ? (paints && paints.name) || 'Custom' : choice.title(catalog, 'palette', names.palette), choice.title(catalog, 'face', names.face), choice.title(catalog, 'scale', names.scale)].join(' · ')
      bandWords.textContent = words
      bandDraft.hidden = !drafting
      bandAct.replaceChildren(el('span', { text: open ? 'Close' : 'Open' }), icon(UP, 14))
      bandBtn.setAttribute('aria-label', 'Look: ' + words + (drafting ? ', draft' : '') + '. ' + (open ? 'Close' : 'Open') + ' the panel')
    }
    document.body.appendChild(el('div', { class: 'lp' }, [band, panel]))
    wide(keptWide())
    show(recall(TAB) === 'admin' ? 'admin' : 'system')
    if (custom() && paints) { preview(); guard() }
    refresh()
    panel.addEventListener('toggle', function (e) {
      remember(OPEN, e.newState === 'open' ? '1' : null)
      bandBtn.setAttribute('aria-expanded', String(e.newState === 'open'))
      bandSync()
      if (e.newState === 'open') sections.forEach(function (s) { fade(s.bar) })
    })
    addEventListener('resize', later(function () { sections.forEach(function (s) { fade(s.bar) }) }, 100))
    if (recall(OPEN) === '1' && panel.showPopover) panel.showPopover()
    root.dataset.lookPanel = 'ready'
  }

  Promise.all([
    fetch(new URL('catalog.json', base).href).then(function (r) { return r.json() }),
    import(new URL('choice.mjs', base).href),
    fetch(new URL('state', base).href, { credentials: 'same-origin' }).then(function (r) { return r.json() }),
  ]).then(function (all) { build(all[0], all[1], all[2]) }).catch(function (e) { if (window.console) console.warn('look panel:', e) })
})()
