import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GOAL_BONUS_PREMIUM_GIFTS, GOAL_REWARD_BOOSTERS, type LeagueGoal } from '@storix/shared'
import { walletQueryOptions } from '@/features/game/game.queries'
import { playSound } from '@/features/sound/sound'
import { goalAmount } from '../goal-copy'
import { useLeagueGoal } from '../use-league-goal'

interface GoalBannerGateProps {
  leagueId: string
  isSuspended: boolean
  onOpenChange?: (isOpen: boolean) => void
}

const START_DELAY_MS = 600
const SHOW_MS = 3200
const EXIT_MS = 450

function bannerCopy(goal: LeagueGoal): { eyebrow: string; title: string; reward: string } {
  if (goal.status === 'bonus') {
    return {
      eyebrow: 'Palier bonus atteint',
      title: `${goalAmount(goal.type, goal.bonusTarget)} cette semaine`,
      reward: `+${GOAL_BONUS_PREMIUM_GIFTS} booster premium pour tout le monde`,
    }
  }
  return {
    eyebrow: 'Objectif atteint',
    title: `${goalAmount(goal.type, goal.target)} cette semaine`,
    reward: `+${GOAL_REWARD_BOOSTERS} boosters pour tout le monde`,
  }
}

/**
 * Announces once that the league reached its weekly goal, as a cyan banner sliding from the top.
 * Starts after a short delay and waits while another banner, prompt or full-screen flow is open.
 */
export function GoalBannerGate({ leagueId, isSuspended, onOpenChange }: GoalBannerGateProps) {
  const queryClient = useQueryClient()
  const { goal, markBannerSeen } = useLeagueGoal(leagueId)
  const [shown, setShown] = useState<LeagueGoal | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const isPending = goal?.showBanner === true && shown === null

  useEffect(() => {
    if (!isPending || isSuspended || goal === undefined) return undefined
    const timer = window.setTimeout(() => setShown(goal), START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [isPending, isSuspended, goal])

  const isOpen = shown !== null
  useEffect(() => {
    onOpenChange?.(isOpen)
    return () => onOpenChange?.(false)
  }, [isOpen, onOpenChange])

  useEffect(() => {
    if (!isOpen) return undefined
    markBannerSeen()
    playSound({ name: 'summary' })
    void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
    const enter = window.requestAnimationFrame(() => setIsVisible(true))
    const hide = window.setTimeout(() => setIsVisible(false), SHOW_MS)
    return () => {
      window.cancelAnimationFrame(enter)
      window.clearTimeout(hide)
    }
  }, [isOpen, markBannerSeen, queryClient, leagueId])

  useEffect(() => {
    if (!isOpen || isVisible) return undefined
    const done = window.setTimeout(() => setShown(null), EXIT_MS)
    return () => window.clearTimeout(done)
  }, [isOpen, isVisible])

  if (shown === null) return null
  const copy = bannerCopy(shown)
  return (
    <div className="goal-banner-wrap" aria-live="polite">
      <button
        type="button"
        className={`goal-banner${isVisible ? ' is-shown' : ''}`}
        aria-hidden={!isVisible}
        tabIndex={isVisible ? 0 : -1}
        onClick={() => setIsVisible(false)}
      >
        <span className="goal-banner-pack" aria-hidden="true" />
        <span className="goal-banner-txt">
          <span className="goal-banner-ey">{copy.eyebrow}</span>
          <b>{copy.title}</b>
          <small>{copy.reward}</small>
        </span>
      </button>
    </div>
  )
}
