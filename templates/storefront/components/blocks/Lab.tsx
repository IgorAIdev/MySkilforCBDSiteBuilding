import p from '@/styles/primitives.module.css'
import go from '@/styles/go.module.css'
import s from './blocks.module.css'
import type { Block } from '@/lib/source/contract.ts'
import { labView } from '@/lib/product-view.ts'
import { t } from '@/lib/i18n/index.ts'
import { LabReport } from '../LabReport.tsx'
import { Icon } from '../Icon.tsx'
import type { BlockCtx } from './types.ts'

/* Лаборатория — ОДИН лист на странице, и в нём ничего не поднято: слова
   слева, протокол партии справа ПЛОСКО, строками через волосок, и под ним —
   сам документ (`report.url`). Обещание героя «протокол на каждую партию»
   здесь становится тем, что можно открыть (скилл shop, «Лаборатория —
   процесс»: «где посмотреть»). Лист — `--surface` и пол (`data-plate`), не
   тон марки: тон в тёмной теме становился ржавым и читался тревогой.
   В узкой коробке колонка одна (`switcher`). */
export function Lab({ block, ctx }: { block: Extract<Block, { type: 'lab' }>; ctx: BlockCtx }) {
  const report = block.report
  return (
    <section className={`${p.wrap} ${p.section}`}>
      <div className={`${p.sheet} ${p.switcher} ${s.labBand}`} data-plate>
        <div className={`${p.sectionHead} ${s.labText}`}><h2>{block.title}</h2><p>{block.body}</p></div>
        {report ? (
          <div className={`${p.stack} ${s.labDoc}`}>
            <LabReport lab={labView(ctx.lang, report)} level={3} />
            {report.url ? <a className={go.go} href={report.url}>{t(ctx.lang, 'home.lab.open')}<Icon id="arrow-right" /></a> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
