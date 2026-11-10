import { useState } from 'react'
import type { AuditEntry } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { TIER_COLOR_VAR } from '@/features/cards/tier-labels'
import { parisClock } from '@/lib/paris-dates'
import { auditIcon, auditSentence, CATEGORY_CLASS, type SentencePart } from '../audit-sentence'

interface JournalRowProps {
  entry: AuditEntry
}

function Part({ part }: { part: SentencePart }) {
  if (typeof part === 'string') return <>{part}</>
  if (part.isWarning) return <b className="w">{part.strong}</b>
  if (part.tier !== undefined) {
    return (
      <b className="tc" style={{ color: TIER_COLOR_VAR[part.tier] }}>
        {part.strong}
      </b>
    )
  }
  return <b>{part.strong}</b>
}

/** One Journal sentence; tapping it unfolds the detail lines. */
export function JournalRow({ entry }: JournalRowProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { parts, details, isWarning } = auditSentence(entry)
  const hasDetails = details.length > 0
  const classes = ['jrow', isWarning ? 'warn' : CATEGORY_CLASS[entry.category]]

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-expanded={hasDetails ? isOpen : undefined}
      onClick={() => setIsOpen((open) => !open)}
      disabled={!hasDetails}
    >
      <span className="ji">
        <Icon name={auditIcon(entry)} className="jglyph" />
      </span>
      <span className="jtext">
        {parts.map((part, index) => (
          <Part key={index} part={part} />
        ))}
        {hasDetails && isOpen ? (
          <span className="jdet">
            {details.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        ) : null}
      </span>
      <time dateTime={entry.createdAt}>{parisClock(entry.createdAt)}</time>
    </button>
  )
}
