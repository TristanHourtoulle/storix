import type { ReactNode } from 'react'
import { Icon, type IconName } from './icon'

interface EmptyStateProps {
  icon: IconName
  title: string
  body: string
  action?: ReactNode
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-panel bg-surface px-6 py-10 text-center shadow-hairline">
      <span className="grid size-14 place-items-center rounded-card-lg bg-surface-2 text-accent-hover">
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      <p className="m-0 max-w-[32ch] text-sm leading-snug text-muted">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </section>
  )
}
