import type { MemberSummary } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { initials } from '@/lib/initials'

interface MemberFilterProps {
  members: MemberSummary[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function MemberFilter({ members, selectedId, onSelect }: MemberFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer par membre"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
    >
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
