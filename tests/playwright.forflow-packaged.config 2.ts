import { defineConfig } from '@stablyai/playwright-test'

export default defineConfig({
  testDir: './forflow-packaged',
  timeout: 150_000,
  expect: { timeout: 20_000 },
  workers: 1,
  retries: 0,
  use: { actionTimeout: 20_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: `${process.env.FORFLOW_QA_OUTPUT}/packaged-tests.json` }]
  ],
  outputDir: `${process.env.FORFLOW_QA_OUTPUT}/test-results`
})
