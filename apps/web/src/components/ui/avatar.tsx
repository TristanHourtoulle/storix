import type { Portrait } from '@storix/shared'
import { initials } from '@/lib/initials'
import { PortraitImage, useVisiblePortrait } from './portrait-image'

interface AvatarProps {
  label: string
  portrait?: Portrait | null
  size?: 'xs' | 'compact' | 'sm' | 'md' | 'lg' | 'xl'
}

const DIMENSIONS = {
  xs: 'size-5 text-[8px]',
  compact: 'size-[30px] text-[11px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-[15px]',
  lg: 'size-14 text-lg',
  xl: 'size-24 text-3xl',
} as const

const IMAGE_SIZES = {
  xs: '20px',
  compact: '30px',
  sm: '36px',
  md: '44px',
  lg: '56px',
  xl: '96px',
} as const

/** Round member avatar: the portrait when set and loadable, the initials otherwise. */
export function Avatar({ label, portrait = null, size = 'sm' }: AvatarProps) {
  const { visible, markFailed } = useVisiblePortrait(portrait)
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center overflow-hidden rounded-full bg-surface-2 font-display font-semibold text-ink-3 shadow-hairline-strong ${DIMENSIONS[size]}`}
    >
      {visible ? (
        <PortraitImage
          portrait={visible}
          sizes={IMAGE_SIZES[size]}
          onError={markFailed}
          className="size-full rounded-full object-cover"
        />
      ) : (
        initials(label)
      )}
    </span>
  )
}
