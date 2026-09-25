export const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const heading = '<p class="eyebrow">СЕВЕР / МАСТЕРСКАЯ ИНТЕРЬЕРОВ</p><h1>Меньше случайного.<br>Больше вашего.</h1>'
const lead = '<p class="lead">Создаём спокойные пространства, в которых удобно жить. Начинаем с человека, а не с набора материалов.</p><a class="action" href="#approach">Посмотреть подход <span aria-hidden="true">↗</span></a>'
const variants = {
  split: () => '<section class="hero" data-layout="split"><div>' + heading + '</div><div>' + lead + '</div></section>',
  stacked: () => '<section class="hero" data-layout="stacked">' + heading + lead + '</section>',
}
export function renderPage(design, content) {
  const cards = content.state === 'unavailable' ? '<p role="alert">Материалы временно недоступны. Повторите загрузку позже.</p>' : content.items.map(item => '<article><span class="eyebrow">' + escape(item.id) + '</span><h2>' + escape(item.title) + '</h2><p>' + escape(item.text) + '</p></article>').join('')
  return '<a class="skip" href="#main">К содержимому</a><header class="wrap"><a href="/" class="brand" translate="no">Север</a><nav aria-label="Главная навигация"><a href="#approach">Наш подход</a></nav></header><main id="main" class="wrap">' + variants[design.layout]() + '<section id="approach" class="cards">' + cards + '</section><p class="notice">Демонстрационный проект для проверки переносимой основы. Не реальная компания.</p></main><footer class="wrap">Пространство начинается с внимания.</footer>'
}
export function pageHtml(body, { editor = false, tokenCss = '' } = {}) {
  return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Север · мастерская интерьеров</title><link rel="stylesheet" href="site.css">' + (editor ? '<link rel="stylesheet" href="/editor.css"><link id="layout" rel="stylesheet" href="/variants/split.css"><style id="tokens">' + tokenCss + '</style>' : '<link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="layout.css">') + '</head><body><div id="site">' + body + '</div>' + (editor ? '<aside id="studio" aria-label="Настройки дизайна"></aside><script type="module" src="/editor.mjs"></script>' : '') + '</body></html>'
}
export const cssTokens = tokens => ':root{' + Object.entries(tokens).map(([key, value]) => key + ':' + value).join(';') + '}'
