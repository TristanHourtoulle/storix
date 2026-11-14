import { type CSSProperties } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { showToast } from '@/components/ui/toast'
import type { CharmItem } from '@storix/shared'
import { formatDustPrice } from '@/features/cosmetics/cosmetic-copy'
import { useWallet } from '@/features/game/use-wallet'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { CHARM_COPY, capitalizedName } from '../charm-copy'
import { usePurchaseCharm } from '../use-purchase-charm'
import { CharmIcon } from './charm-icon'

interface ActiveSlot {
  item: CharmItem
  charges: number
}

interface CharmSheetProps {
  leagueId: string
  charm: CharmItem | null
  active: ActiveSlot | null
  isWeeklyLimitReached: boolean
  onClose: () => void
}

function sheetTitle(charm: CharmItem | null, active: ActiveSlot | null): string {
  if (charm === null) return ''
  const named = CHARM_COPY[charm.id].named
  return active === null
    ? `Prendre ${named} ?`
    : `Remplacer ${CHARM_COPY[active.item.id].named} par ${named} ?`
}

/** Confirms a charm: its effect, the charges lost when it replaces another one, the price and balance. */
export function CharmSheet({
  leagueId,
  charm,
  active,
  isWeeklyLimitReached,
  onClose,
}: CharmSheetProps) {
  return (
    <BottomSheet open={charm !== null} title={sheetTitle(charm, active)} onClose={onClose}>
      {charm ? (
        <CharmSheetBody
          key={charm.id}
          leagueId={leagueId}
          charm={charm}
          active={active}
          isWeeklyLimitReached={isWeeklyLimitReached}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  )
}

interface CharmSheetBodyProps {
  leagueId: string
  charm: CharmItem
  active: ActiveSlot | null
  isWeeklyLimitReached: boolean
  onClose: () => void
}

function CharmSheetBody({
  leagueId,
  charm,
  active,
  isWeeklyLimitReached,
  onClose,
}: CharmSheetBodyProps) {
  const dust = useWallet(leagueId).data?.dust
  const leagueName = useMyLeagues().find((league) => league.id === leagueId)?.name ?? 'la ligue'
  const { purchase, isPending, errorMessage } = usePurchaseCharm(leagueId)
  const copy = CHARM_COPY[charm.id]
  const left = dust === undefined ? null : dust - charm.price
  const isShort = left !== null && left < 0

  function buy() {
    purchase({ charmId: charm.id, replaceCharm: active?.item.id ?? null }, () => {
      showToast(`${charm.name} actif pour 10 boosters.`)
      onClose()
    })
  }

  return (
    <>
      <div className="charm-sheet-head" style={{ '--c': copy.color } as CSSProperties}>
        <span className="charm-ico is-lg">
          <CharmIcon charm={charm.id} />
        </span>
        <span className="charm-row-text">
          <b>{copy.short}</b>
          <span className="charm-row-eff">{copy.effect}</span>
          {copy.note === null ? null : <span className="charm-row-eff">{copy.note}</span>}
          <span className="charm-row-eff">
            Pour tes 10 prochains boosters, standard ou premium.
          </span>
        </span>
      </div>
      {active ? (
        <p className="charm-sheet-warn">
          {`${capitalizedName(CHARM_COPY[active.item.id].named)} ${
            active.charges > 1
              ? `perd ses ${active.charges} boosters restants.`
              : 'perd son dernier booster.'
          }`}
        </p>
      ) : null}
      {isWeeklyLimitReached ? (
        <p role="alert" className="m-0 text-sm text-danger">
          Tu as déjà pris 3 bonus cette semaine. Reviens dans quelques jours.
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="button"
        className="shop-btn"
        disabled={isPending || isShort || dust === undefined || isWeeklyLimitReached}
        aria-busy={isPending}
        onClick={buy}
      >
        {isPending
          ? 'Achat…'
          : `${active ? 'Remplacer' : 'Prendre'} · ${formatDustPrice(charm.price)}`}
      </button>
      {left === null ? null : (
        <p className={isShort ? 'shop-left is-short' : 'shop-left'}>
          {isShort
            ? `Il te manque ${formatDustPrice(-left)} dans ${leagueName}.`
            : `Il te restera ${formatDustPrice(left)} dans ${leagueName}`}
        </p>
      )}
    </>
  )
}
