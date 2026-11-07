import { useCreateInvitation } from '../use-create-invitation'
import { CreateInvitationForm } from './create-invitation-form'
import { InvitationLink } from './invitation-link'
import { InvitationList } from './invitation-list'

interface InvitationsPanelProps {
  leagueId: string
}

export function InvitationsPanel({ leagueId }: InvitationsPanelProps) {
  const { create, url, dismissUrl, isPending, errorMessage } = useCreateInvitation(leagueId)

  return (
    <div className="flex flex-col gap-6">
      <CreateInvitationForm
        onCreate={(body) => {
          dismissUrl()
          create(body)
        }}
        isPending={isPending}
        errorMessage={errorMessage}
      />
      {url ? <InvitationLink url={url} /> : null}
      <InvitationList leagueId={leagueId} />
    </div>
  )
}
