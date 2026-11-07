import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/main.ts'],
  format: 'esm',
  platform: 'node',
  fixedExtension: false,
  clean: true,
  deps: { alwaysBundle: [/^@storix\//] },
})
