# Lighthouse CI configuration

Copy `lighthouserc.cjs` into the site's tooling folder and install a pinned
`@lhci/cli` development dependency. Merge `package-fragment.json` into the existing
package.json without overwriting other settings, then regenerate the lockfile.
Tested: CLI 0.15.1 with Lighthouse 13.5.0 and patched tmp/uuid overrides. The
unmodified CLI dependency tree included known advisories; do not drop overrides
without rerunning dependency audit and the real browser pipeline.
Run after a production build: `lhci autorun --config=path/lighthouserc.cjs`.
Defaults: static `dist`, `http://localhost/`, three runs, local reports only.
Override SITE_AUDIT_DIST and SITE_AUDIT_URLS for real static pages. For SSR,
adapt collection to a production server; do not serve SSR output as static HTML.
Review budgets before adopting the profile. Never turn findings off just to pass.
Keep reports private if they contain project/customer information.
This original configuration uses Lighthouse CI's API; it does not copy the
upstream project's lint exceptions. Install tool licenses accompany npm packages.
