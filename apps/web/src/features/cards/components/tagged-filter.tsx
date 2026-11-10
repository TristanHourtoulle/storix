import type { MemberSummary } from '@storix/shared'
import { Chip } from '@/components/ui/chip'
import { initials } from '@/lib/initials'

interface TaggedFilterProps {
  members: readonly MemberSummary[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** "Sur la photo" chips: one per member, the viewer first as "Moi"; tapping the active one clears it. */
export function TaggedFilter({ members, selectedId, onSelect }: TaggedFilterProps) {
  const ordered = [
    ...members.filter((member) => member.isSelf),
    ...members.filter((member) => !member.isSelf),
  ]

  return (
    <div
      role="group"
      aria-label="Filtrer par personne sur la photo"
      className="flex flex-wrap gap-2"
    >
      {ordered.map((member) => (
        <Chip
          key={member.userId}
          label={member.isSelf ? 'Moi' : member.displayUsername}
          initials={initials(member.displayUsername)}
          portrait={member.avatar}
          isOn={selectedId === member.userId}
          onToggle={() => onSelect(selectedId === member.userId ? null : member.userId)}
        />
      ))}
    </div>
  )
}
