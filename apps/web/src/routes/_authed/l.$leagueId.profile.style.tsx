import { createFileRoute } from '@tanstack/react-router'
import { MyStyle } from '@/features/cosmetics/components/my-style'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/style')({
  component: MyStyleScreen,
})

function MyStyleScreen() {
  const { leagueId } = Route.useParams()
  return <MyStyle leagueId={leagueId} />
}
