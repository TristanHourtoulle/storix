import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { walletQueryOptions } from '@/features/game/game.queries'
import { markOnboardingShown, wasOnboardingShown } from '../onboarding-session'
import { useOnboarding } from '../use-onboarding'
import { OnboardingStories, type OnboardingCloseReason } from './onboarding-stories'

interface OnboardingGateProps {
  leagueId: string
  userId: string
  isSuspended: boolean
  onOpenChange: (isOpen: boolean) => void
}

/** Opens the "Premiers pas" stories once for an account that has never seen them. */
export function OnboardingGate({
  leagueId,
  userId,
  isSuspended,
  onOpenChange,
}: OnboardingGateProps) {
  const navigate = useNavigate()
  const { isPending, isSeen, markSeen } = useOnboarding()
  const wallet = useQuery(walletQueryOptions(leagueId))
  const [isOpen, setIsOpen] = useState(false)
  const isWalletSettled = !wallet.isPending

  if (
    !isOpen &&
    !isPending &&
    !isSeen &&
    !isSuspended &&
    isWalletSettled &&
    !wasOnboardingShown(userId)
  ) {
    setIsOpen(true)
  }

  useEffect(() => {
    if (isOpen) markOnboardingShown(userId)
    onOpenChange(isOpen)
  }, [isOpen, onOpenChange, userId])

  const close = useCallback(
    (reason: OnboardingCloseReason) => {
      markSeen()
      setIsOpen(false)
      if (reason === 'photo') void navigate({ to: '/l/$leagueId/add', params: { leagueId } })
    },
    [leagueId, markSeen, navigate],
  )

  if (!isOpen) return null
  return <OnboardingStories leagueId={leagueId} mode="auto" onClose={close} />
}
