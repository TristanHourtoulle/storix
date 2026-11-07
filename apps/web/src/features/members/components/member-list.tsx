import { useState } from 'react'
import type { MemberSummary } from '@storix/shared'
import { Notice } from '@/components/ui/notice'
import { ResetCodeDialog } from '@/features/reset-codes/components/reset-code-dialog'
import { useMembers } from '../use-members'
import { useChangeRole } from '../use-change-role'
import { useRemoveMember } from '../use-remove-member'
import { useTransferOwnership } from '../use-transfer-ownership'
import { MemberRow } from './member-row'
import { RemoveMemberDialog } from './remove-member-dialog'
import { TransferOwnershipDialog } from './transfer-ownership-dialog'

interface MemberListProps {
  leagueId: string
}

export function MemberList({ leagueId }: MemberListProps) {
  const members = useMembers(leagueId)
  const roleChange = useChangeRole(leagueId)
  const removal = useRemoveMember(leagueId)
  const transfer = useTransferOwnership(leagueId)
  const [removeTarget, setRemoveTarget] = useState<MemberSummary | null>(null)
  const [resetTarget, setResetTarget] = useState<MemberSummary | null>(null)
  const [transferTarget, setTransferTarget] = useState<MemberSummary | null>(null)

  const selectRemoveTarget = (target: MemberSummary | null) => {
    removal.reset()
    roleChange.reset()
    setRemoveTarget(target)
  }

  const selectTransferTarget = (target: MemberSummary | null) => {
    transfer.reset()
    roleChange.reset()
    setTransferTarget(target)
  }

  return (
    <section aria-label="Membres" className="flex flex-col gap-3">
      {roleChange.errorMessage ? <Notice tone="error">{roleChange.errorMessage}</Notice> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            isBusy={roleChange.isPending || transfer.isPending}
            onToggleRole={(target) =>
              roleChange.changeRole({
                userId: target.userId,
                role: target.role === 'admin' ? 'member' : 'admin',
              })
            }
            onRemove={selectRemoveTarget}
            onResetCode={setResetTarget}
            onTransferOwnership={selectTransferTarget}
          />
        ))}
      </ul>
      {removeTarget ? (
        <RemoveMemberDialog
          member={removeTarget}
          isPending={removal.isPending}
          errorMessage={removal.errorMessage}
          onConfirm={(photos) =>
            removal.remove({ userId: removeTarget.userId, photos }, () => selectRemoveTarget(null))
          }
          onClose={() => selectRemoveTarget(null)}
        />
      ) : null}
      {transferTarget ? (
        <TransferOwnershipDialog
          member={transferTarget}
          isPending={transfer.isPending}
          errorMessage={transfer.errorMessage}
          onConfirm={() =>
            transfer.transfer(transferTarget.userId, () => selectTransferTarget(null))
          }
          onClose={() => selectTransferTarget(null)}
        />
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
