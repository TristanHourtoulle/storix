import { Icon } from '@/components/ui/icon'
import { useIosInstallHint } from '../use-ios-install-hint'

export function IosInstallHint() {
  const { isVisible, dismiss } = useIosInstallHint()
  if (!isVisible) return null

  return (
    <div
      role="status"
      className="mx-auto box-border flex w-full max-w-[480px] items-center gap-3 bg-nav px-4 py-2 font-sans text-sm text-ink shadow-nav"
    >
      <Icon name="share" className="size-5 shrink-0" />
      <p className="m-0 flex-1">
        Installe Storix : touche Partager puis « Sur l'écran d'accueil ».
      </p>
      <button
        type="button"
        aria-label="Fermer"
        onClick={dismiss}
        className="flex size-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-faint"
      >
        <Icon name="close" className="size-5" />
      </button>
    </div>
  )
}
