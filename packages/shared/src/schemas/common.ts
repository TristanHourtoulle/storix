import { z } from 'zod'
import { LEAGUE_ROLES } from '../domain'

export const idSchema = z.string().min(1)
export const isoDateSchema = z.iso.datetime()
export const leagueRoleSchema = z.enum(LEAGUE_ROLES)
