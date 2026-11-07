import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  platform: 'node',
  fixedExtension: false,
  clean: true,
  deps: { alwaysBundle: [/^@storix\//] },
})
