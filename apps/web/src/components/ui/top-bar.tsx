import type { ReactNode, Ref } from 'react'

interface TopBarProps {
  title?: string
  start?: ReactNode
  end?: ReactNode
  titleRef?: Ref<HTMLHeadingElement>
}

export function TopBar({ title, start, end, titleRef }: TopBarProps) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-3">
      <div className="flex min-w-11 justify-start">{start}</div>
      {title ? (
        <h1
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          className="m-0 truncate font-display text-[15px] font-semibold text-ink-3 outline-none"
        >
          {title}
        </h1>
      ) : null}
      <div className="flex min-w-11 justify-end">{end}</div>
    </header>
  )
}
