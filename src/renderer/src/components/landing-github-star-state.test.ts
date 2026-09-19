// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useLandingOrcaStarState } from './landing-github-star-state'

const forflow = vi.hoisted(() => ({ enabled: true }))
vi.mock('../../../shared/product-branding', () => ({ isForflowBuild: () => forflow.enabled }))
const checkOrcaStarred = vi.fn().mockResolvedValue(null)
const originalApi = Object.getOwnPropertyDescriptor(window, 'api')

beforeEach(() => {
  checkOrcaStarred.mockClear()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { gh: { checkOrcaStarred } }
  })
})
afterEach(() => {
  cleanup()
  if (originalApi) {
    Object.defineProperty(window, 'api', originalApi)
  } else {
    Reflect.deleteProperty(window, 'api')
  }
})

it('keeps private branding hidden without querying the upstream GitHub repository', () => {
  forflow.enabled = true
  const { result } = renderHook(() => useLandingOrcaStarState())
  expect(result.current[0]).toBe('hidden')
  expect(checkOrcaStarred).not.toHaveBeenCalled()
})

it('preserves the upstream fallback for non-Forflow builds', async () => {
  forflow.enabled = false
  const { result } = renderHook(() => useLandingOrcaStarState())
  await waitFor(() => expect(result.current[0]).toBe('web-fallback'))
  expect(checkOrcaStarred).toHaveBeenCalledTimes(1)
})
