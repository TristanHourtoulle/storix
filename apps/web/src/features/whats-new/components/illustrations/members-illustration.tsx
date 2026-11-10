import { IllFrame, MiniCard } from './illustration-kit'
import '@/styles/news-ill-members.css'

const STATS = [
  { value: '42', label: 'photos' },
  { value: '118', label: 'cartes' },
  { value: '9', label: 'découv.' },
] as const

/** A member's binder: avatar with featured emblems, stat tiles and a six-card showcase. */
export function MembersIllustration({ isLive }: { isLive: boolean }) {
  return (
    <IllFrame scene="mbr" isLive={isLive}>
      <div className="mb-head">
        <i className="mb-avatar">L</i>
        <b>Léa</b>
        <span className="mb-emblems">
          <i className="t-M" />
          <i className="t-L" />
          <i className="t-E" />
        </span>
      </div>
      <div className="mb-stats">
        {STATS.map((stat) => (
          <span key={stat.label}>
            <b>{stat.value}</b>
            {stat.label}
          </span>
        ))}
      </div>
      <div className="mb-vit">
        <MiniCard tier="M" art={0} />
        <MiniCard tier="L" art={1} />
        <MiniCard tier="E" art={2} />
        <MiniCard tier="R" art={3} />
        <MiniCard tier="E" art={4} />
        <MiniCard tier="U" art={1} />
      </div>
    </IllFrame>
  )
}
