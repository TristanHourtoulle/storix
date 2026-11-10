import type { MissionRow as Mission } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { MISSION_ICONS, boosterRewardLabel, dustLabel } from '../mission-copy'

interface MissionRowProps {
  mission: Mission
  hasCount?: boolean
  canReroll?: boolean
  isRerolling?: boolean
  isClaiming?: boolean
  onClaim: (mission: Mission, origin: Element) => void
  onReroll?: (missionId: string) => void
}

function RewardSlot({
  mission,
  isClaiming,
  onClaim,
}: {
  mission: Mission
  isClaiming: boolean
  onClaim: MissionRowProps['onClaim']
}) {
  const { reward } = mission
  const amount = reward.boosters > 0 ? boosterRewardLabel(reward) : `+${dustLabel(reward.dust)}`
  if (mission.isClaimed) return <span className="mis-ok">{amount} ✓</span>
  if (mission.isComplete) {
    return (
      <button
        type="button"
        className="mis-claim"
        aria-label={`Récupérer ${amount}`}
        aria-busy={isClaiming}
        disabled={isClaiming}
        onClick={(event) => onClaim(mission, event.currentTarget)}
      >
        {reward.boosters > 0 ? <i className="mis-pack" /> : <i className="mis-diamond" />}
        {amount}
      </button>
    )
  }
  if (reward.boosters > 0) {
    return (
      <span className="mis-boost">
        <i className="mis-pack" />
        {amount}
      </span>
    )
  }
  return (
    <span className="mis-rew">
      <i className="mis-diamond" />
      {dustLabel(reward.dust)}
    </span>
  )
}

/** One mission: icon, label, optional count, progress bar and its reward or claim button. */
export function MissionRow({
  mission,
  hasCount = false,
  canReroll = false,
  isRerolling = false,
  isClaiming = false,
  onClaim,
  onReroll,
}: MissionRowProps) {
  const progress = Math.min(mission.progress, mission.target)
  const isRerollShown = canReroll && onReroll !== undefined
  return (
    <div
      className={`mis${mission.isClaimed ? ' is-done' : ''}${isRerollShown ? ' has-reroll' : ''}`}
    >
      <span className="mis-ic">
        <Icon name={MISSION_ICONS[mission.source]} className="mis-glyph" />
      </span>
      <div className="mis-tx">
        <span>{mission.label}</span>
        {hasCount ? (
          <em>
            {progress} / {mission.target}
          </em>
        ) : null}
        <div
          className="mis-bar"
          role="progressbar"
          aria-label={mission.label}
          aria-valuemin={0}
          aria-valuemax={mission.target}
          aria-valuenow={progress}
        >
          <i style={{ width: `${(progress / mission.target) * 100}%` }} />
        </div>
      </div>
      {isRerollShown ? (
        <button
          type="button"
          className="mis-reroll"
          aria-label={`Changer « ${mission.label} »`}
          disabled={isRerolling}
          onClick={() => onReroll(mission.id)}
        >
          <Icon name="retry" className="mis-glyph" />
        </button>
      ) : null}
      <RewardSlot mission={mission} isClaiming={isClaiming} onClaim={onClaim} />
    </div>
  )
}
