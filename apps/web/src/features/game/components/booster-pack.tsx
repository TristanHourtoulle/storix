import { packSkinClass } from '@/features/cosmetics/cosmetic-skins'
import { useEquippedStyle } from '@/features/cosmetics/style-context'

interface BoosterPackProps {
  size: 'md' | 'lg'
  isPremium?: boolean
}

export function BoosterPack({ size, isPremium = false }: BoosterPackProps) {
  const skin = packSkinClass(useEquippedStyle().booster)
  return (
    <div
      className={`pack ${size}${isPremium ? ' is-premium' : ''}${skin ? ` ${skin}` : ''}`}
      aria-hidden="true"
    >
      <div className="pack-foil" />
      <span className="pack-logo">STORIX</span>
      <span className="pack-sub">{isPremium ? 'Premium' : '5 cartes'}</span>
    </div>
  )
}
