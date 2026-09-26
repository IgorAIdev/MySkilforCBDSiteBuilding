---
name: element-choices
description: "the owner's take/edit/skip decisions on kit elements live in elements/choices.json, written by the selection page at localhost:4181"
metadata:
  node_type: memory
  type: project
  originSessionId: e07e204a-da24-4cec-81bd-97e489a95ba1
  modified: 2026-09-24T23:28:42.694Z
---

On 25.09.2026 the owner asked for «страницу со всеми кнопками формами панелями… чтобы я мог посмотреть и выбрать и правки хотеть».

**What was built:**
- A local page, not an Artifact. The elements change all the time, and an Artifact would have been a stale snapshot.
- Server: `pick/server.mjs` in session e07e204a's scratchpad, run as launch config «pick», at http://localhost:4181/.
- On every request it renders every element from `elements/elements.json` as live `element.html` iframes, grouped by kind.
- Each element has «Беру / Правка / Не беру» and a note field. At the top there is a general-wishes field.

**Decisions** go to `elements/choices.json`, in this shape: `{choices: {NN: {name, verdict: take|edit|skip|null, note, at}}, general: {text, at}}`.

**Why:** these decisions are the owner's word on which elements go into the look panel or the shop, and what to fix.

**How to apply:**
- When the owner says they have marked things («посмотри выбор», «я отметил»), read `elements/choices.json`.
- Relay the edits to the session that owns `elements/`, by number (see [[one-writer-shared-tree]]).
- «Беру» on a «новая часть магазина» element means adding a new storefront feature; that is the owner's call, now made.
- If the scratchpad is gone, rebuild the page, don't guess.
