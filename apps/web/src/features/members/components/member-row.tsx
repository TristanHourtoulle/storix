import type { MemberSummary } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/features/leagues/role-labels'

interface MemberRowProps {
  member: MemberSummary
  isBusy: boolean
  onToggleRole: (member: MemberSummary) => void
  onRemove: (member: MemberSummary) => void
  onResetCode: (member: MemberSummary) => void
  onTransferOwnership: (member: MemberSummary) => void
}

export function MemberRow({
  member,
  isBusy,
  onToggleRole,
  onRemove,
  onResetCode,
  onTransferOwnership,
}: MemberRowProps) {
  const hasActions =
    member.canChangeRole ||
    member.canRemove ||
    member.canIssueResetCode ||
    member.canTransferOwnership

  return (
    <li className="flex flex-col gap-3 rounded-input bg-surface p-3 shadow-hairline">
      <div className="flex items-center gap-3">
        <Avatar label={member.displayUsername} portrait={member.avatar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-medium">{member.displayUsername}</span>
          {member.username !== null ? (
            <span className="truncate text-xs text-muted">identifiant : {member.username}</span>
          ) : null}
        </div>
        {member.isSelf ? <span className="text-xs text-muted">toi</span> : null}
        <span className="flex-none rounded-full bg-surface-2 px-2.5 py-1 font-display text-xs font-semibold text-ink-3 shadow-hairline-strong">
          {ROLE_LABELS[member.role]}
        </span>
      </div>
      {hasActions ? (
        <div className="flex flex-wrap gap-2">
          {member.canChangeRole ? (
            <Button
              variant="ghost"
              className="!h-10 !px-3 !text-sm"
              disabled={isBusy}
              onClick={() => onToggleRole(member)}
            >
              {member.role === 'admin' ? 'Repasser membre' : 'Passer admin'}
            </Button>
          ) : null}
          {member.canTransferOwnership ? (
            <Button
              variant="ghost"
              className="!h-10 !px-3 !text-sm"
              disabled={isBusy}
              onClick={() => onTransferOwnership(member)}
            >
              Transférer la propriété
            </Button>
          ) : null}
          {member.canIssueResetCode ? (
            <Button
              variant="ghost"
              className="!h-10 !px-3 !text-sm"
              onClick={() => onResetCode(member)}
            >
              Code de réinitialisation
            </Button>
          ) : null}
          {member.canRemove ? (
            <Button
              variant="ghost"
              className="!h-10 !px-3 !text-sm !text-danger"
              onClick={() => onRemove(member)}
            >
              Retirer
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
