import { useRef, useState } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import type { UploadDraft } from '@storix/shared'
import { fitShots, shotStripStatus, type ShotChip } from '@storix/shared/domain'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { TopBar } from '@/components/ui/top-bar'
import { CameraFrame } from '../components/camera-frame'
import { FilmStrip } from '../components/film-strip'
import { ShotLeaveDialog } from '../components/shot-leave-dialog'
import { ShutterRow } from '../components/shutter-row'
import type { DraftOverflow } from '../draft-capacity'
import type { UploadSession } from '../session/use-upload-session'
import {
  continueLabel,
  overflowMessage,
  shotBody,
  shotChipLabel,
  shotHeadline,
} from '../upload-copy'
import { useUploadQuota } from '../use-upload-quota'
import { useShotLeaveGuard } from './use-shot-leave-guard'
import { useShotStrip } from './use-shot-strip'

export interface CameraStartProps {
  leagueId: string
  session: UploadSession
  drafts: readonly UploadDraft[]
}

function chipTone(chip: ShotChip): string {
  if (chip.kind === 'batch') return 'text-tier-legendary'
  return chip.left === 0 ? 'text-danger' : 'text-ink-2'
}

/**
 * The camera-first start screen of the add flow: shutter, Galerie, film strip and "Continuer".
 * "Continuer" never hands the session files it would reject outright, so the screen always switches.
 */
export function CameraStart({ leagueId, session, drafts }: CameraStartProps) {
  const quota = useUploadQuota(leagueId)
  const strip = useShotStrip()
  const status = shotStripStatus({
    quota,
    draftCount: drafts.length,
    shotCount: strip.shots.length,
  })
  const [stripOverflow, setStripOverflow] = useState<DraftOverflow | null>(null)
  const [isContinuing, setIsContinuing] = useState(false)
  const isContinuingRef = useRef(false)
  const canGoBack = useCanGoBack()
  const router = useRouter()
  const navigate = useNavigate()
  const { cards, overflow: sessionOverflow } = session.state
  const guard = useShotLeaveGuard(strip.shots.length > 0 && !isContinuing)
  const overflow = sessionOverflow ?? stripOverflow

  const handlePick = (files: File[]): void => {
    const { accepted, skipped } = fitShots(status.left, files.length)
    strip.add(files.slice(0, accepted))
    setStripOverflow(
      skipped > 0 ? { kind: quota.unlimited ? 'batch' : 'dailyQuota', skipped, accepted } : null,
    )
  }

  const handleRemove = (id: string): void => {
    strip.remove(id)
    setStripOverflow(null)
  }

  const handleContinue = async (): Promise<void> => {
    if (isContinuingRef.current) return
    const files = strip.files()
    const shouldResume = cards.length === 0 && drafts.length > 0
    if (!shouldResume && !quota.unlimited && quota.remaining === 0) {
      setStripOverflow({ kind: 'dailyQuota', skipped: files.length, accepted: 0 })
      return
    }
    isContinuingRef.current = true
    setIsContinuing(true)
    await strip.drain()
    if (shouldResume) session.resume([...drafts])
    const stacked = shouldResume && quota.unlimited ? drafts.length : 0
    if (files.length > 0) void session.add(files, stacked)
  }

  const close = (): void => {
    if (canGoBack) router.history.back()
    else void navigate({ to: '/l/$leagueId', params: { leagueId } })
  }

  return (
    <main className="screen flex-1">
      <TopBar
        title="Prendre des cartes"
        start={
          <button type="button" aria-label="Fermer" className="icon-btn" onClick={close}>
            <Icon name="close" className="size-5" />
          </button>
        }
        end={
          <span
            className={`rounded-full bg-surface-2 px-2 py-0.5 font-display text-[11px] font-semibold ${chipTone(status.chip)}`}
          >
            {shotChipLabel(status.chip)}
          </span>
        }
      />
      {overflow ? <Notice tone="info">{overflowMessage(overflow)}</Notice> : null}
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <CameraFrame
          headline={shotHeadline(status.headline)}
          body={shotBody(status.headline, drafts.length > 0)}
        />
        <ShutterRow isDisabled={!status.canShoot} onPick={handlePick} />
      </div>
      <FilmStrip drafts={drafts} shots={strip.shots} onRemove={handleRemove} />
      <footer className="-mx-4 px-4 pt-2.5 shadow-[inset_0_1px_0_var(--color-line-nav)]">
        <Button
          variant="primary"
          block
          disabled={status.continueCount === 0 || isContinuing}
          onClick={() => void handleContinue()}
        >
          {continueLabel(status.continueCount)}
        </Button>
      </footer>
      <ShotLeaveDialog
        open={guard.isOpen}
        count={strip.shots.length}
        onStay={guard.stay}
        onLeave={guard.leave}
      />
    </main>
  )
}
