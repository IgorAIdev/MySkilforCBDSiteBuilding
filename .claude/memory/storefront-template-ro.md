---
name: storefront-template-ro
description: "The kit's reference storefront is a template for the Romanian market — languages en (default since 23.09.2026), ro, hu; working copy in D:\\BusinessProject\\cbd-storefront-demo"
metadata:
  node_type: memory
  type: project
  originSessionId: b28bb6bf-8743-407f-ae68-12fe93a43055
  modified: 2026-09-26T13:06:34.424Z
---

Decided 23.09.2026 by the owner: the reference Next.js CBD storefront built inside the kit (`templates/storefront/`, variant A — own app on the kit foundation, one data contract, sample provider + live Vendure/Payload adapters) is a **template for the Romanian market**: languages Romanian (default), English, Hungarian. Scope: full guest purchase **plus personal account** (register, login, logout, password reset, orders, addresses, profile). Working copy installed by the kit installer into `D:\BusinessProject\cbd-storefront-demo`.

**Why:** the owner builds CBD shop storefronts; the kit needs an "эталон" to build from scratch and to audit other sites against.

**Since 25–26.09.2026:** the template is run and edited without the demo.
- `npm run storefront` installs it into `.storefront/` inside the kit and applies the owner's look from `showcase/`. It watches `templates/storefront/`: edit the template, never the copy (a hook blocks edits to the copy).
- The demo folder is legacy and exists only on the old machine.
- The skill's storefront at an address runs on the owner's Coolify as the separate app `skill-storefront` in project `skill`. It is never mixed with the shops' code or apps (cbdin, cbdshop); only the cbdin.ro address was given to it.
- Its address is **cbdin.ro**. The owner decided on 26.09.2026: «то что сейчас там стоит можно заменить». The shop's storefront3 placeholder stood there. Sample orders on it don't matter for now: «да похуй на заказ, это неважно сейчас». Deploy with `npm run storefront:server -- --domain cbdin.ro`.
- `npm run storefront:server` sets it up and deploys it. It needs `COOLIFY_URL` and `COOLIFY_TOKEN`, which the cloud session has.
- A look published in the panel there goes back into the skill with `npm run storefront -- --save-look --from <address>`.

**How to apply:** market facts (RON, ramburs, easybox lockers, ANPC/SOL footer links, ș ț diacritics) are part of the template; texts and legal facts stay owner-approved. On 23.09.2026 the owner said «делай все текста на англ.»: the reference storefront opens in English (DEFAULT_LANG en), and ro/hu stay as market languages. A real RO shop puts ro back at install. Canvas width is 1440 (owner). The owner picks the typeface, button style and header variant in the demo's «Look» panel (LOOK_PICKER=on in the demo .env). Related: [[skill-goal]].
