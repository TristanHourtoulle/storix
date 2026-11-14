import type { StandingsMember } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { useEquippedStyle } from '@/features/cosmetics/style-context'

interface StandingAvatarProps {
  member: StandingsMember
  size: 'mini' | 'compact' | 'md' | 'lg' | 'xl'
}

/** A member's avatar with their frame; the viewer's own follows what they wear right now. */
export function StandingAvatar({ member, size }: StandingAvatarProps) {
  const ownFrame = useEquippedStyle().avatarFrame
  return (
    <Avatar
      label={member.displayUsername}
      portrait={member.avatar}
      frame={member.isSelf ? ownFrame : member.avatarFrame}
      size={size}
      isTinted
    />
  )
}
