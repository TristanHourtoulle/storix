interface MotionPromptProps {
  needsPermission: boolean
  isDenied: boolean
  onRequest: () => void
}

const CHIP =
  'inline-flex h-9 cursor-pointer items-center rounded-full border-0 bg-transparent px-4 font-display text-sm font-semibold text-accent-hover shadow-hairline-strong'

export function MotionPrompt({ needsPermission, isDenied, onRequest }: MotionPromptProps) {
  if (needsPermission) {
    return (
      <button type="button" className={CHIP} onClick={onRequest}>
        Activer l'effet 3D
      </button>
    )
  }
  if (isDenied) {
    return (
      <p className="m-0 text-center text-sm text-muted">
        Fais glisser la carte pour l'incliner.{' '}
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-sm text-accent-hover underline"
          onClick={onRequest}
        >
          Réessayer le gyroscope
        </button>
      </p>
    )
  }
  return null
}
