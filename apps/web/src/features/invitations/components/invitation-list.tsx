import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { useActiveInvitations } from '../use-invitations'
import { useRevokeInvitation } from '../use-revoke-invitation'

interface InvitationListProps {
  leagueId: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function InvitationList({ leagueId }: InvitationListProps) {
  const { invitations, isPending: isLoading, isError } = useActiveInvitations(leagueId)
  const { revoke, isPending, errorMessage } = useRevokeInvitation(leagueId)

  return (
    <section aria-labelledby="active-invitations-title" className="flex flex-col gap-3">
      <h2 id="active-invitations-title">Liens actifs</h2>
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      {isError ? (
        <Notice tone="error">Impossible de charger les invitations. Réessaie plus tard.</Notice>
      ) : null}
      {isLoading ? (
        <p role="status" className="m-0 text-sm text-muted">
          Chargement…
        </p>
      ) : invitations.length === 0 ? (
        isError ? null : (
          <p className="m-0 text-sm text-muted">Aucun lien actif.</p>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex items-center justify-between gap-3 rounded-input bg-surface p-3 shadow-hairline"
            >
              <span className="min-w-0 text-sm text-ink-2">
                {invitation.uses} / {invitation.maxUses} utilisations · expire le{' '}
                {formatDate(invitation.expiresAt)}
              </span>
              <Button
                variant="ghost"
                className="!h-10 !px-3 !text-sm"
                disabled={isPending}
                onClick={() => revoke(invitation.id)}
              >
                Révoquer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
