interface BoosterPackProps {
  size: 'md' | 'lg'
}

export function BoosterPack({ size }: BoosterPackProps) {
  return (
    <div className={`pack ${size}`} aria-hidden="true">
      <div className="pack-foil" />
      <span className="pack-logo">STORIX</span>
      <span className="pack-sub">5 cartes</span>
    </div>
  )
}
