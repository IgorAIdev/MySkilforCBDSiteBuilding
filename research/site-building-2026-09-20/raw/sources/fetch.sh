#!/usr/bin/env bash
# Снимок первоисточников исследования «сборка сайта профессионально» (20.09.2026).
# Запуск: bash fetch.sh — кладёт файлы в подпапки рядом и пишет MANIFEST.tsv
# (группа, файл, url, http-код, байты, дата). Файлы не правятся руками —
# это чужие тексты на дату снимка (research/README.md, правило снимка).
set -u
cd "$(dirname "$0")"
DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
: > MANIFEST.tsv
printf 'group\tfile\turl\thttp\tbytes\tfetched\n' >> MANIFEST.tsv

get() { # get <группа> <имя файла> <url>
  local group=$1 name=$2 url=$3 code bytes
  mkdir -p "$group"
  if [ -s "$group/$name" ]; then
    printf '%s\t%s\t%s\tcached\t%s\t%s\n' "$group" "$name" "$url" "$(stat -c %s "$group/$name")" "$DATE" >> MANIFEST.tsv; return
  fi
  code=$(curl -L --silent --show-error --max-time 90 -A 'Mozilla/5.0 (research snapshot; cbdshop)' -o "$group/$name" -w '%{http_code}' "$url" 2>>fetch.log || echo "000")
  bytes=$(stat -c %s "$group/$name" 2>/dev/null || echo 0)
  if [ "$code" != "200" ] || [ "$bytes" -lt 200 ]; then rm -f "$group/$name"; fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$group" "$name" "$url" "$code" "$bytes" "$DATE" >> MANIFEST.tsv
}

# --- Файлы токенов: пространство, размеры, типографика ---------------------
get radix-themes space.css        https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/space.css
get radix-themes radius.css       https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/radius.css
get radix-themes typography.css   https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/typography.css
get radix-themes scaling.css      https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/scaling.css
get radix-themes shadow.css       https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/shadow.css
get radix-themes docs-spacing.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/spacing.mdx

get radix-themes docs-typography.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/typography.mdx
get radix-themes docs-color.mdx   https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/color.mdx
get radix-themes docs-dark-mode.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/dark-mode.mdx
get radix-themes docs-shadows.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/shadows.mdx
get radix-themes docs-radius.mdx  https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/radius.mdx

get tailwind theme.css            https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/theme.css
get tailwind preflight.css        https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/preflight.css
get tailwind docs-theme.mdx       https://raw.githubusercontent.com/tailwindlabs/tailwindcss.com/main/src/docs/theme.mdx
get tailwind docs-responsive.mdx  https://raw.githubusercontent.com/tailwindlabs/tailwindcss.com/main/src/docs/responsive-design.mdx
get tailwind docs-colors.mdx      https://raw.githubusercontent.com/tailwindlabs/tailwindcss.com/main/src/docs/colors.mdx
get tailwind docs-dark-mode.mdx   https://raw.githubusercontent.com/tailwindlabs/tailwindcss.com/main/src/docs/dark-mode.mdx













get carbon docs-spacing-overview.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/spacing/overview.mdx
get carbon docs-spacing-code.mdx  https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/spacing/code.mdx
get carbon docs-grid-overview.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/2x-grid/overview.mdx
get carbon docs-color-overview.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/color/overview.mdx
get carbon docs-color-usage.mdx   https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/color/usage.mdx
get carbon docs-color-tokens.mdx  https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/color/tokens.mdx
get carbon docs-typography-overview.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/typography/overview.mdx
get carbon docs-typography-scale.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/typography/type-sets.mdx
get carbon docs-themes-overview.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/themes/overview.mdx
get carbon docs-motion-overview.mdx https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/elements/motion/overview.mdx












get primer docs-size.mdx          https://raw.githubusercontent.com/primer/design/main/content/foundations/primitives/size.mdx
get primer docs-layout.mdx        https://raw.githubusercontent.com/primer/design/main/content/foundations/layout.mdx
get primer docs-color-overview.mdx https://raw.githubusercontent.com/primer/design/main/content/foundations/color/overview.mdx

get primer docs-token-names.mdx   https://raw.githubusercontent.com/primer/design/main/content/foundations/primitives/token-names.mdx
get primer docs-typography.mdx    https://raw.githubusercontent.com/primer/design/main/content/foundations/typography.mdx










get polaris space.ts              https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/space.ts
get polaris color.ts              https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/color.ts
get polaris font.ts               https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/font.ts
get polaris shadow.ts             https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/shadow.ts
get polaris border.ts             https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/border.ts
get polaris motion.ts             https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/motion.ts
get polaris breakpoints.ts        https://raw.githubusercontent.com/Shopify/polaris/main/polaris-tokens/src/themes/base/breakpoints.ts








get open-props props.sizes.css    https://raw.githubusercontent.com/argyleink/open-props/main/src/props.sizes.css
get open-props props.fonts.css    https://raw.githubusercontent.com/argyleink/open-props/main/src/props.fonts.css
get open-props props.easing.css   https://raw.githubusercontent.com/argyleink/open-props/main/src/props.easing.css
get open-props props.shadows.css  https://raw.githubusercontent.com/argyleink/open-props/main/src/props.shadows.css
get open-props props.borders.css  https://raw.githubusercontent.com/argyleink/open-props/main/src/props.borders.css
get open-props props.media.css    https://raw.githubusercontent.com/argyleink/open-props/main/src/props.media.css
get open-props props.animations.css https://raw.githubusercontent.com/argyleink/open-props/main/src/props.animations.css











get utopia core-readme.md         https://raw.githubusercontent.com/trys/utopia-core/main/README.md
get utopia core-index.ts          https://raw.githubusercontent.com/trys/utopia-core/main/src/index.ts
get utopia space-calculator.html  https://utopia.fyi/space/calculator
get utopia type-calculator.html   https://utopia.fyi/type/calculator
get utopia blog-fluid-type.html   https://utopia.fyi/blog/designing-with-fluid-type-scales
get utopia blog-modular-scales.html https://utopia.fyi/blog/css-modular-scales
get utopia blog-clamp.html        https://utopia.fyi/blog/clamp

# --- Цвет ---------------------------------------------------------------------
get radix-colors light.ts         https://raw.githubusercontent.com/radix-ui/colors/main/src/light.ts
get radix-colors dark.ts          https://raw.githubusercontent.com/radix-ui/colors/main/src/dark.ts


get radix-colors docs-understanding-the-scale.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/colors/docs/palette-composition/understanding-the-scale.mdx
get radix-colors docs-composing-a-palette.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/colors/docs/palette-composition/composing-a-palette.mdx
get radix-colors docs-usage.mdx   https://raw.githubusercontent.com/radix-ui/website/main/data/colors/docs/overview/usage.mdx
get material-color hct.ts         https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/hct/hct.ts
get material-color tonal_palette.ts https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/palettes/tonal_palette.ts
get material-color dynamic_scheme.ts https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/dynamic_scheme.ts
get material-color material_dynamic_colors.ts https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/material_dynamic_colors.ts
get material-color contrast.ts    https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/contrast/contrast.ts
get material-color readme.md      https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/README.md
get apca nutshell.md              https://raw.githubusercontent.com/Myndex/SAPC-APCA/master/documentation/APCA_in_a_Nutshell.md
get apca readme.md                https://raw.githubusercontent.com/Myndex/SAPC-APCA/master/README.md
get apca why-apca.md              https://raw.githubusercontent.com/Myndex/SAPC-APCA/master/documentation/WhyAPCA.md
get oklab ottosson-oklab.html     https://bottosson.github.io/posts/oklab/
get oklab evil-martians-oklch.html https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl
get w3c css-color-4.html          https://www.w3.org/TR/css-color-4/
get w3c css-color-5.html          https://www.w3.org/TR/css-color-5/

# --- Спецификации, W3C, доступность, i18n --------------------------------------
get w3c dtcg-format.html          https://tr.designtokens.org/format/
get w3c text-size-in-translation.html https://www.w3.org/International/articles/article-text-size/
get w3c qa-lang-why.html          https://www.w3.org/International/questions/qa-lang-why
get wcag contrast-minimum.html    https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
get wcag non-text-contrast.html   https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
get wcag resize-text.html         https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
get wcag reflow.html              https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
get wcag text-spacing.html        https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
get wcag target-size-minimum.html https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
get wcag focus-visible.html       https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
get wcag status-messages.html     https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
get wcag apg-patterns.html        https://www.w3.org/WAI/ARIA/apg/patterns/
get wcag apg-dialog.html          https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
get wcag apg-menu.html            https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
get wcag apg-disclosure.html      https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
get wcag apg-carousel.html        https://www.w3.org/WAI/ARIA/apg/patterns/carousel/

# --- MDN (markdown из репозитория содержимого) ---------------------------------







































# --- Витрина, скорость, методология --------------------------------------------
get vercel web-interface-guidelines.md https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
get webdev vitals.html            https://web.dev/articles/vitals
get webdev lcp.html               https://web.dev/articles/lcp
get webdev inp.html               https://web.dev/articles/inp
get webdev cls.html               https://web.dev/articles/cls
get webdev optimize-lcp.html      https://web.dev/articles/optimize-lcp
get webdev font-best-practices.html https://web.dev/articles/font-best-practices
get webdev new-responsive.html    https://web.dev/articles/new-responsive
get webdev prefers-color-scheme.html https://web.dev/articles/prefers-color-scheme
get webdev animations-guide.html  https://web.dev/articles/animations-guide
get webdev performance-budgets.html https://web.dev/articles/performance-budgets-101
get webdev theme-switch.html      https://web.dev/articles/building/a-theme-switch-component
get webdev forms.html             https://web.dev/learn/forms/
get baymard checkout-form-fields.html https://baymard.com/blog/checkout-flow-average-form-fields
get baymard mobile-ecommerce-ux.html https://baymard.com/blog/mobile-ecommerce-ux
get baymard product-list-ux.html  https://baymard.com/blog/product-list-ux
get baymard product-page-ux.html  https://baymard.com/blog/product-page-ux
get baymard homepage-category-ux.html https://baymard.com/blog/homepage-and-category-ux
get baymard ecommerce-search-ux.html https://baymard.com/blog/ecommerce-search-ux
get baymard ecommerce-navigation-ux.html https://baymard.com/blog/ecommerce-navigation-ux
get baymard breadcrumbs.html      https://baymard.com/blog/breadcrumbs
get baymard cart-ux.html          https://baymard.com/blog/cart-ux
get nng design-systems-101.html   https://www.nngroup.com/articles/design-systems-101/
get nng hamburger-menus.html      https://www.nngroup.com/articles/hamburger-menus/
get nng mobile-navigation-patterns.html https://www.nngroup.com/articles/mobile-navigation-patterns/
get method atomic-design-ch2.html https://atomicdesign.bradfrost.com/chapter-2/
get method atomic-design-ch5.html https://atomicdesign.bradfrost.com/chapter-5/
get method cube-css.html          https://cube.fyi/
get method build-excellent-websites.html https://buildexcellentwebsit.es/
get method itcss-xfive.html       https://www.xfive.co/blog/itcss-scalable-maintainable-css-architecture/
get method modern-css-reset.html  https://piccalil.li/blog/a-more-modern-css-reset/
get method every-layout-modular-scale.html https://every-layout.dev/rudiments/modular-scale/
get method every-layout-axioms.html https://every-layout.dev/rudiments/axioms/
get method every-layout-stack.html https://every-layout.dev/layouts/stack/
get method every-layout-center.html https://every-layout.dev/layouts/center/
get method every-layout-global-local.html https://every-layout.dev/rudiments/global-and-local-styling/
get method curtis-space-in-design-systems.html https://nathanacurtis.substack.com/p/space-in-design-systems-188bcbae0d62
get method curtis-tokens-in-design-systems.html https://nathanacurtis.substack.com/p/tokens-in-design-systems-25dd82d58421
get method curtis-naming-tokens.html https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676
get method refactoring-ui-color-palette.html https://www.refactoringui.com/previews/building-your-color-palette
get method josh-comeau-pixels-a11y.html https://www.joshwcomeau.com/css/surprising-truth-about-pixels-and-accessibility/
get method adrian-roselli-responsive-type-zoom.html https://adrianroselli.com/2019/12/responsive-type-and-zoom.html
get method design-system-checklist.html https://www.designsystemchecklist.com/
get material m3-spacing.html      https://m3.material.io/foundations/layout/understanding-layout/spacing

get material m3-color-roles.html  https://m3.material.io/styles/color/roles
get material m3-color-system.html https://m3.material.io/styles/color/system/how-the-system-works
get material m3-type-scale.html   https://m3.material.io/styles/typography/type-scale-tokens
get material m3-motion.html       https://m3.material.io/styles/motion/overview
get material m3-elevation.html    https://m3.material.io/styles/elevation/overview

get material m2-dark-theme.html   https://m2.material.io/design/color/dark-theme.html
get apple hig-layout.html         https://developer.apple.com/design/human-interface-guidelines/layout
get apple hig-dark-mode.html      https://developer.apple.com/design/human-interface-guidelines/dark-mode
get apple hig-typography.html     https://developer.apple.com/design/human-interface-guidelines/typography
get apple hig-color.html          https://developer.apple.com/design/human-interface-guidelines/color
get spectrum-docs platform-scale.html https://spectrum.adobe.com/page/platform-scale/
get spectrum-docs international-design.html https://spectrum.adobe.com/page/international-design/
get spectrum-docs color-system.html https://spectrum.adobe.com/page/color-system/
get spectrum-docs spacing.html    https://spectrum.adobe.com/page/spacing/
get atlassian-docs spacing.html   https://atlassian.design/foundations/spacing

get atlassian-docs tokens.html    https://atlassian.design/foundations/tokens/design-tokens
get figma variables-guide.html    https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma
get figma variables-modes.html    https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
get figma code-connect.html       https://www.figma.com/code-connect-docs/

# --- Закон ЕС и адреса стран -------------------------------------------------
get eu-law omnibus-2019-2161.html https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L2161
get eu-law consumer-rights-2011-83.html https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011L0083-20220528
get eu-law price-indication-98-6.html https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:01998L0006-20220528
get eu-law accessibility-act-2019-882.html https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882
get eu-law en-301-549-overview.html https://digital-strategy.ec.europa.eu/en/policies/web-accessibility-directive-standards-and-harmonisation
get address HR.json               https://chromium-i18n.appspot.com/ssl-address/data/HR
get address RO.json               https://chromium-i18n.appspot.com/ssl-address/data/RO
get address IT.json               https://chromium-i18n.appspot.com/ssl-address/data/IT
get address BG.json               https://chromium-i18n.appspot.com/ssl-address/data/BG

# --- Пути, уточнённые по деревьям репозиториев (git ls-tree, 20.09.2026) ------
C=https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages
get carbon layout-tokens.ts       $C/layout/src/tokens.ts
get carbon layout-index.ts        $C/layout/src/index.ts
get carbon type-scale.ts          $C/type/src/scale.ts
get carbon type-styles.ts         $C/type/src/styles.ts
get carbon type-fluid.ts          $C/type/src/fluid.ts
get carbon type-tokens.ts         $C/type/src/tokens.ts
get carbon motion-tokens.ts       $C/motion/src/tokens.ts
get carbon motion-index.ts        $C/motion/src/index.ts
get carbon colors-index.ts        $C/colors/src/index.ts
get carbon themes-index.ts        $C/themes/src/index.ts
P=https://raw.githubusercontent.com/primer/primitives/main/src/tokens
get primer size-base.json5        $P/base/size/size.json5
get primer size-functional.json5  $P/functional/size/size.json5
get primer size-coarse.json5      $P/functional/size/size-coarse.json5
get primer size-fine.json5        $P/functional/size/size-fine.json5
get primer viewport.json5         $P/functional/size/viewport.json5
get primer breakpoints.json5      $P/functional/size/breakpoints.json5
get primer radius.json5           $P/functional/size/radius.json5
get primer border.json5           $P/functional/size/border.json5
get primer z-index.json5          $P/functional/size/z-index.json5
get primer typography-base.json5  $P/base/typography/typography.json5
get primer typography-functional.json5 $P/functional/typography/typography.json5
get primer color-base-light.json5 $P/base/color/light/light.json5
get primer color-base-dark.json5  $P/base/color/dark/dark.json5
get primer color-fg.json5         $P/functional/color/fgColor.json5
get primer color-bg.json5         $P/functional/color/bgColor.json5
get primer color-border.json5     $P/functional/color/borderColor.json5
get primer color-control.json5    $P/functional/color/control.json5
get polaris docs-layout.mdx       https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/layout/index.mdx
get polaris docs-layout-tokens.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/layout/layout-tokens.mdx
get polaris docs-layout-density.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/layout/density.mdx
get polaris docs-layout-spacial.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/layout/spacial-organization.mdx
get polaris docs-colors.mdx       https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/colors/index.mdx
get polaris docs-colors-roles.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/colors/palettes-and-roles.mdx
get polaris docs-colors-using.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/colors/using-color.mdx
get polaris docs-colors-tokens.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/colors/color-tokens.mdx
get polaris docs-typography.mdx   https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/typography/index.mdx
get polaris docs-typography-scale.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/typography/font-and-typescale.mdx
get polaris docs-depth.mdx        https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/depth/index.mdx
get polaris docs-depth-creating.mdx https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/depth/creating-depth.mdx
get polaris docs-motion.mdx       https://raw.githubusercontent.com/Shopify/polaris/main/polaris.shopify.com/content/design/motion/index.mdx
get radix-colors docs-scales.mdx  https://raw.githubusercontent.com/radix-ui/website/main/data/colors/docs/palette-composition/scales.mdx
get radix-colors docs-aliasing.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/colors/docs/overview/aliasing.mdx
get radix-colors docs-custom-palettes.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/colors/docs/overview/custom-palettes.mdx
get radix-themes docs-breakpoints.mdx https://raw.githubusercontent.com/radix-ui/website/main/data/themes/docs/theme/breakpoints.mdx
M=https://raw.githubusercontent.com/mdn/content/main/files/en-us/web
get mdn clamp.md                  $M/css/reference/values/clamp/index.md
get mdn round.md                  $M/css/reference/values/round/index.md
get mdn length.md                 $M/css/reference/values/length/index.md
get mdn container-queries.md      $M/css/guides/containment/container_queries/index.md
get mdn container-size-and-style-queries.md $M/css/guides/containment/container_size_and_style_queries/index.md
get mdn at-layer.md               $M/css/reference/at-rules/@layer/index.md
get mdn at-property.md            $M/css/reference/at-rules/@property/index.md
get mdn light-dark.md             $M/css/reference/values/color_value/light-dark/index.md
get mdn color-mix.md              $M/css/reference/values/color_value/color-mix/index.md
get mdn oklch.md                  $M/css/reference/values/color_value/oklch/index.md
get mdn relative-colors.md        $M/css/guides/colors/using_relative_colors/index.md
get mdn color-scheme.md           $M/css/reference/properties/color-scheme/index.md
get mdn prefers-color-scheme.md   $M/css/reference/at-rules/@media/prefers-color-scheme/index.md
get mdn prefers-reduced-motion.md $M/css/reference/at-rules/@media/prefers-reduced-motion/index.md
get mdn prefers-contrast.md       $M/css/reference/at-rules/@media/prefers-contrast/index.md
get mdn forced-colors.md          $M/css/reference/at-rules/@media/forced-colors/index.md
get mdn media-pointer.md          $M/css/reference/at-rules/@media/pointer/index.md
get mdn media-hover.md            $M/css/reference/at-rules/@media/hover/index.md
get mdn media-any-pointer.md      $M/css/reference/at-rules/@media/any-pointer/index.md
get mdn interpolate-size.md       $M/css/reference/properties/interpolate-size/index.md
get mdn hyphens.md                $M/css/reference/properties/hyphens/index.md
get mdn text-wrap.md              $M/css/reference/properties/text-wrap/index.md
get mdn overflow-wrap.md          $M/css/reference/properties/overflow-wrap/index.md
get mdn aspect-ratio.md           $M/css/reference/properties/aspect-ratio/index.md
get mdn logical-properties.md     $M/css/guides/logical_properties_and_values/index.md
get mdn anchor-positioning.md     $M/css/guides/anchor_positioning/index.md
get mdn scroll-driven-animations.md $M/css/guides/scroll-driven_animations/index.md
get mdn focus-visible.md          $M/css/reference/selectors/_colon_focus-visible/index.md
get mdn view-transitions.md       $M/api/view_transition_api/index.md
get mdn popover-api.md            $M/api/popover_api/index.md
get mdn dialog.md                 $M/html/reference/elements/dialog/index.md
get mdn autocomplete.md           $M/html/reference/attributes/autocomplete/index.md
get mdn inputmode.md              $M/html/reference/global_attributes/inputmode/index.md
get mdn responsive-images.md      $M/html/guides/responsive_images/index.md
get mdn intl-numberformat.md      $M/javascript/reference/global_objects/intl/numberformat/index.md
get mdn aria-busy.md              $M/accessibility/aria/reference/attributes/aria-busy/index.md
get material m3-window-size-classes.html https://m3.material.io/foundations/layout/applying-layout/window-size-classes
get material m3-shape.html        https://m3.material.io/styles/shape/overview-principles
get atlassian-docs color-roles.html https://atlassian.design/foundations/color-new/color-roles

# --- Опубликованные пакеты npm: то, что команды реально ставят себе -----------
# registry.npmjs.org доступен напрямую. Из архива берутся только файлы токенов и
# документация; версия — в имени папки, чтобы снимок можно было сверить.
npmget() { # npmget <группа> <пакет> <glob-ы файлов внутри package/>
  local group=$1 pkg=$2; shift 2
  local tgz dir ver
  mkdir -p "$group" _npm
  tgz=$(cd _npm && npm pack "$pkg" --silent 2>>../fetch.log | tail -1)
  [ -n "$tgz" ] && [ -f "_npm/$tgz" ] || { printf '%s\tnpm:%s\t%s\t000\t0\t%s\n' "$group" "$pkg" "npm:$pkg" "$DATE" >> MANIFEST.tsv; return; }
  ver=${tgz%.tgz}; ver=${ver##*-}
  dir="$group/npm-${pkg##*/}@$ver"; mkdir -p "$dir"
  tar -xzf "_npm/$tgz" -C "$dir" --strip-components=1 --wildcards "$@" 2>>fetch.log
  printf '%s\t%s\t%s\tnpm\t%s\t%s\n' "$group" "$dir" "https://www.npmjs.com/package/$pkg" "$(du -sb "$dir" | cut -f1)" "$DATE" >> MANIFEST.tsv
}
npmget atlassian @atlaskit/tokens 'package/dist/cjs/artifacts/tokens-raw/*' 'package/dist/cjs/artifacts/token-names.js' 'package/README.md' 'package/dist/cjs/tokens/*'
npmget atlassian @atlaskit/eslint-plugin-design-system 'package/README.md' 'package/dist/cjs/rules/*/README.md' 'package/dist/cjs/rules/ensure-design-token-usage/*' 'package/dist/cjs/rules/use-tokens-space/*'
npmget carbon @carbon/layout 'package/scss/*' 'package/lib/*.js' 'package/README.md'
npmget carbon @carbon/type 'package/scss/*' 'package/lib/*.js' 'package/README.md'
npmget carbon @carbon/themes 'package/scss/*' 'package/lib/*.js' 'package/README.md'
npmget carbon @carbon/colors 'package/scss/*' 'package/lib/*.js' 'package/README.md'
npmget carbon @carbon/motion 'package/scss/*' 'package/lib/*.js' 'package/README.md'
npmget spectrum @adobe/spectrum-tokens 'package/dist/json/*' 'package/README.md' 'package/src/*'
npmget polaris @shopify/polaris-tokens 'package/dist/json/*' 'package/src/themes/base/*' 'package/README.md'
npmget primer @primer/primitives 'package/dist/css/*' 'package/dist/json/*' 'package/README.md'
npmget radix-colors @radix-ui/colors 'package/*.css' 'package/README.md'
npmget radix-themes @radix-ui/themes 'package/tokens/*' 'package/styles/tokens/*' 'package/README.md'
npmget open-props open-props 'package/src/*' 'package/README.md'
npmget tailwind tailwindcss 'package/theme.css' 'package/preflight.css' 'package/README.md'
npmget utopia utopia-core 'package/README.md' 'package/src/*'
rm -rf _npm

echo "done: $(grep -c $'\t200\t' MANIFEST.tsv) ok / $(($(wc -l < MANIFEST.tsv)-1)) total" >> fetch.log
