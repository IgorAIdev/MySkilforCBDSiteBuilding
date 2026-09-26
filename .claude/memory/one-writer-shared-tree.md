---
name: one-writer-shared-tree
description: "several sessions share D:\\BusinessProject\\SkillSiteBuilding; elements/ has one owning session, others forward to it instead of writing"
metadata:
  node_type: memory
  type: project
  originSessionId: e07e204a-da24-4cec-81bd-97e489a95ba1
  modified: 2026-09-24T17:07:29.946Z
---

Several Claude sessions run in the same working tree (branch claude/elements), not in separate worktrees. On 24.09.2026 the owner pasted design sources into two sessions at once. The session «Кнопки дизайн» owned `elements/`, `elements.json`, `base.css` and `tools/elements.mjs`. The second session wrote nothing there: it checked each paste against the folder with grep (to catch repeats), then forwarded new sources with `send_message`. The owner accepted this flow and kept sending.

**Why:** two writers on one catalog overwrite each other's `elements.json` and `base.css`. Also, a stray commit from a third session (a175f1e) landed in the middle of the owner session's uncommitted work.

**How to apply:** before writing into `elements/` (see [[elements-draw-not-embed]]), check `list_sessions` for a running session with the same cwd. If one owns the folder, forward to it: give the source as sent, what is on it, the nearest existing number, and the owner's words. Find elements by kind with `node tools/elements.mjs --list <род>`. Screenshots in the scratchpad are temporary: tell the owning session to copy them in as `source.png`.
