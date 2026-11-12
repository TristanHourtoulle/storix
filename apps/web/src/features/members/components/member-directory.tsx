import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { StyledName } from '@/features/cosmetics/components/styled-name'
import { useEquippedStyle } from '@/features/cosmetics/style-context'
import { ROLE_LABELS } from '@/features/leagues/role-labels'
import { countOf } from '../member-copy'
import { membersQueryOptions } from '../members.queries'

interface MemberDirectoryProps {
  leagueId: string
}

/** Every current member of the league, each row opening their member page. */
export function MemberDirectory({ leagueId }: MemberDirectoryProps) {
  const members = useQuery(membersQueryOptions(leagueId))
  const ownNameStyle = useEquippedStyle().nameStyle

  if (members.isError && !members.data) {
    return (
      <section role="alert" className="flex flex-col items-center gap-3 text-center">
        <p className="m-0 text-sm text-muted">Impossible de charger les membres.</p>
        <Button variant="ghost" onClick={() => void members.refetch()}>
          Réessayer
        </Button>
      </section>
    )
  }
  if (!members.data) return <p className="m-0 text-sm text-muted">Chargement…</p>

  return (
    <ul className="mdir">
      {members.data.map((member) => (
        <li key={member.userId}>
          <Link
            to="/l/$leagueId/members/$userId"
            params={{ leagueId, userId: member.userId }}
            className="mdir-row"
          >
            <Avatar
              label={member.displayUsername}
              portrait={member.avatar}
              frame={member.avatarFrame}
              size="md"
            />
            <span className="min-w-0 flex-1">
              <b>
                <StyledName styleId={member.isSelf ? ownNameStyle : member.nameStyle}>
                  {member.displayUsername}
                </StyledName>
                {member.isSelf ? <span className="mdir-you"> · toi</span> : null}
              </b>
              <small>
                {ROLE_LABELS[member.role]} · {countOf(member.authoredCardCount, 'photo', 'photos')}
              </small>
            </span>
            <Icon name="chevron-right" className="size-5 flex-none text-faint" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
