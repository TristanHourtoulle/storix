import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { BrandMark } from '@/components/ui/brand-mark'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { meQueryOptions } from '@/features/auth/session.queries'
import { JoinActions } from '@/features/invitations/components/join-actions'
import { JoinPreview } from '@/features/invitations/components/join-preview'
import { SignupForm } from '@/features/invitations/components/signup-form'
import {
  invitationPreviewQueryOptions,
  isInvitationRejected,
} from '@/features/invitations/invitations.queries'

export const Route = createFileRoute('/join/$token')({
  component: JoinScreen,
})

function InvalidLink() {
  return (
    <EmptyState
      icon="profile"
      title="Lien plus valide"
      body="Ce lien d'invitation a expiré ou a été révoqué. Demande-en un nouveau."
    />
  )
}

function JoinScreen() {
  const { token } = Route.useParams()
  const preview = useQuery(invitationPreviewQueryOptions(token))
  const me = useQuery(meQueryOptions)

  if (preview.isPending || me.isPending) {
    return (
      <main className="screen">
        <BrandMark />
      </main>
    )
  }

  if (preview.isError) {
    const isRejected = isInvitationRejected(preview.error)
    return (
      <main className="screen">
        <BrandMark />
        {isRejected ? (
          <InvalidLink />
        ) : (
          <Notice tone="error">Impossible de charger l'invitation. Réessaie plus tard.</Notice>
        )}
      </main>
    )
  }

  if (me.isError) {
    return (
      <main className="screen">
        <BrandMark />
        <Notice tone="error">Impossible de vérifier ta session. Réessaie plus tard.</Notice>
      </main>
    )
  }

  const { status, league, invitedBy, isMember } = preview.data
  const isSignedIn = Boolean(me.data)

  return (
    <main className="screen">
      <BrandMark />
      {status !== 'valid' || !league ? (
        <InvalidLink />
      ) : (
        <>
          <JoinPreview league={league} invitedBy={invitedBy} />
          {isSignedIn ? (
            <JoinActions token={token} isMember={isMember} />
          ) : (
            <SignupForm token={token} />
          )}
        </>
      )}
    </main>
  )
}
