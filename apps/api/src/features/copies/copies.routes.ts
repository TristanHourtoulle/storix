import {
  cardParamsSchema,
  convertStackBodySchema,
  dustBalanceSchema,
  promoteBodySchema,
  recycleBodySchema,
  stackActionResultSchema,
} from '@storix/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../../http/authenticate'
import { requireLeagueRole } from '../../http/league-guard'
import { perUserRateLimit, rateLimits } from '../../http/rate-limit'
import type { CopiesService } from './copies.service'
import type { StacksService } from './stacks.service'

/** Registers the recycle, foil upgrade, promote and stack convert routes of a card (crafting is disabled: its route is not registered). */
export function copiesRoutes(copies: CopiesService, stacks: StacksService): FastifyPluginAsyncZod {
  return async (app) => {
    const guard = {
      preHandler: [authenticate, requireLeagueRole('member')],
      config: { rateLimit: rateLimits.cardAction },
    }
    const schema = { params: cardParamsSchema, response: { 200: dustBalanceSchema } }
    app.post(
      '/leagues/:leagueId/cards/:cardId/recycle',
      { ...guard, schema: { ...schema, body: recycleBodySchema } },
      (request) => copies.recycle(request.membership, request.params.cardId, request.body.variant),
    )
    app.post('/leagues/:leagueId/cards/:cardId/foil', { ...guard, schema }, (request) =>
      copies.upgradeToFoil(request.membership, request.params.cardId),
    )

    const stackLimit = perUserRateLimit(app, 'stack-action', rateLimits.stackActionUser)
    const stackGuard = {
      preHandler: [authenticate, requireLeagueRole('member'), stackLimit],
      config: { rateLimit: rateLimits.stackAction },
    }
    const stackSchema = { params: cardParamsSchema, response: { 200: stackActionResultSchema } }
    app.post(
      '/leagues/:leagueId/cards/:cardId/promote',
      { ...stackGuard, schema: { ...stackSchema, body: promoteBodySchema } },
      (request) => stacks.promote(request.membership, request.params.cardId, request.body.from),
    )
    app.post(
      '/leagues/:leagueId/cards/:cardId/stack/convert',
      { ...stackGuard, schema: { ...stackSchema, body: convertStackBodySchema } },
      (request) => stacks.convert(request.membership, request.params.cardId, request.body),
    )
  }
}
