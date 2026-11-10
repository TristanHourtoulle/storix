interface BoosterPackProps {
  size: 'md' | 'lg'
  isPremium?: boolean
}

export function BoosterPack({ size, isPremium = false }: BoosterPackProps) {
  return (
    <div className={`pack ${size}${isPremium ? ' is-premium' : ''}`} aria-hidden="true">
      <div className="pack-foil" />
      <span className="pack-logo">STORIX</span>
      <span className="pack-sub">{isPremium ? 'Premium' : '5 cartes'}</span>
    </div>
  )
}
