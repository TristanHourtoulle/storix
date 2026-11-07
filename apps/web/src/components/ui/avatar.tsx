import { initials } from '@/lib/initials'

interface AvatarProps {
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const DIMENSIONS = {
  sm: 'size-9 text-xs',
  md: 'size-11 text-[15px]',
  lg: 'size-14 text-lg',
} as const

export function Avatar({ label, size = 'sm' }: AvatarProps) {
  const dimension = DIMENSIONS[size]
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center rounded-full bg-surface-2 font-display font-semibold text-ink-3 shadow-hairline-strong ${dimension}`}
    >
      {initials(label)}
    </span>
  )
}
