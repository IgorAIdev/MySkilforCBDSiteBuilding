/* Панель вида — выбор на самой витрине (look-panel/PANEL.md). Отдельный
   контейнер: простой скрипт, свои стили, ни React, ни кода сайта. Сайт
   подключает её одной строкой, пока LOOK_PICKER=on, и от неё ничего не
   берёт; всё её — в look-panel/, вход — /look-panel/.

   Что она делает с сайтом — только передаёт значения:
   · щелчок по варианту сразу красит страницу своим блоком
     `<style id="look-preview">` поверх опубликованного и пишет черновик вида
     на сервер (POST /look-panel/draft) — в черновом режиме сайт рисует
     черновик, другие гости видят опубликованное;
   · шапка — другая разметка: черновик и перезагрузка;
   · «Publish» — проверка сочетания (check:choice) и публикация без сборки.
   Вариант, который с текущими не носится, погашен: пары посчитаны правилом
   сайта при сборке каталога. */
(function () {
  var script = document.currentScript
  var base = new URL('.', script && script.src ? script.src : location.origin + '/look-panel/')
  var OPEN = 'look-panel-open'
  var TAB = 'look-panel-tab'
  var root = document.documentElement

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
  function remember(key, value) {
    try { value === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value) } catch (e) { /* без памяти */ }
  }
  function recall(key) {
    try { return sessionStorage.getItem(key) } catch (e) { return null }
  }
  function send(method, path, body) {
    return fetch(new URL(path, base).href, {
      method: method, credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) { return r.json().catch(function () { return { ok: r.ok } }) })
  }
  var cssText = function (vars) {
    return ':root{' + Object.keys(vars).map(function (k) { return k + ':' + vars[k] }).join(';') + '}'
  }

  function build(catalog, choice, state) {
    document.head.appendChild(el('link', { rel: 'stylesheet', href: new URL('look.css', base).href }))
    /* Шрифты-кандидаты — только в предпросмотре панели: образцы шрифтов
       набраны своим шрифтом. Опубликованный вид несёт свой шрифт с адреса
       сайта, к Google страница покупателя не ходит. */
    catalog.groups.face.forEach(function (f) { if (f.google) document.head.appendChild(el('link', { rel: 'stylesheet', href: f.google })) })

    var names = choice.complete((state.previewing && state.draft) || state.published || {}, catalog)
    var status = el('output', { class: 'lp-status', 'aria-live': 'polite' })
    var groups = []

    function preview() {
      var tag = document.getElementById('look-preview')
      if (!tag) { tag = el('style', { id: 'look-preview' }); document.head.appendChild(tag) }
      tag.textContent = cssText(choice.compose(names, catalog).look.vars)
    }
    function draft(reload) {
      status.textContent = 'Saving draft…'
      return send('POST', 'draft', names).then(function (r) {
        status.textContent = r.ok ? 'Draft saved — only you see it.' : 'Draft not saved: ' + (r.error || 'error')
        if (r.ok && reload) { remember(OPEN, '1'); location.reload() }
      }, function () { status.textContent = 'Draft not saved: no answer' })
    }
    function refresh() {
      groups.forEach(function (g) { g.refresh() })
    }

    function sample(field, o) {
      if (field === 'palette') {
        var dots = o.dots.light.map(function (c, i) { return el('i', { class: 'lp-dot', style: 'background:light-dark(' + c + ',' + o.dots.dark[i] + ')' }) })
        return el('span', { class: 'lp-dots', 'aria-hidden': 'true' }, dots)
      }
      if (field === 'button') {
        var style = Object.keys(o.vars).map(function (k) { return k + ':' + o.vars[k] }).join(';')
        return el('span', { class: 'lp-btn', style: style, 'aria-hidden': 'true', text: 'Aa' })
      }
      return null
    }
    function group(field, label) {
      var id = 'lp-why-' + field
      var line = el('p', { class: 'lp-why', id: id })
      var chips = catalog.groups[field].map(function (o) {
        var attrs = { type: 'button', class: 'lp-chip', 'data-id': o.id, title: o.line || null }
        if (field === 'face') attrs.style = 'font-family:' + o.stack /* образец — своим шрифтом; у пары — шрифтом заголовков */
        var chip = el('button', attrs, [sample(field, o), el('span', { text: o.name })])
        var reason = ''
        chip.addEventListener('click', function () {
          if (reason) { line.textContent = o.name + ': ' + reason; return }
          if (names[field] === o.id) return
          names[field] = o.id
          refresh()
          if (field === 'header') draft(true)
          else { preview(); draft(false) }
        })
        var tell = function () { if (reason) line.textContent = o.name + ': ' + reason }
        chip.addEventListener('pointerenter', tell)
        chip.addEventListener('focus', tell)
        chip.update = function () {
          var hit = choice.blockedBy(field, o.id, names, catalog.pairs)
          reason = hit ? 'not with ' + choice.title(catalog, hit.field, hit.id) + ' — ' + hit.why : ''
          chip.setAttribute('aria-pressed', String(names[field] === o.id))
          if (reason) { chip.setAttribute('aria-disabled', 'true'); chip.title = reason; chip.setAttribute('aria-describedby', id) }
          else { chip.removeAttribute('aria-disabled'); chip.title = o.line || ''; chip.removeAttribute('aria-describedby') }
          return reason
        }
        return chip
      })
      var legend = el('span', { class: 'lp-legend', id: id + '-l', text: label })
      var node = el('div', { class: 'lp-group' }, [legend, el('div', { class: 'lp-chips', role: 'group', 'aria-labelledby': id + '-l' }, chips), line])
      groups.push({ refresh: function () {
        var first = ''
        chips.forEach(function (c) { var r = c.update(); if (r && !first) first = c.lastChild.textContent + ': ' + r })
        line.textContent = first
      } })
      return node
    }

    var copy = el('button', { type: 'button', class: 'lp-act', text: 'Copy settings' })
    copy.addEventListener('click', function () {
      var text = JSON.stringify(names)
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
      send('POST', 'publish', names).then(function (r) {
        if (!r.ok) { publish.disabled = false; status.textContent = 'Not published: ' + (r.verdict ? r.verdict.join(' ') : r.error); return }
        status.textContent = 'Passed the check. Publishing…'
        return live(r).then(function (done) {
          publish.disabled = false
          status.textContent = done ? 'Published. Every visitor now sees this look.' : 'Published. Pages pick it up within a minute.'
        })
      }, function () { publish.disabled = false; status.textContent = 'Not published: no answer' })
    })
    var stop = el('button', { type: 'button', class: 'lp-act', text: 'Stop preview' })
    stop.addEventListener('click', function () {
      remember(OPEN, '1')
      var tag = document.getElementById('look-preview')
      if (tag) tag.remove()
      send('DELETE', 'preview').then(function () { location.reload() })
    })

    var tabs = [['system', 'System', [group('palette', 'Palette'), group('face', 'Typeface'), group('scale', 'Spacing'), group('button', 'Buttons')]],
      ['admin', 'Admin', [group('header', 'Header'), group('marker', 'Current menu item')]]]
    var bar = el('div', { class: 'lp-tabs', role: 'tablist' })
    var panes = tabs.map(function (t) {
      var tab = el('button', { type: 'button', role: 'tab', class: 'lp-tab', id: 'lp-tab-' + t[0], 'aria-controls': 'lp-pane-' + t[0], text: t[1] })
      var pane = el('div', { role: 'tabpanel', class: 'lp-pane', id: 'lp-pane-' + t[0], 'aria-labelledby': 'lp-tab-' + t[0] }, t[2])
      tab.addEventListener('click', function () { show(t[0]) })
      bar.appendChild(tab)
      return { id: t[0], tab: tab, pane: pane }
    })
    function show(id) {
      panes.forEach(function (p) {
        var on = p.id === id
        p.tab.setAttribute('aria-selected', String(on))
        p.tab.tabIndex = on ? 0 : -1
        p.pane.hidden = !on
      })
      remember(TAB, id)
    }
    bar.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      var i = panes.findIndex(function (p) { return p.tab.getAttribute('aria-selected') === 'true' })
      var next = panes[(i + (e.key === 'ArrowRight' ? 1 : panes.length - 1)) % panes.length]
      show(next.id); next.tab.focus()
    })

    var close = el('button', { class: 'lp-x', type: 'button', popovertarget: 'lp-panel', popovertargetaction: 'hide', 'aria-label': 'Close', text: '×' })
    var panel = el('div', { id: 'lp-panel', class: 'lp-panel', popover: 'manual', role: 'region', 'aria-label': 'Look' }, [
      el('div', { class: 'lp-head' }, [el('p', { class: 'lp-title', text: 'Look' }), bar, close]),
    ].concat(panes.map(function (p) { return p.pane })).concat([
      el('div', { class: 'lp-foot' }, [
        el('div', { class: 'lp-acts' }, [publish, copy, stop]),
        el('p', { class: 'lp-note', text: "I'll run the check on this combination before publishing" }),
        status,
      ]),
    ]))
    var open = el('button', { class: 'lp-open', type: 'button', popovertarget: 'lp-panel', text: 'Look' })
    document.body.appendChild(el('div', { class: 'lp' }, [open, panel]))
    show(recall(TAB) === 'admin' ? 'admin' : 'system')
    refresh()
    panel.addEventListener('toggle', function (e) { remember(OPEN, e.newState === 'open' ? '1' : null) })
    if (recall(OPEN) === '1' && panel.showPopover) panel.showPopover()
    root.dataset.lookPanel = 'ready'
  }

  Promise.all([
    fetch(new URL('catalog.json', base).href).then(function (r) { return r.json() }),
    import(new URL('choice.mjs', base).href),
    fetch(new URL('state', base).href, { credentials: 'same-origin' }).then(function (r) { return r.json() }),
  ]).then(function (all) { build(all[0], all[1], all[2]) }).catch(function () { /* нет каталога — нет панели */ })
})()
