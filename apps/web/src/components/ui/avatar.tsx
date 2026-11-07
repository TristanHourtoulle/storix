interface AvatarProps {
  label: string
  size?: 'sm' | 'md'
}

function initials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function Avatar({ label, size = 'sm' }: AvatarProps) {
  const dimension = size === 'sm' ? 'size-9 text-xs' : 'size-11 text-[15px]'
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center rounded-full bg-surface-2 font-display font-semibold text-ink-3 shadow-hairline-strong ${dimension}`}
    >
      {initials(label)}
    </span>
  )
}
