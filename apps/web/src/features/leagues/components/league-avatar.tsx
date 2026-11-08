import type { Portrait } from '@storix/shared'
import { PortraitImage, useVisiblePortrait } from '@/components/ui/portrait-image'
import { initials } from '@/lib/initials'

interface LeagueAvatarProps {
  name: string
  photo?: Portrait | null
  size?: 'sm' | 'md' | 'xl'
}

const DIMENSIONS = {
  sm: 'size-8 text-[11px]',
  md: 'size-11 text-[15px]',
  xl: 'size-24 text-3xl',
} as const

const IMAGE_SIZES = { sm: '32px', md: '44px', xl: '96px' } as const

/** Rounded-square league badge: the league photo when set and loadable, the accent initials otherwise. */
export function LeagueAvatar({ name, photo = null, size = 'md' }: LeagueAvatarProps) {
  const { visible, markFailed } = useVisiblePortrait(photo)
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center overflow-hidden rounded-control bg-surface-2 font-display font-bold text-accent-hover shadow-hairline-strong ${DIMENSIONS[size]}`}
    >
      {visible ? (
        <PortraitImage
          portrait={visible}
          sizes={IMAGE_SIZES[size]}
          onError={markFailed}
          className="size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
