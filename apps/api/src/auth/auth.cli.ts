import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createDb } from '@storix/db'
import { loadEnv } from '../config/env'
import { createAuth } from './auth'

const rootEnv = resolve(import.meta.dirname, '../../../../.env')
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const env = loadEnv(process.env)

export const auth = createAuth({ db: createDb(env.DATABASE_URL).db, env })
