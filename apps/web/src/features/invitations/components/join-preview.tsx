import type { InvitationPreview } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'

interface JoinPreviewProps {
  league: NonNullable<InvitationPreview['league']>
  invitedBy: string | null
}

export function JoinPreview({ league, invitedBy }: JoinPreviewProps) {
  const memberLabel = league.memberCount === 1 ? '1 membre' : `${league.memberCount} membres`

  return (
    <section className="flex flex-col items-center gap-2 rounded-panel bg-surface px-6 py-8 text-center shadow-hairline">
      <Avatar label={league.name} size="md" />
      <p className="m-0 text-sm text-muted">Tu es invité·e à rejoindre</p>
      <h1>{league.name}</h1>
      <p className="m-0 text-sm text-muted">{memberLabel}</p>
      {invitedBy ? <p className="m-0 text-[13px] text-faint">Invitation de {invitedBy}</p> : null}
    </section>
  )
}
