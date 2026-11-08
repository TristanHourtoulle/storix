import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { usePushNotifications } from '../use-push-notifications'
import { usePushPrompt } from '../use-push-prompt'

export function PushPrompt() {
  const { status, isReady, enable, isPending, errorMessage } = usePushNotifications()
  const { isVisible, dismiss } = usePushPrompt(status, isReady)
  const [hasActivated, setHasActivated] = useState(false)
  const isActivating = hasActivated && status !== 'enabled' && (isPending || errorMessage !== null)

  if (!isVisible && !isActivating) return null

  return (
    <div className="flex flex-col gap-2">
      <section className="flex flex-col gap-3 rounded-panel bg-surface p-4 shadow-hairline">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-base font-semibold text-ink">
            Sois prévenu quand tes boosters sont prêts
          </h2>
          <p className="m-0 text-sm text-muted">
            On t&apos;envoie une notification quand ton stock est plein.
          </p>
        </div>
        <div className="flex gap-2">
          {status === 'denied' ? null : (
            <Button
              variant="primary"
              className="flex-1"
              isLoading={isPending}
              onClick={() => {
                dismiss()
                setHasActivated(true)
                void enable()
              }}
            >
              Activer
            </Button>
          )}
          <Button
            variant="ghost"
            className="flex-1"
            disabled={isPending}
            onClick={() => {
              dismiss()
              setHasActivated(false)
            }}
          >
            Plus tard
          </Button>
        </div>
      </section>
      {hasActivated && errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
    </div>
  )
}
