import { leagueParamsSchema, walletStateSchema } from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import type { WalletsService } from './wallets.service'

/** Registers the member wallet route. */
export function walletsRoutes(service: WalletsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/leagues/:leagueId/wallet',
      {
        preHandler: [authenticate, requireLeagueRole('member')],
        schema: { params: leagueParamsSchema, response: { 200: walletStateSchema } },
      },
      (request) => service.getWallet(request.membership),
    )
  }
}
