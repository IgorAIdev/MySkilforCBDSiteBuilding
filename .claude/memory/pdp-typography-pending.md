---
name: pdp-typography-pending
description: Owner asked 25.09.2026 to review product page font-size ratios and block spacing via design skills — not done yet
metadata:
  node_type: memory
  type: project
  originSessionId: 81b84f48-3eab-40db-90dd-c29d6d4e4df4
  modified: 2026-09-26T11:44:54.220Z
---

Owner (25.09.2026, screenshot of /en/product/…): «размеры шрифтов, их соотношение мне кажется неправильным… и пересмотри всё скилом в карточке, даже расстояния между блоками неверное».
Structure part was done and merged (brand line, order, no price on button, quick-order dialog — И440–И442). The typography/spacing review itself was NOT done: product name (--pagehead-*) and price (--h3-*) are both large and compete.

**Why:** session ran out at the owner's "finish and push"; the review was started (context read, page rendered) but no change made.
**How to apply:** start next session on this — impeccable critique → typeset/layout on templates/storefront/components/ProductView.module.css, fix via scale roles (not numbers), show rendered at several widths. Related: [[design-with-skills]].
