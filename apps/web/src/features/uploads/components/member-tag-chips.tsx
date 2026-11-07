import type { MemberSummary } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { initials } from '@/lib/initials'

interface MemberTagChipsProps {
  members: readonly MemberSummary[]
  selectedIds: readonly string[]
  isDisabled: boolean
  onToggle: (userId: string) => void
}

export function MemberTagChips({
  members,
  selectedIds,
  isDisabled,
  onToggle,
}: MemberTagChipsProps) {
  return (
    <div role="group" aria-label="Qui est sur la photo ?" className="flex flex-wrap gap-2">
      {members.map((member) => (
        <Chip
          key={member.userId}
          label={member.displayUsername}
          initials={initials(member.displayUsername)}
          isOn={selectedIds.includes(member.userId)}
          isDisabled={isDisabled}
          onToggle={() => onToggle(member.userId)}
        />
      ))}
    </div>
  )
}
