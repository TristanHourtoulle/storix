import { layoutDeck, revealQuick } from '@/features/boosters/arcade/choreography'
import type { Director } from '@/features/boosters/arcade/director'
import { CENTER_Y } from '@/features/boosters/arcade/geometry'
import type { TierFx } from '@/features/boosters/arcade/tiers'

function lightAura(d: Director, index: number, tier: TierFx, isFirstShow: boolean): void {
  const card = d.layers.cards[index]
  if (!card) return
  const L = tier.level
  const opacity = 0.35 + L * 0.07
  card.root.classList.add('is-lit')
  if (d.isReduced) {
    card.aura.style.opacity = String(opacity)
    card.aura.style.transform = 'scale(1)'
    return
  }
  d.fire(
    d.tween(
      card.aura,
      [
        { opacity: 0, transform: 'scale(.8)' },
        { opacity, transform: 'scale(1)' },
      ],
      { duration: 420, easing: 'ease-out' },
    ),
  )
  d.rays(tier.color, L >= 3 ? 0.12 : 0, 600)
  d.tint(tier, L >= 3 ? 0.2 : 0, 500)
  if (!isFirstShow) return
  d.burst(d.width / 2, CENTER_Y, {
    n: 20 + L * 14,
    kind: 'confetti',
    colors: tier.particles,
    speed: [200, 420],
    gravity: 800,
    drag: 1.4,
    life: [0.8, 1.3],
    size: [2.5, 4.5],
    jx: 60,
  })
}

/**
 * Reveals a feature card: a short rise and flip, then its tier aura lights up.
 * Re-shown cards fly back from their slot and skip the confetti.
 */
export async function revealNewsCard(
  d: Director,
  index: number,
  tier: TierFx,
  firstHidden: number,
  isFirstShow: boolean,
): Promise<void> {
  const card = d.layers.cards[index]
  if (!card) return
  card.root.style.display = ''
  const flip = revealQuick(d, index)
  layoutDeck(d, firstHidden, true, 300)
  await flip
  lightAura(d, index, tier, isFirstShow)
}
