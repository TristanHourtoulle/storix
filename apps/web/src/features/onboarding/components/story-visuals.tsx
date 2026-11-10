import type { CSSProperties } from 'react'
import type { StoryKey } from '../onboarding-stories'

const FAN_TIERS = ['common', 'rare', 'legendary'] as const

const RARITY_SIGNALS = ['Un membre qui poste peu', 'Une photo ancienne', 'Des réactions du groupe']

function fanStyle(tier: (typeof FAN_TIERS)[number], index: number): CSSProperties {
  const offset = index - 1
  return {
    '--c': `var(--color-tier-${tier})`,
    transform: `rotate(${offset * 14}deg) translateX(${offset * 34}px)`,
  } as CSSProperties
}

function CardFan() {
  return (
    <div className="ob-fan">
      {FAN_TIERS.map((tier, index) => (
        <i key={tier} style={fanStyle(tier, index)} />
      ))}
    </div>
  )
}

interface NumberedRowsProps {
  rows: readonly string[]
}

/** Numbered step rows shared by the rarity and install stories. */
export function NumberedRows({ rows }: NumberedRowsProps) {
  return (
    <div className="ob-osgrid">
      {rows.map((row, index) => (
        <div key={row} className="ob-osrow">
          <span className="ob-n">{index + 1}</span>
          {row}
        </div>
      ))}
    </div>
  )
}

function NavPreview() {
  return (
    <div className="ob-nav">
      <span>
        <svg viewBox="0 0 24 24">
          <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
        Accueil
      </span>
      <span>
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="9" rx="1.5" />
          <rect x="3" y="15" width="7" height="6" rx="1.5" />
          <rect x="14" y="15" width="7" height="6" rx="1.5" />
        </svg>
        Collection
      </span>
      <span className="ob-plus">
        <svg viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="ob-soon">
        <svg viewBox="0 0 24 24">
          <path d="M7 7h13l-3-3M17 17H4l3 3" />
        </svg>
        Échanges
      </span>
      <span>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        Profil
      </span>
    </div>
  )
}

function SealedPack() {
  return (
    <span className="ob-pack">
      <span className="ob-crimp ob-crimp-top" />
      <span className="ob-mark">STORIX</span>
      <span className="ob-crimp ob-crimp-bot" />
    </span>
  )
}

function DustGain() {
  return <p className="ob-dust">+400 ✦</p>
}

interface StoryVisualProps {
  storyKey: Exclude<StoryKey, 'install'>
}

/** Decorative illustration of one game story. */
export function StoryVisual({ storyKey }: StoryVisualProps) {
  switch (storyKey) {
    case 'goal':
      return <CardFan />
    case 'rarity':
      return <NumberedRows rows={RARITY_SIGNALS} />
    case 'add':
      return <NavPreview />
    case 'boosters':
      return <SealedPack />
    case 'stacks':
      return <DustGain />
  }
}
