import type { CosmeticItemId, Portrait, PromotedHolder } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { TIER_LABELS } from '../tier-labels'

interface PromotedHoldersProps {
  holders: PromotedHolder[]
  avatars: ReadonlyMap<string, Portrait>
  frames: ReadonlyMap<string, CosmeticItemId>
}

export function PromotedHolders({ holders, avatars, frames }: PromotedHoldersProps) {
  if (holders.length === 0) return null

  return (
    <section className="perso" aria-labelledby="perso-title">
      <p id="perso-title" className="meta-k">
        Raretés perso
      </p>
      <ul className="perso-list">
        {holders.map(({ holder, tier }, index) => {
          const name = holder.displayUsername ?? 'Ancien membre'
          return (
            <li key={holder.userId ?? `former-${index}`} className="perso-row">
              <Avatar
                label={name}
                portrait={holder.userId ? (avatars.get(holder.userId) ?? null) : null}
                frame={holder.userId ? (frames.get(holder.userId) ?? null) : null}
              />
              <span className="meta-v !m-0 min-w-0 truncate">
                {`${TIER_LABELS[tier]} ★ chez ${name}`}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
