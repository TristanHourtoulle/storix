import { useEffect, useRef, useState } from 'react'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import type { UploadDraft } from '@storix/shared'
import { fitShots, shotStripStatus, type ShotChip } from '@storix/shared/domain'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { TopBar } from '@/components/ui/top-bar'
import { playSound } from '@/features/sound/sound'
import { FilmStrip } from '../components/film-strip'
import { ShotLeaveDialog } from '../components/shot-leave-dialog'
import { ShutterRow, type ShutterMode } from '../components/shutter-row'
import { Viewfinder } from '../components/viewfinder'
import type { DraftOverflow } from '../draft-capacity'
import type { UploadSession } from '../session/use-upload-session'
import { continueLabel, overflowMessage, shotBlockedNotice, shotChipLabel } from '../upload-copy'
import { useUploadQuota } from '../use-upload-quota'
import { useCameraStream, type CameraPhase } from './use-camera-stream'
import { useShotLeaveGuard } from './use-shot-leave-guard'
import { useShotStrip } from './use-shot-strip'

export interface CameraStartProps {
  leagueId: string
  session: UploadSession
  drafts: readonly UploadDraft[]
}

const SHUTTER_MODES: Record<CameraPhase, ShutterMode> = {
  live: 'live',
  priming: 'enable',
  paused: 'enable',
  denied: 'native',
  busy: 'native',
  unavailable: 'native',
  off: 'native',
  starting: 'waiting',
}

function chipTone(chip: ShotChip): string {
  if (chip.kind === 'unlimited') return 'text-tier-legendary'
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
  const camera = useCameraStream(status.canShoot && !isContinuing)
  const capturingRef = useRef(false)
  const leftRef = useRef(status.left)

  useEffect(() => {
    leftRef.current = status.left
  })

  const handlePick = (files: File[]): void => {
    const { accepted, skipped } = fitShots(status.left, files.length)
    strip.add(files.slice(0, accepted))
    setStripOverflow(skipped > 0 ? { kind: 'dailyQuota', skipped, accepted } : null)
  }

  const handleShutter = async (): Promise<void> => {
    if (camera.phase !== 'live') {
      camera.enable()
      return
    }
    if (capturingRef.current || !status.canShoot) return
    capturingRef.current = true
    try {
      const file = await camera.capture()
      if (!file) {
        playSound({ name: 'error' })
        return
      }
      if (fitShots(leftRef.current, 1).accepted === 0) return
      playSound({ name: 'photoAdded' })
      strip.add([file])
      setStripOverflow(null)
    } finally {
      capturingRef.current = false
    }
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
    <main className="screen flex-1 gap-2">
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
      <div className="relative min-h-0 flex-1">
        <Viewfinder
          camera={camera}
          block={status.block}
          blockedNotice={shotBlockedNotice(status.block, drafts.length > 0)}
          overflowNotice={overflow ? overflowMessage(overflow) : null}
        />
      </div>
      <ShutterRow
        isDisabled={!status.canShoot || isContinuing}
        mode={SHUTTER_MODES[camera.phase]}
        onShutter={() => void handleShutter()}
        onPick={handlePick}
        flip={{
          isVisible: (camera.phase === 'live' || camera.phase === 'starting') && camera.canFlip,
          onFlip: camera.flip,
        }}
      />
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
