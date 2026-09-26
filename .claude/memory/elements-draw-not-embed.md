---
name: elements-draw-not-embed
description: Owner-sent buttons/controls go into kit elements/ as drawings with tags; never embed until chosen; strip shadows; show hover/press at once
metadata:
  node_type: memory
  type: feedback
  originSessionId: 93704e0b-587c-4e86-b25c-62691a9d26cb
  modified: 2026-09-24T12:14:16.143Z
---

When the owner sends a control (screenshot, Tailwind code, link) — draw it into the kit's `elements/NN-name/` (source + `element.html`), register it in `elements/elements.json` with kind, style family and vocabulary tags, rebuild `elements/index.html` via `node tools/elements.mjs`, and show it inline in chat (show_widget). Do NOT touch `styles/buttons.json`, `btn.module.css`, the panel or the site until the owner picks it.

**Why:** 24.09.2026 I started embedding a screenshot as a catalog axis (reversing И273); owner: «ты их просто рисуй нам в папку… встраивать пока не нужно, мы ж ещё не выбрали». Then: «лишнее типа тени убирай сразу. думай над нажатым и наведением состояния сразу как показываешь — это правило». He also wants elements tagged so same-style items can be offered together, stored with the kit/panel side, site separable.

Also «все кнопки и всё остальное оптимизируй, приводи к единой форме»: every drawing stands on the one base `elements/base.css` (kit numbers), differs only by its attributes, icons only from the kit sheet via generated `elements/icons.js`; the audit refuses own styles/colours (И337).

Show the owner ONLY screenshots of the real element pages (`node tools/elements.mjs --shots NN`, PLAYWRIGHT from D:/BusinessProject/cbd-storefront-demo/node_modules/playwright/index.mjs), viewed by me first — never a hand-copied chat widget: the chat host restyles pressed buttons/switches (heart became a black square), owner: «ты ж смотри что ты делаешь» (И339).

**How to apply:** strip extras (shadow, blur, hover background flood) immediately and list them in `снято`; design hover/press/focus per И273 (hover = colour only, press = deeper colour + 0.97 + 1px down) and show them frozen side by side (`data-state`); when shadow removal makes a white-on-white body invisible, give it a tonal fill ≥1.15 : 1. Rule text: CLAUDE.md «Присланный элемент — рисуется, а не встраивается», docs/rules.md И336. Related: [[look-panel-architecture]], [[design-with-skills]].
