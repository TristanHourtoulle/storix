import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { emblemDefinition, tierRank, type EmblemId } from '@storix/shared'
import { playSound } from '@/features/sound/sound'
import { useUnseenEmblems } from '../use-unseen-emblems'
import { EmblemUnlockBanner } from './emblem-unlock-banner'

interface EmblemGateProps {
  leagueId: string
  userId: string
  isSuspended: boolean
}

const SHOW_MS = 4000
const EXIT_MS = 450

/**
 * Announces newly earned emblems with a top banner and the "stamp" sound, then marks them seen.
 * Waits while the booster stage, onboarding or the whats-new booster is open.
 */
export function EmblemGate({ leagueId, userId, isSuspended }: EmblemGateProps) {
  const navigate = useNavigate()
  const { unseen, markSeen } = useUnseenEmblems(leagueId)
  const [batch, setBatch] = useState<readonly EmblemId[] | null>(null)
  const [isShown, setIsShown] = useState(false)

  if (batch === null && !isSuspended && unseen.length > 0) {
    setBatch(unseen.map((emblem) => emblem.id))
  }

  useEffect(() => {
    if (batch === null) return undefined
    const level = Math.max(...batch.map((id) => tierRank(emblemDefinition(id).tier)))
    playSound({ name: 'stamp', level })
    markSeen(batch)
    const enter = window.requestAnimationFrame(() => setIsShown(true))
    const hide = window.setTimeout(() => setIsShown(false), SHOW_MS)
    const clear = window.setTimeout(() => setBatch(null), SHOW_MS + EXIT_MS)
    return () => {
      window.cancelAnimationFrame(enter)
      window.clearTimeout(hide)
      window.clearTimeout(clear)
    }
  }, [batch, markSeen])

  if (batch === null) return null
  return (
    <EmblemUnlockBanner
      emblemIds={batch}
      isShown={isShown}
      onOpen={() => {
        setIsShown(false)
        void navigate({
          to: '/l/$leagueId/members/$userId',
          params: { leagueId, userId },
          search: { tab: 'emblems' },
        })
      }}
    />
  )
}
