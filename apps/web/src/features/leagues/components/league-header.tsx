interface LeagueHeaderProps {
  name: string
  memberCount: number
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function LeagueHeader({ name, memberCount }: LeagueHeaderProps) {
  return (
    <header className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-11 flex-none place-items-center rounded-control bg-surface-2 font-display text-[15px] font-bold text-accent-hover shadow-hairline-strong"
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        <h1 className="truncate text-lg">{name}</h1>
        <p className="m-0 mt-0.5 text-[13px] text-muted">
          {memberCount} {memberCount > 1 ? 'membres' : 'membre'}
        </p>
      </div>
    </header>
  )
}
