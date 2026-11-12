import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { MemberProfile } from '@storix/shared'
import { buttonClassName } from '@/components/ui/button'
import { useSaveShowcase } from '../use-save-showcase'
import { countOf } from '../member-copy'
import { MemberCardGrid } from './member-card-grid'
import { MemberHeader } from './member-header'
import { MemberShowcase } from './member-showcase'
import { MemberStatTiles } from './member-stat-tiles'
import { MemberTabs, type MemberTab } from './member-tabs'
import { ShowcaseEditorSheet } from './showcase-editor-sheet'

interface MemberPageProps {
  leagueId: string
  profile: MemberProfile
  tab: MemberTab
  onTabChange: (tab: MemberTab) => void
  emblems: ReactNode
}

function photosFooter(isSelf: boolean) {
  return ({ total, owned, unpulled }: { total: number; owned: number; unpulled: number }) => {
    if (isSelf) {
      return unpulled > 0
        ? "Tes photos que tu n'as pas encore tirées s'affichent en clair, pour toi seul."
        : countOf(total, 'photo publiée', 'photos publiées')
    }
    return `${countOf(owned, 'possédée', 'possédées')} par toi · ${total - owned} à découvrir`
  }
}

function showcasePhotoUrls(cards: MemberProfile['showcase']): string[] {
  return cards.flatMap((card) => {
    if (card.kind !== 'owned' && card.kind !== 'unpulled') return []
    const smallest = card.image.webp.toSorted((a, b) => a.width - b.width)[0]
    return smallest === undefined ? [] : [smallest.url]
  })
}

function taggedFooter({ total, owned }: { total: number; owned: number }): string {
  return `${countOf(owned, 'possédée', 'possédées')} · ${total - owned} à découvrir`
}

/** Member page "Le classeur": header, stat tiles, showcase, then Photos / Avec / Emblèmes tabs. */
export function MemberPage({ leagueId, profile, tab, onTabChange, emblems }: MemberPageProps) {
  const { header, stats, counts } = profile
  const name = header.isSelf ? 'moi' : header.displayUsername
  const [isEditing, setIsEditing] = useState(false)
  const showcase = useSaveShowcase(leagueId, header.userId)
  const savedIds = profile.isShowcaseCustom ? profile.showcase.map((card) => card.id) : []

  return (
    <>
      <MemberHeader
        header={header}
        bestTier={stats.bestTier}
        photoUrls={showcasePhotoUrls(profile.showcase)}
      />
      <MemberStatTiles stats={stats} />
      <MemberShowcase
        leagueId={leagueId}
        cards={profile.showcase}
        isSelf={header.isSelf}
        isCustom={profile.isShowcaseCustom}
        onEdit={() => {
          showcase.save.reset()
          showcase.reset.reset()
          setIsEditing(true)
        }}
      />
      <MemberTabs
        labels={{ photos: 'Photos', tagged: `Avec ${name}`, emblems: 'Emblèmes' }}
        counts={{ photos: counts.photos, tagged: counts.tagged, emblems: counts.emblemsEarned }}
        selected={tab}
        onSelect={onTabChange}
      >
        {tab === 'photos' ? (
          <MemberCardGrid
            leagueId={leagueId}
            scope={{ authorId: header.userId, taggedUserId: null, revealOwn: header.isSelf }}
            emptyLabel={
              header.isSelf ? "Tu n'as encore publié aucune photo." : 'Aucune photo publiée.'
            }
            footer={photosFooter(header.isSelf)}
          />
        ) : tab === 'tagged' ? (
          <>
            <MemberCardGrid
              leagueId={leagueId}
              scope={{ authorId: null, taggedUserId: header.userId, revealOwn: false }}
              emptyLabel={
                header.isSelf
                  ? "Tu n'es identifié(e) sur aucune photo."
                  : `${header.displayUsername} n'est identifié(e) sur aucune photo.`
              }
              footer={taggedFooter}
            />
            {counts.tagged > 0 ? (
              <Link
                to="/l/$leagueId/collection"
                params={{ leagueId }}
                search={{ tagged: header.userId }}
                className={buttonClassName({ variant: 'ghost' })}
              >
                Voir dans la Collection
              </Link>
            ) : null}
          </>
        ) : (
          emblems
        )}
      </MemberTabs>
      {header.isSelf ? (
        <ShowcaseEditorSheet
          open={isEditing}
          leagueId={leagueId}
          initialIds={savedIds}
          isSaving={showcase.save.isPending || showcase.reset.isPending}
          hasError={showcase.save.isError || showcase.reset.isError}
          onSave={(cardIds) =>
            showcase.save.mutate(cardIds, { onSuccess: () => setIsEditing(false) })
          }
          onReset={() => showcase.reset.mutate(undefined, { onSuccess: () => setIsEditing(false) })}
          onClose={() => setIsEditing(false)}
        />
      ) : null}
    </>
  )
}
