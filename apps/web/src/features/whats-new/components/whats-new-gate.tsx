import { useCallback, useEffect, useMemo, useState } from 'react'
import { newsDeckOf, type NewsDeck } from '../news-deck'
import { markAutoShown, wasAutoShown } from '../news-session'
import { useWhatsNew } from '../use-whats-new'
import { NewsStage } from './news-stage'

interface WhatsNewGateProps {
  leagueId: string
  userId: string
  isSuspended: boolean
  onOpenChange: (isOpen: boolean) => void
}

/** Opens the "Nouveautés" booster once per app session while a known release is unseen. */
export function WhatsNewGate({ leagueId, userId, isSuspended, onOpenChange }: WhatsNewGateProps) {
  const { knownUnseen, markSeen } = useWhatsNew()
  const deck = useMemo(() => newsDeckOf(knownUnseen), [knownUnseen])
  const [shownDeck, setShownDeck] = useState<NewsDeck | null>(null)
  const [hasOpened, setHasOpened] = useState(false)

  if (!hasOpened && !isSuspended && deck !== null && !wasAutoShown(userId)) {
    setHasOpened(true)
    setShownDeck(deck)
  }

  const isOpen = shownDeck !== null

  useEffect(() => {
    if (isOpen) markAutoShown(userId)
    onOpenChange(isOpen)
  }, [isOpen, onOpenChange, userId])

  const close = useCallback(() => {
    if (shownDeck !== null) markSeen(shownDeck.releaseId)
    setShownDeck(null)
  }, [markSeen, shownDeck])

  if (shownDeck === null) return null
  return <NewsStage leagueId={leagueId} deck={shownDeck} mode="auto" onClose={close} />
}
