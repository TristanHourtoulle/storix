import {
  leagueParamsSchema,
  leagueSettingsViewSchema,
  rarityPreviewBodySchema,
  rarityPreviewSchema,
  updateLeagueSettingsBodySchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { rateLimits } from '../../http/rate-limit'
import type { LeagueSettingsService } from './league-settings.service'

const PATH = '/leagues/:leagueId/settings'

/** Registers the admin league settings routes. */
export function leagueSettingsRoutes(service: LeagueSettingsService): FastifyPluginAsyncZod {
  return async (app) => {
    const adminOnly = { preHandler: [authenticate, requireLeagueRole('admin')] }
    const mutation = { ...adminOnly, config: { rateLimit: rateLimits.adminAction } }

    app.get(
      PATH,
      {
        ...adminOnly,
        schema: { params: leagueParamsSchema, response: { 200: leagueSettingsViewSchema } },
      },
      (request) => service.getSettings(request.membership),
    )
    app.put(
      PATH,
      {
        ...mutation,
        schema: {
          params: leagueParamsSchema,
          body: updateLeagueSettingsBodySchema,
          response: { 200: leagueSettingsViewSchema },
        },
      },
      (request) => service.updateSettings(request.membership, request.body),
    )
    app.post(
      `${PATH}/rarity-preview`,
      {
        ...mutation,
        schema: {
          params: leagueParamsSchema,
          body: rarityPreviewBodySchema,
          response: { 200: rarityPreviewSchema },
        },
      },
      (request) => service.previewRarity(request.membership, request.body.rarityWeights),
    )
  }
}
