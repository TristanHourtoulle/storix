import { useQuery } from '@tanstack/react-query'
import type { GoalType } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { meQueryOptions } from '@/features/auth/session.queries'
import { StyledName } from '@/features/cosmetics/components/styled-name'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { goalAmount } from '../goal-copy'
import { goalContributorsQueryOptions } from '../league-goal.queries'

interface GoalHelpersSheetProps {
  leagueId: string
  type: GoalType
  isOpen: boolean
  onClose: () => void
}

/** "Qui a aidé" sheet: every member who contributed this week, by name, never ranked. */
export function GoalHelpersSheet({ leagueId, type, isOpen, onClose }: GoalHelpersSheetProps) {
  const { data, isError } = useQuery({ ...goalContributorsQueryOptions(leagueId), enabled: isOpen })
  const contributors = data?.contributors ?? []
  const meId = useQuery(meQueryOptions).data?.user.id
  const ownNameStyle = useEquippedStyle().nameStyle

  return (
    <BottomSheet open={isOpen} title="Qui a aidé" onClose={onClose}>
      <p className="msheet-sub">Merci à chacun pour l'objectif de la semaine.</p>
      {isError ? (
        <p className="goal-helpers-empty">Impossible de charger la liste.</p>
      ) : data && contributors.length === 0 ? (
        <p className="goal-helpers-empty">Personne n'a encore contribué cette semaine.</p>
      ) : (
        <ul className="goal-helpers">
          {contributors.map((contributor) => (
            <li key={contributor.userId} className="goal-helper">
              <Avatar
                label={contributor.displayUsername}
                portrait={contributor.avatar}
                frame={contributor.avatarFrame}
                size="compact"
                isTinted
              />
              <StyledName
                styleId={contributor.userId === meId ? ownNameStyle : contributor.nameStyle}
                className="goal-helper-name"
              >
                {contributor.displayUsername}
              </StyledName>
              <em>{goalAmount(type, contributor.count)}</em>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
