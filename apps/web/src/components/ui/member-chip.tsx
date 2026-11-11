import type { CosmeticItemId, Portrait } from '@storix/shared'
import { Avatar } from './avatar'

interface MemberChipProps {
  label: string
  portrait?: Portrait | null
  frame?: CosmeticItemId | null
  isAll?: boolean
  isOn: boolean
  onToggle: () => void
}

/** A compact pill pairing a small tinted avatar with a member name; "everyone" shows a neutral dot. */
export function MemberChip({
  label,
  portrait = null,
  frame = null,
  isAll = false,
  isOn,
  onToggle,
}: MemberChipProps) {
  return (
    <button type="button" aria-pressed={isOn} onClick={onToggle} className="member-chip">
      {isAll ? (
        <span aria-hidden="true" className="member-chip-all">
          ·
        </span>
      ) : (
        <Avatar label={label} portrait={portrait} frame={frame} size="xs" isTinted />
      )}
      {label}
    </button>
  )
}
