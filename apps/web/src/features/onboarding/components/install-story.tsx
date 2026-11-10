import { chromeIntentUrl, type InAppBrowser, type InstallContext } from '@storix/shared'
import type { ReactNode } from 'react'
import { buttonClassName } from '@/components/ui/button'
import { useInstallPrompt } from '@/features/pwa/install-prompt'
import { usePushNotifications } from '@/features/push/use-push-notifications'
import { installStoryCopy, type PlatformFamily } from '../onboarding-stories'
import { useCopyLink } from '../use-copy-link'
import { NumberedRows } from './story-visuals'

interface InstallStoryProps {
  context: InstallContext
  inAppBrowser: InAppBrowser | null
  family: PlatformFamily
  onInstalled: () => void
  footer: ReactNode
}

interface CopyLinkBoxProps {
  url: string
  isPrimary: boolean
}

function CopyLinkBox({ url, isPrimary }: CopyLinkBoxProps) {
  const { isCopied, needsManualCopy, copy, fallbackRef } = useCopyLink(url)
  return (
    <div>
      <div className="ob-copy">
        <input
          ref={fallbackRef}
          className="ob-copy-url"
          value={url}
          readOnly
          aria-label="Lien de Storix"
        />
        <button
          type="button"
          className={`inline-flex h-9 flex-none cursor-pointer items-center rounded-control border-0 px-3 font-display text-[12.5px] font-semibold ${isPrimary ? 'bg-ink text-bg' : 'bg-transparent text-ink shadow-hairline-strong'}`}
          onClick={copy}
        >
          {isCopied ? 'Lien copié ✓' : 'Copier le lien'}
        </button>
        <span className="sr-only" aria-live="polite">
          {isCopied ? 'Lien copié' : ''}
        </span>
      </div>
      {needsManualCopy && !isCopied ? (
        <p className="ob-copy-hint" role="status">
          Appuie longuement sur le lien pour le copier
        </p>
      ) : null}
    </div>
  )
}

/** Install story body: the steps and actions that match how the page was opened. */
export function InstallStory({
  context,
  inAppBrowser,
  family,
  onInstalled,
  footer,
}: InstallStoryProps) {
  const { prompt } = useInstallPrompt()
  const push = usePushNotifications()
  const canEnablePush = push.isReady && push.status === 'disabled' && context !== 'in-app'
  const copy = installStoryCopy({ context, inAppBrowser, family, canEnablePush })
  const appUrl = `${window.location.origin}/`
  const isAndroidInApp = context === 'in-app' && family === 'android'

  function install() {
    void prompt().then((outcome) => {
      if (outcome === 'accepted') onInstalled()
    })
  }

  return (
    <>
      <div className="ob-visual ob-install">
        <div className="ob-install-box ob-hit">
          {copy.pill === null ? null : <span className="ob-pill">{copy.pill}</span>}
          {copy.rows.length > 0 ? <NumberedRows rows={copy.rows} /> : null}
          {context === 'android-prompt' ? (
            <button
              type="button"
              className={buttonClassName({ variant: 'primary', block: true })}
              onClick={install}
            >
              Installer Storix
            </button>
          ) : null}
          {isAndroidInApp ? (
            <a
              href={chromeIntentUrl(appUrl)}
              className={buttonClassName({ variant: 'primary', block: true })}
            >
              Ouvrir dans Chrome
            </a>
          ) : null}
          {copy.hasCopyLink ? <CopyLinkBox url={appUrl} isPrimary={!isAndroidInApp} /> : null}
          {canEnablePush ? (
            <button
              type="button"
              className={buttonClassName({ variant: 'ghost', block: true })}
              disabled={push.isPending}
              onClick={() => void push.enable()}
            >
              Activer les notifications
            </button>
          ) : null}
        </div>
      </div>
      <div className="ob-txt">
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
        {footer}
      </div>
    </>
  )
}
