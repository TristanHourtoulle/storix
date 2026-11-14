import { useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { BoosterPack } from '@/features/game/components/booster-pack'
import { tearKind, type TearKind } from '../cosmetic-skins'
import { useEquippedStyle } from '../style-context'
import '@/styles/cosmetics-tears-demo.css'

const TAPS = 3
const CRACKS = [
  'M29 20 L22 34',
  'M29 20 L38 30',
  'M22 34 L30 44 L18 62',
  'M38 30 L34 46 L44 60',
  'M30 44 L40 42',
] as const
const SPARKS = [
  { left: '20%', animationDelay: '0s' },
  { left: '48%', animationDelay: '.4s' },
  { left: '74%', animationDelay: '.8s' },
] as const
const SHARDS = [
  { left: '10%', '--dx': '-18px', '--dy': '-26px', '--r': '-90deg', animationDelay: '0s' },
  { left: '46%', '--dx': '4px', '--dy': '-34px', '--r': '120deg', animationDelay: '.3s' },
  { left: '76%', '--dx': '20px', '--dy': '-22px', '--r': '200deg', animationDelay: '.6s' },
] as const

type TearPhase = 'static' | 'sealed' | 'hit-1' | 'hit-2' | 'open'

interface TearMarkProps {
  kind: TearKind | null
  phase?: TearPhase
  hasMotion?: boolean
  size?: 'md' | 'lg'
}

function Cracks() {
  return (
    <svg className="tm-cracks" viewBox="0 0 58 86" preserveAspectRatio="none" aria-hidden="true">
      {CRACKS.map((d) => (
        <path key={d} d={d} pathLength={1} />
      ))}
    </svg>
  )
}

function Marks({ kind, hasMotion }: { kind: TearKind | null; hasMotion: boolean }) {
  switch (kind) {
    case 'braises':
      return (
        <>
          <span className="tm-burn" />
          {hasMotion
            ? SPARKS.map((style) => <span key={style.left} className="tm-spark" style={style} />)
            : null}
        </>
      )
    case 'verre':
    case null:
      return (
        <>
          <Cracks />
          {hasMotion && kind === 'verre'
            ? SHARDS.map((style) => (
                <span key={style.left} className="tm-shard" style={style as CSSProperties} />
              ))
            : null}
        </>
      )
    case 'ruban':
      return (
        <>
          <span className="tm-ribbon-v" />
          <span className="tm-ribbon-h" />
          <span className="tm-bow" />
        </>
      )
  }
}

/** A shop booster wearing the marks of an opening tear, sealed, mid-tear or open. */
export function TearMark({
  kind,
  phase = 'static',
  hasMotion = false,
  size = 'md',
}: TearMarkProps) {
  const isPremium = kind === 'ruban'
  const classes = ['tear-mark', `is-${kind ?? 'original'}`, `is-${phase}`]
  if (phase === 'hit-1' || phase === 'hit-2') classes.push('is-hit')
  return (
    <div className={classes.join(' ')}>
      <BoosterPack size={size} isPremium={isPremium} />
      {phase !== 'static' && (kind === 'braises' || kind === 'ruban') ? (
        <div className="tear-top" aria-hidden="true">
          <BoosterPack size={size} isPremium={isPremium} />
        </div>
      ) : null}
      <div className="tear-layer" aria-hidden="true">
        <Marks kind={kind} hasMotion={hasMotion} />
      </div>
    </div>
  )
}

function phaseOf(taps: number): TearPhase {
  if (taps >= TAPS) return 'open'
  if (taps === 2) return 'hit-2'
  if (taps === 1) return 'hit-1'
  return 'sealed'
}

function hintOf(taps: number): string {
  if (taps >= TAPS) return 'Ta carte sort du booster'
  if (taps === 0) return 'Touche 3 fois le booster'
  return taps === 1 ? 'Encore 2 tapes' : 'Encore 1 tape !'
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The cabin's stage for tears: tap the worn booster three times to play its tear, then replay it. */
export function TearDemo() {
  const kind = tearKind(useEquippedStyle().openingTear)
  const [taps, setTaps] = useState(0)
  const [round, setRound] = useState(0)
  const stageRef = useRef<HTMLButtonElement>(null)
  const isOpen = taps >= TAPS

  function tap() {
    if (isOpen) return
    const next = taps + 1
    setTaps(next)
    if (stageRef.current && !prefersReducedMotion()) {
      const tilt = next % 2 ? 1 : -1
      stageRef.current.animate(
        [
          { transform: `scale(.92) rotate(${-3 * tilt}deg)`, offset: 0.3 },
          { transform: `scale(${1 + next * 0.02}) rotate(${2 * tilt}deg)`, offset: 0.65 },
          { transform: 'none' },
        ],
        { duration: 320, easing: 'ease-out' },
      )
    }
  }

  function replay() {
    setTaps(0)
    setRound((value) => value + 1)
  }

  return (
    <div className="tear-demo">
      <button
        key={round}
        ref={stageRef}
        type="button"
        className={`tear-demo-stage${isOpen ? ' is-open' : ''}`}
        onClick={tap}
        aria-label={hintOf(taps)}
        aria-disabled={isOpen || undefined}
      >
        <span className="tear-peek" aria-hidden="true" />
        <TearMark kind={kind} phase={phaseOf(taps)} hasMotion={isOpen} size="lg" />
      </button>
      <div className="tear-demo-pips" aria-hidden="true">
        {Array.from({ length: TAPS }, (_, index) => (
          <span key={index} className={index < taps ? 'is-on' : undefined} />
        ))}
      </div>
      <p className="tear-demo-hint" aria-live="polite">
        {hintOf(taps)}
      </p>
      {isOpen ? (
        <Button variant="ghost" onClick={replay}>
          Rejouer
        </Button>
      ) : null}
    </div>
  )
}
