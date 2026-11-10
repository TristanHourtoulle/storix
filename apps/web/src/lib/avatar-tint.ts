const AVATAR_TINTS = [
  '#c4b5fd',
  '#f9a8d4',
  '#93c5fd',
  '#86efac',
  '#fcd34d',
  '#fdba74',
  '#67e8f9',
] as const

/** A stable pastel background for a member without a portrait, derived from their name. */
export function avatarTint(label: string): string {
  const hash = [...label].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7)
  return AVATAR_TINTS[hash % AVATAR_TINTS.length] ?? AVATAR_TINTS[0]
}

/** Two uppercase letters: the initials of a two-word label, or the first two letters of one word. */
export function twoLetterInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((word) => [...word][0] ?? '')
      : [...(words[0] ?? '')].slice(0, 2)
  return letters.join('').toUpperCase()
}
