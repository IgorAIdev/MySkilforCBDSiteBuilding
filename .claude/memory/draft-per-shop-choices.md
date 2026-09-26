---
name: draft-per-shop-choices
description: "Things each shop decides for itself (carriers, payment providers, etc.) get rough draft options in the skill, not verified research"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b28bb6bf-8743-407f-ae68-12fe93a43055
  modified: 2026-09-23T08:18:48.175Z
---

On 23.09.2026, while I built a per-country carrier registry with source-per-fact tests, the owner said: «с доставками не нужна суперточность, это будет решаться в каждом конкретном магазине отдельно. сейчас накидай черновых вариантов».

**Why:** the kit is universal; which carriers (or similar per-market vendors) a shop uses is decided and verified per shop at launch. Heavy verification in the kit is wasted effort.

**How to apply:** for per-shop choices, give the skill a draft list of options per market (marked draft), a mechanism that treats them as data, and a step «verify before launch» — not exhaustive sourced research or strict tests on the facts. Precision goes into the mechanism (code, tests), not into the vendor list. Related: [[skill-goal]], [[take-recommended]].
