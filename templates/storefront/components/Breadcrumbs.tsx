import s from './Breadcrumbs.module.css'

export function Breadcrumbs({ trail, label }: { trail: { name: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label} className={s.crumbs}>
      <ol>
        {trail.map((c) => <li key={c.href ?? c.name}>{c.href ? <a href={c.href}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>)}
      </ol>
    </nav>
  )
}
