import { Icon } from '@/components/ui/icon'

/** Covers the app on phones held in landscape; visibility is driven by a CSS media query only. */
export function RotateOverlay() {
  return (
    <div className="rotate-overlay" role="status">
      <Icon name="rotate" className="size-12 text-accent" />
      <p className="rotate-overlay-text">Tourne ton téléphone pour continuer</p>
      <p className="rotate-overlay-hint">Storix se joue en mode portrait.</p>
    </div>
  )
}
