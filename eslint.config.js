import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const banned = (name, message) => ({ name, message })

export default tseslint.config(
  { ignores: ['**/dist', '**/drizzle', '**/node_modules', '**/routeTree.gen.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['apps/web/src/lib/logger.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            banned('@storix/db', 'Layer rule: shared must not depend on the db package.'),
            banned('fastify', 'Layer rule: shared must not depend on the HTTP framework.'),
            banned('react', 'Layer rule: shared must not depend on React.'),
          ],
          patterns: [
            {
              group: ['drizzle-orm*', 'better-auth*'],
              message: 'Layer rule: shared must not depend on the ORM or auth libraries.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/shared/src/domain/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\./)',
              message: 'Layer rule: domain is pure and may only import from ./*.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/storage/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            banned('@storix/db', 'Layer rule: storage must not depend on the db package.'),
            banned('fastify', 'Layer rule: storage must not depend on the HTTP framework.'),
            banned('react', 'Layer rule: storage must not depend on React.'),
          ],
          patterns: [
            {
              group: ['drizzle-orm*', 'better-auth*'],
              message: 'Layer rule: storage must not depend on the ORM or auth libraries.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/{api,worker}/src/**/*.routes.ts', 'apps/api/src/http/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            banned('pg', 'Layer rule: routes are HTTP only and must not touch the database.'),
            banned(
              '@storix/db',
              'Layer rule: routes are HTTP only and must not touch the database.',
            ),
          ],
          patterns: [
            {
              group: ['drizzle-orm*', '**/*.repository*', 'better-auth*'],
              message:
                'Layer rule: routes are HTTP only; go through services (auth.routes.ts may use better-auth/node).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/auth/auth.routes.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            banned('pg', 'Layer rule: routes are HTTP only and must not touch the database.'),
            banned(
              '@storix/db',
              'Layer rule: routes are HTTP only and must not touch the database.',
            ),
          ],
          patterns: [
            {
              group: ['drizzle-orm*', '**/*.repository*'],
              message: 'Layer rule: routes are HTTP only; go through services.',
            },
            {
              regex: '^better-auth(?!/node$)',
              message: 'Layer rule: auth.routes.ts may only import better-auth/node.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/{api,worker}/src/**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            banned('fastify', 'Layer rule: services are use cases and must not use HTTP objects.'),
            {
              name: '@storix/db',
              allowTypeImports: true,
              message: 'Layer rule: services must not touch the database; use repositories.',
            },
          ],
          patterns: [
            {
              group: [
                'drizzle-orm*',
                'better-auth*',
                '**/*.routes*',
                '@aws-sdk/*',
                'sharp',
                'pg-boss',
                'web-push',
              ],
              message:
                'Layer rule: services have no SQL, no auth library, no S3 SDK, no image or queue library and no dependency on routes.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/{api,worker}/src/**/*.repository.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [banned('fastify', 'Layer rule: repositories are Drizzle only, no HTTP.')],
          patterns: [
            {
              group: ['better-auth*', '**/*.service*', '**/*.routes*'],
              message:
                'Layer rule: repositories hold no rules and depend on neither services nor routes.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/worker/src/**/*.job.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            banned('@storix/db', 'Layer rule: jobs parse a payload and call one service.'),
            banned('sharp', 'Layer rule: jobs parse a payload and call one service.'),
            banned('web-push', 'Layer rule: jobs parse a payload and call one service.'),
          ],
          patterns: [
            {
              group: ['drizzle-orm*', '**/*.repository*', '@aws-sdk/*'],
              message: 'Layer rule: jobs parse a payload and call one service.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/components/**/*.{ts,tsx}', 'apps/web/src/routes/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*.api', '**/lib/http', '**/lib/auth-client'],
              message: 'Layer rule: components are presentational; fetch data in hooks.',
            },
          ],
        },
      ],
    },
  },
)
