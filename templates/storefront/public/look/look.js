/* Панель «Look» — выбор вида витрины на самой витрине: шрифт, стиль кнопок,
   шапка. Отдельный контейнер: простой скрипт и свои стили, ни React, ни
   кода сайта. Сайт подключает её одной строкой, пока LOOK_PICKER=on, и от
   неё ничего не берёт; снимается она `npm run look:remove`.

   Что она делает с сайтом — только передаёт значения:
   · пишет cookie `look` ({ face, button, header }) — по нему сервер рисует
     страницу, пока идёт выбор (lib/look.ts);
   · шрифт и кнопки меняет сразу атрибутами на <html> — их CSS сайта уже
     умеет; шапка — другая разметка, и страница перезагружается;
   · шрифты для показа просит у Google Fonts, пока панель открыта или
     выбран не системный шрифт: сайт сам грузит только утверждённый.
   Файлов она не пишет: выбранное заказчик копирует кнопкой «Copy settings»
   и передаёт словами, а значения переписываются в lib/look.ts. */
(function () {
  var script = document.currentScript
  var base = new URL('.', script && script.src ? script.src : location.origin + '/look/')
  var root = document.documentElement
  var OPEN = 'look-panel-open'

  function el(tag, attrs, kids) {
    var n = document.createElement(tag)
    for (var k in attrs || {}) {
      if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue
      if (k === 'text') n.textContent = attrs[k]
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k])
    }
    ;(kids || []).forEach(function (c) { if (c) n.appendChild(c) })
    return n
  }
  function now() {
    return { face: root.dataset.face || 'system', button: root.dataset.button || '', header: root.dataset.header || 'classic' }
  }
  function save(c) {
    document.cookie = 'look=' + encodeURIComponent(JSON.stringify(c)) + '; path=/; max-age=31536000; samesite=lax'
  }
  function remember(open) {
    try { open ? sessionStorage.setItem(OPEN, '1') : sessionStorage.removeItem(OPEN) } catch (e) { /* без памяти */ }
  }
  function remembered() {
    try { return sessionStorage.getItem(OPEN) === '1' } catch (e) { return false }
  }

  var fontsAsked = false
  function fonts(faces) {
    if (fontsAsked) return
    fontsAsked = true
    var families = faces.filter(function (f) { return f.google }).map(function (f) { return 'family=' + f.google })
    families.push('family=IBM+Plex+Sans:wght@400;500;600;700')
    document.head.appendChild(el('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?' + families.join('&') + '&display=swap' }))
  }

  function build(opt) {
    document.head.appendChild(el('link', { rel: 'stylesheet', href: new URL('look.css', base).href }))
    var titleOf = function (name) { var b = opt.buttons.filter(function (x) { return x.name === name })[0]; return b ? b.title : name }
    var nameOf = function (list, id) { var x = list.filter(function (i) { return i.id === id })[0]; return x ? x.name : id }
    var line = el('p', { class: 'lp-now', 'aria-live': 'polite' })
    var status = el('output', {})
    function say() {
      var c = now()
      line.textContent = 'Current: ' + nameOf(opt.faces, c.face) + ' · ' + titleOf(c.button) + ' · ' + nameOf(opt.headers, c.header)
    }
    function group(title, items) {
      return el('fieldset', {}, [el('legend', { text: title })].concat(items))
    }
    function radio(name, value, checked, disabled, onPick, body) {
      var input = el('input', { type: 'radio', name: 'lp-' + name, value: value, checked: checked, disabled: disabled })
      input.addEventListener('change', onPick)
      return el('label', { class: 'lp-opt', 'aria-disabled': disabled ? 'true' : null }, [input].concat(body))
    }
    var c = now()

    var faceItems = opt.faces.map(function (f) {
      return radio('face', f.id, c.face === f.id, false, function () {
        root.dataset.face = f.id; save(now()); say()
      }, [el('span', { class: 'lp-txt lp-face', 'data-face': f.id }, [el('b', { text: f.name }), el('small', { text: 'CBD oil 10 % · 129.90 lei · ș ț ă î â ő ű' })])])
    })
    var buttonItems = opt.buttons.map(function (b) {
      var body = [el('span', { text: b.title })]
      if (b.on) body.push(el('span', { class: 'lp-pair', 'data-button': b.name, 'aria-hidden': 'true' }, [el('span', { class: 'lp-b', 'data-loud': true, text: 'Add to cart' }), el('span', { class: 'lp-b', text: 'Details' })]))
      else body.push(el('span', { class: 'lp-pair lp-small', text: b.why }))
      return radio('button', b.name, c.button === b.name, !b.on, function () {
        root.dataset.button = b.name; save(now()); say()
      }, body)
    })
    var headerItems = opt.headers.map(function (h) {
      return radio('header', h.id, c.header === h.id, false, function () {
        var next = now(); next.header = h.id; save(next); remember(true); location.reload()
      }, [el('span', { class: 'lp-txt' }, [el('span', { text: h.name }), el('span', { class: 'lp-small', text: h.line })])])
    })

    var copy = el('button', { type: 'button', text: 'Copy settings' })
    copy.addEventListener('click', function () {
      var x = now()
      var text = "LOOK = { face: '" + x.face + "', button: '" + x.button + "', header: '" + x.header + "' }"
      var done = function () { status.textContent = 'Copied: ' + text }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { status.textContent = text })
      else status.textContent = text
    })

    var close = el('button', { class: 'lp-x', type: 'button', popovertarget: 'lp-panel', popovertargetaction: 'hide', 'aria-label': 'Close', text: '×' })
    var panel = el('div', { id: 'lp-panel', class: 'lp-panel', popover: 'manual', role: 'region', 'aria-label': 'Look' }, [
      el('div', { class: 'lp-head' }, [el('p', { class: 'lp-title', text: 'Look' }), close]),
      line,
      el('div', { class: 'lp-copy' }, [copy, status]),
      group('Typeface', faceItems),
      group('Buttons', buttonItems),
      group('Header', headerItems),
    ])
    var open = el('button', { class: 'lp-open', type: 'button', popovertarget: 'lp-panel', text: 'Look' })
    document.body.appendChild(el('div', { class: 'lp' }, [open, panel]))
    say()
    panel.addEventListener('toggle', function (e) {
      var shown = e.newState === 'open'
      remember(shown)
      if (shown) fonts(opt.faces)
    })
    if (c.face !== 'system') fonts(opt.faces)
    if (remembered() && panel.showPopover) panel.showPopover()
  }

  fetch(new URL('options.json', base).href).then(function (r) { return r.json() }).then(build).catch(function () { /* нет вариантов — нет панели */ })
})()
