---
name: rendered-checks-changed-pages
description: "Fix rounds re-measure only changed pages, Romanian only; the full rendered run over all languages happens once before handover"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b28bb6bf-8743-407f-ae68-12fe93a43055
  modified: 2026-09-23T13:13:07.440Z
---

On 23.09.2026 the owner decided how rendered checks run: «зачем гонять если не менялись — это логично», and to my offer «полную проверку на всех языках гонять только перед сдачей, а в промежуточных заходах — только румынский» answered «ДА».

**Why:** rendered checks (check:craft over pages × languages × themes × widths, sweep, browser scenarios) are the slowest part of every round. A full run of the storefront is 63 addresses: 14 page kinds × 3 languages plus 7 filled personal pages × 3. Re-measuring unchanged pages and extra languages in between costs the owner time and buys nothing.

**How to apply:**
- In implementer fix rounds and re-reviews, name the pages the change touches and have craft/sweep run only on those, in the main language (en for the reference storefront since 23.09.2026; filter with the craft page filter, e.g. `--page /en/`).
- File checks (tests, tsc, css, code, lint, port, build, open) still run in full every time; they are fast.
- Once, at final acceptance before integrating or handing over, run craft and sweep in full: all languages, both themes, personal pages. Hungarian is the longest language and catches overflows the others miss.

Related: [[take-recommended]], [[work-locally]].
