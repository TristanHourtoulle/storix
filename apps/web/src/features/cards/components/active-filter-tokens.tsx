import type { MemberSummary } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import type { CollectionFilterState } from '../collection-filters'
import { TIER_COLOR_VAR, TIER_LABELS } from '../tier-labels'

interface ActiveFilterTokensProps {
  filters: CollectionFilterState
  members: readonly MemberSummary[]
  onChange: (filters: CollectionFilterState) => void
}

export function ActiveFilterTokens({ filters, members, onChange }: ActiveFilterTokensProps) {
  const authorName = members.find((member) => member.userId === filters.authorId)?.displayUsername
  const tagged = members.find((member) => member.userId === filters.taggedUserId)
  const taggedName = tagged ? (tagged.isSelf ? 'moi' : tagged.displayUsername) : 'un membre'

  return (
    <>
      {filters.authorId !== null ? (
        <FilterToken
          label={authorName ?? 'Membre'}
          onRemove={() => onChange({ ...filters, authorId: null })}
        />
      ) : null}
      {filters.taggedUserId !== null ? (
        <FilterToken
          label={`Sur la photo : ${taggedName}`}
          onRemove={() => onChange({ ...filters, taggedUserId: null })}
        />
      ) : null}
      {filters.tier !== null ? (
        <FilterToken
          label={TIER_LABELS[filters.tier]}
          dotColor={TIER_COLOR_VAR[filters.tier]}
          onRemove={() => onChange({ ...filters, tier: null })}
        />
      ) : null}
      {filters.hideLocked ? (
        <FilterToken
          label="À découvrir masquées"
          onRemove={() => onChange({ ...filters, hideLocked: false })}
        />
      ) : null}
      {filters.upgradable ? (
        <FilterToken
          label="À améliorer"
          onRemove={() => onChange({ ...filters, upgradable: false })}
        />
      ) : null}
      {filters.moment ? (
        <FilterToken label="Moments" onRemove={() => onChange({ ...filters, moment: false })} />
      ) : null}
    </>
  )
}

interface FilterTokenProps {
  label: string
  dotColor?: string
  onRemove: () => void
}

function FilterToken({ label, dotColor, onRemove }: FilterTokenProps) {
  return (
    <button
      type="button"
      className="filter-token"
      aria-label={`Retirer le filtre ${label}`}
      onClick={onRemove}
    >
      {dotColor ? (
        <span
          aria-hidden="true"
          className="filter-token-dot"
          style={{ backgroundColor: dotColor }}
        />
      ) : null}
      {label}
      <Icon name="close" className="size-3" />
    </button>
  )
}
