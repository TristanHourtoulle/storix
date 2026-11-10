import { useState } from 'react'
import { GOAL_REWARD_BOOSTERS, type LeagueGoal, type Portrait } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { useCountdown } from '@/features/game/use-countdown'
import { formatTimeLeft } from '@/lib/time-left'
import { GOAL_WORDING } from '../goal-copy'
import { GoalHelpersSheet } from './goal-helpers-sheet'

interface GoalCardProps {
  leagueId: string
  goal: LeagueGoal
  me: { id: string; displayUsername: string; avatar: Portrait | null }
  onElapsed: () => void
}

const BONUS_MARK_PERCENT = 99
const FRIEND_AVATARS = 3
const OWN_AVATAR_TINT = 'var(--color-accent)'

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0
}

/** "Objectif de la ligue" card: one shared gauge with the target and bonus marks, the viewer's share and friends. */
export function GoalCard({ leagueId, goal, me, onElapsed }: GoalCardProps) {
  const [isHelpersOpen, setIsHelpersOpen] = useState(false)
  const remainingMs = useCountdown(goal.endsAt, onElapsed)
  const wording = GOAL_WORDING[goal.type]
  const targetPercent = percent(goal.target, goal.bonusTarget)
  const friends = goal.contributors.filter((contributor) => contributor.userId !== me.id)
  const friendsTotal = Math.max(0, goal.progress - goal.own)

  return (
    <section className="goal" aria-label="Objectif de la ligue">
      <div className="goal-h">
        <h2>Objectif de la ligue</h2>
        {remainingMs === null ? null : <em>reste {formatTimeLeft(remainingMs)}</em>}
      </div>
      <p className="goal-t">
        {wording.verb} <span>{goal.progress}</span> / {goal.target} {wording.unit(goal.target)}
      </p>
      <div
        className="goal-bar"
        role="progressbar"
        aria-label="Progression de l'objectif"
        aria-valuemin={0}
        aria-valuemax={goal.bonusTarget}
        aria-valuenow={Math.min(goal.progress, goal.bonusTarget)}
      >
        <span
          className="goal-fill"
          style={{ width: `${percent(goal.progress, goal.bonusTarget)}%` }}
        />
        <span className="goal-mark" style={{ left: `${targetPercent}%` }} />
        <span className="goal-mark is-bonus" style={{ left: `${BONUS_MARK_PERCENT}%` }} />
      </div>
      <div className="goal-labels" aria-hidden="true">
        <span style={{ left: `${targetPercent}%` }}>{goal.target}</span>
        <span className="is-bonus">{goal.bonusTarget} · bonus</span>
      </div>
      <div className="goal-foot">
        <span className="goal-reward">
          <span className="goal-bx" aria-hidden="true" />+{GOAL_REWARD_BOOSTERS} boosters à{' '}
          {goal.target}
        </span>
        <span className="goal-reward">
          <span className="goal-bx is-gold" aria-hidden="true" />
          premium à {goal.bonusTarget}
        </span>
      </div>
      <button type="button" className="goal-contrib" onClick={() => setIsHelpersOpen(true)}>
        <span className="goal-crow is-me">
          <span className="goal-av">
            <Avatar
              label={me.displayUsername}
              portrait={me.avatar}
              size="mini"
              isTinted
              tint={OWN_AVATAR_TINT}
            />
          </span>
          <span className="goal-cb">
            <i style={{ width: `${percent(goal.own, goal.progress)}%` }} />
          </span>
          <em>toi · {goal.own}</em>
        </span>
        {goal.contributorsCount > 0 ? (
          <span className="goal-crow">
            <span className="goal-avstack">
              {friends.slice(0, FRIEND_AVATARS).map((friend) => (
                <span key={friend.userId} className="goal-av">
                  <Avatar
                    label={friend.displayUsername}
                    portrait={friend.avatar}
                    size="mini"
                    isTinted
                  />
                </span>
              ))}
            </span>
            <span className="goal-cb">
              <i style={{ width: `${percent(friendsTotal, goal.progress)}%` }} />
            </span>
            <em>{wording.friendsDid(goal.contributorsCount)}</em>
          </span>
        ) : null}
      </button>
      <GoalHelpersSheet
        leagueId={leagueId}
        type={goal.type}
        isOpen={isHelpersOpen}
        onClose={() => setIsHelpersOpen(false)}
      />
    </section>
  )
}
