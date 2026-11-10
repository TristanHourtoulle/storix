import type { MemberSummary } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { initials } from '@/lib/initials'

interface MemberFilterProps {
  members: readonly MemberSummary[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function MemberFilter({ members, selectedId, onSelect }: MemberFilterProps) {
  return (
    <div role="group" aria-label="Filtrer par membre" className="flex flex-wrap gap-2">
      <Chip label="Toutes" isOn={selectedId === null} onToggle={() => onSelect(null)} />
      {members.map((member) => (
        <Chip
          key={member.userId}
          label={member.displayUsername}
          initials={initials(member.displayUsername)}
          portrait={member.avatar}
          isOn={selectedId === member.userId}
          onToggle={() => onSelect(selectedId === member.userId ? null : member.userId)}
        />
      ))}
    </div>
  )
}
