import type { ReactNode } from 'react'

interface TopBarProps {
  title?: string
  start?: ReactNode
  end?: ReactNode
}

export function TopBar({ title, start, end }: TopBarProps) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-3">
      <div className="flex min-w-11 justify-start">{start}</div>
      {title ? (
        <h1 className="m-0 truncate font-display text-[15px] font-semibold text-ink-3">{title}</h1>
      ) : null}
      <div className="flex min-w-11 justify-end">{end}</div>
    </header>
  )
}
