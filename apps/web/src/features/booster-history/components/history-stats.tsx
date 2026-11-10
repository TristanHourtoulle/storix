import type { BoosterHistoryStats } from '@storix/shared'
import { TIER_COLOR_VAR, TIER_LABELS } from '@/features/cards/tier-labels'

interface HistoryStatsProps {
  stats: BoosterHistoryStats
}

function bestCardCaption(stats: BoosterHistoryStats): string {
  const card = stats.bestPull?.card
  if (!card) return 'meilleure carte'
  return card.kind === 'owned' ? `meilleure carte · « ${card.title} »` : 'meilleure carte'
}

/** The four tiles at the top of the booster history. */
export function HistoryStats({ stats }: HistoryStatsProps) {
  const best = stats.bestPull
  return (
    <div className="hstats">
      <div className="hstat">
        <b>{stats.openedCount}</b>
        <small>{stats.openedCount > 1 ? 'boosters ouverts' : 'booster ouvert'}</small>
      </div>
      <div className="hstat">
        <b className="is-gold">{stats.premiumCount}</b>
        <small>{stats.premiumCount > 1 ? 'boosters premium' : 'booster premium'}</small>
      </div>
      <div className="hstat">
        <b style={best ? { color: TIER_COLOR_VAR[best.tierAtMint] } : undefined}>
          {best ? TIER_LABELS[best.tierAtMint] : '—'}
        </b>
        <small>{bestCardCaption(stats)}</small>
      </div>
      <div className="hstat">
        {stats.boostersSinceLegendary === null ? (
          <>
            <b>—</b>
            <small>Aucune Légendaire pour l'instant</small>
          </>
        ) : (
          <>
            <b>{stats.boostersSinceLegendary}</b>
            <small>boosters depuis ta dernière Légendaire</small>
          </>
        )}
      </div>
    </div>
  )
}
