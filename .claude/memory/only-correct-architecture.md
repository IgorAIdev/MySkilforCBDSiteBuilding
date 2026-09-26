---
name: only-correct-architecture
description: "Before any decision or implementer brief, name the owning layer (palette/scale/primitive/control module/data); never write a shortcut in the wrong layer, even temporarily"
metadata:
  node_type: memory
  type: feedback
  originSessionId: b28bb6bf-8743-407f-ae68-12fe93a43055
  modified: 2026-09-24T10:57:00.000Z
---

On 24.09.2026 the owner said: «если б я не спросил, ты бы сделал неправильно с точки зрения правильной архитектуры. Это запрещено… делать нужно только правильно». He was reacting to my brief, which told an implementer to mix the button's trailing-chevron tones with `color-mix(… 60% …)` inside the button CSS instead of making them palette roles computed by the builder.

**Why:** a value made in the wrong layer escapes that layer's guarantees (contrast, single source, the panel). Only the owner's question caught it. The kit's green checks didn't, because nothing measured it.

**How to apply:**
- Before deciding where something lives, and in EVERY brief, name the owning layer:
  - colour: palette builder → role;
  - size and spacing: scale builder → role;
  - layout: primitive;
  - control behaviour: its module;
  - values: data.
- If the layer can't do it, extend the layer first.
- Never accept «пока / для образца / проверки зелёные».
- Review my own briefs for wrong-layer shortcuts before dispatching.

The rule is in `CLAUDE.md` «Делается только правильно».

Related: [[design-with-skills]], [[look-panel-architecture]].
