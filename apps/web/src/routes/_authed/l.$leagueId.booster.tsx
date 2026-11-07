import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/_authed/l/$leagueId/booster')({
  validateSearch: z.object({ request: z.uuid() }),
  component: () => null,
})
