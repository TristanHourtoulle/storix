import { parseArgs } from 'node:util'
import { pino } from 'pino'
import { storageEnvSchema } from '../config'
import { createObjectStorage } from '../object-storage'

const logger = pino({ level: 'info' })

const { values } = parseArgs({ options: { origins: { type: 'string' } } })
const origins = (values.origins ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0)

if (origins.length === 0) {
  logger.error('Usage: set-cors --origins https://a.example,https://b.example')
  process.exit(1)
}

const env = storageEnvSchema.parse(process.env)
await createObjectStorage(env).setCors(origins)
logger.info(
  {
    bucket: env.S3_BUCKET,
    origins,
    methods: ['GET', 'POST', 'HEAD'],
    allowedHeaders: ['*'],
    exposeHeaders: ['ETag'],
    maxAgeSeconds: 3600,
  },
  'Bucket CORS rules applied',
)
