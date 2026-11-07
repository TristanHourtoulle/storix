import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    migrate: 'src/cli/migrate.ts',
    bootstrap: 'src/cli/bootstrap.ts',
  },
  format: 'esm',
  platform: 'node',
  fixedExtension: false,
  clean: true,
  deps: { alwaysBundle: [/^@storix\//] },
})
