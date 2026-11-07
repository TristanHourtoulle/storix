import type { LeagueRole, MemberSummary } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface MemberRowProps {
  member: MemberSummary
  isBusy: boolean
  onToggleRole: (member: MemberSummary) => void
  onRemove: (member: MemberSummary) => void
  onResetCode: (member: MemberSummary) => void
}

const ROLE_LABELS: Record<LeagueRole, string> = {
  owner: 'Propriétaire',
  admin: 'Admin',
  member: 'Membre',
}

export function MemberRow({ member, isBusy, onToggleRole, onRemove, onResetCode }: MemberRowProps) {
  const hasActions = member.canChangeRole || member.canRemove || member.canIssueResetCode

  return (
    <li className="flex flex-col gap-3 rounded-input bg-surface p-3 shadow-hairline">
      <div className="flex items-center gap-3">
        <Avatar label={member.displayUsername} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
          {member.displayUsername}
        </span>
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
