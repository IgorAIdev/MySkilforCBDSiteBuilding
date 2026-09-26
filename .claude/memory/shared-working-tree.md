---
name: shared-working-tree
description: "several Claude sessions write in the same SkillSiteBuilding working tree and branch; coordinate before committing, add only own paths"
metadata:
  node_type: memory
  type: project
  originSessionId: 93704e0b-587c-4e86-b25c-62691a9d26cb
  modified: 2026-09-26T13:06:36.924Z
---

Several Claude sessions run at once in D:\BusinessProject\SkillSiteBuilding
(same working tree, same branch — e.g. claude/elements on 24.09.2026: the
elements keeper, «Карточки товара», «Дизайн страницы…», plus the integration
session «Skill ecommerce проверка и интеграция» that fast-forwards main).
A commit a175f1e appeared on claude/elements from a third session, and
untracked element 64 files showed up mid-work.

**Why:** a blanket `git add elements` or `-A` would sweep another session's
unfinished files into my commit, and a full regeneration of a shared catalog
(elements/elements.json) would erase their entries.

**Never switch the branch of the shared tree.** On 26.09.2026 I created my branch with `git switch -c` in the shared folder while it stood on another session's `claude/pdp-type`. That moved everyone's tree onto my branch. I switched it back within seconds. Start your own work in a separate worktree instead: `git worktree add <dir> -b claude/<name> origin/main`.

**How to apply:** check `git status` for untracked or foreign changes before
committing; `git add` only my own paths; SendMessage the other writer before
committing on a shared branch and agree numbers and shared files (base.css,
catalog) up front; regeneration keeps entries it didn't create. See
[[elements-draw-not-embed]], [[work-locally]].
