import type { StandingsMember } from '@storix/shared'
import { StyledName } from '@/features/cosmetics/components/styled-name'
import { useEquippedStyle } from '@/features/cosmetics/style-context'

interface StandingNameProps {
  member: StandingsMember
  className?: string
}

/** A member's name with their reflection; the viewer's own follows what they wear right now. */
export function StandingName({ member, className }: StandingNameProps) {
  const ownNameStyle = useEquippedStyle().nameStyle
  return (
    <StyledName styleId={member.isSelf ? ownNameStyle : member.nameStyle} className={className}>
      {member.displayUsername}
    </StyledName>
  )
}
