import { useState } from 'react'
import type { MemberSummary } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { ResetCodeDialog } from '@/features/reset-codes/components/reset-code-dialog'
import { useMembers } from '../use-members'
import { useChangeRole } from '../use-change-role'
import { useRemoveMember } from '../use-remove-member'
import { MemberRow } from './member-row'

interface MemberListProps {
  leagueId: string
}

export function MemberList({ leagueId }: MemberListProps) {
  const members = useMembers(leagueId)
  const roleChange = useChangeRole(leagueId)
  const removal = useRemoveMember(leagueId)
  const [removeTarget, setRemoveTarget] = useState<MemberSummary | null>(null)
  const [resetTarget, setResetTarget] = useState<MemberSummary | null>(null)

  const selectRemoveTarget = (target: MemberSummary | null) => {
    removal.reset()
    roleChange.reset()
    setRemoveTarget(target)
  }

  return (
    <section aria-label="Membres" className="flex flex-col gap-3">
      {roleChange.errorMessage ? <Notice tone="error">{roleChange.errorMessage}</Notice> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            isBusy={roleChange.isPending}
            onToggleRole={(target) =>
              roleChange.changeRole({
                userId: target.userId,
                role: target.role === 'admin' ? 'member' : 'admin',
              })
            }
            onRemove={selectRemoveTarget}
            onResetCode={setResetTarget}
          />
        ))}
      </ul>
      {removeTarget ? (
        <Dialog
          open
          title={`Retirer ${removeTarget.displayUsername} de la ligue ?`}
          onClose={() => selectRemoveTarget(null)}
        >
          <p className="m-0 text-sm leading-snug text-muted">
            Ce membre perdra l'accès à la ligue. Il pourra la rejoindre à nouveau avec une
            invitation.
          </p>
          {removal.errorMessage ? <Notice tone="error">{removal.errorMessage}</Notice> : null}
          <div className="flex gap-2">
            <Button variant="ghost" block onClick={() => selectRemoveTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              block
              className="!bg-danger"
              isLoading={removal.isPending}
              onClick={() => removal.remove(removeTarget.userId, () => selectRemoveTarget(null))}
            >
              Retirer
            </Button>
          </div>
        </Dialog>
      ) : null}
      {resetTarget ? (
        <ResetCodeDialog
          leagueId={leagueId}
          member={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      ) : null}
    </section>
  )
}
