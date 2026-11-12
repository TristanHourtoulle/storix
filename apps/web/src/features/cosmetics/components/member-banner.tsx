import type { CosmeticItemId } from '@storix/shared'
import { bannerKind } from '../cosmetic-skins'

const STARS = [
  { cx: 30, cy: 70, r: 2 },
  { cx: 70, cy: 40, r: 2.4 },
  { cx: 120, cy: 52, r: 1.8 },
  { cx: 165, cy: 22, r: 2.6, isGold: true },
  { cx: 210, cy: 38, r: 1.8 },
  { cx: 260, cy: 18, r: 2.2 },
  { cx: 240, cy: 72, r: 1.2 },
  { cx: 95, cy: 16, r: 1.2 },
  { cx: 185, cy: 80, r: 1.4 },
] as const

const FILM_PLACEHOLDERS = ['plage', 'soiree', 'foret', 'cuisine', 'metro'] as const

const FILM_HALF = 5

function Constellation() {
  return (
    <svg viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="30,70 70,40 120,52 165,22 210,38 260,18"
        fill="none"
        stroke="#a78bfa77"
        strokeWidth="1"
      />
      {STARS.map((star) => (
        <circle
          key={`${star.cx}-${star.cy}`}
          className="bn-star"
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill={'isGold' in star ? '#fde68a' : '#fff'}
        />
      ))}
    </svg>
  )
}

function Film({ photoUrls }: { photoUrls: readonly string[] }) {
  const half = Array.from({ length: FILM_HALF }, (_, index) => ({
    url: photoUrls.length > 0 ? (photoUrls[index % photoUrls.length] ?? null) : null,
    placeholder: FILM_PLACEHOLDERS[index % FILM_PLACEHOLDERS.length],
  }))
  const frames = [...half, ...half].map((frame, key) => ({ ...frame, key }))
  return (
    <div className="bn-strip">
      {frames.map((frame) =>
        frame.url === null ? (
          <span key={frame.key} className={`bn-frame bn-ph-${frame.placeholder}`} />
        ) : (
          <img
            key={frame.key}
            className="bn-frame"
            src={frame.url}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ),
      )}
    </div>
  )
}

interface MemberBannerProps {
  bannerId: CosmeticItemId | null
  photoUrls?: readonly string[]
}

/** The banner a member wears at the top of their page, or nothing for the original header. */
export function MemberBanner({ bannerId, photoUrls = [] }: MemberBannerProps) {
  const kind = bannerKind(bannerId)
  if (kind === null) return null
  return (
    <div className={`bn bn-${kind}`} aria-hidden="true">
      {kind === 'constellation' ? <Constellation /> : null}
      {kind === 'pellicule' ? <Film photoUrls={photoUrls} /> : null}
    </div>
  )
}
