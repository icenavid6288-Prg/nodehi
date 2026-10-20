import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimit, resetRateLimits } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-27T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRateLimits()
  })

  it('تا سقف تعیین‌شده اجازه می‌دهد', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit('k', { limit: 3, windowMs: 1000 }).ok).toBe(true)
    }
  })

  it('پس از عبور از سقف، درخواست را رد می‌کند', () => {
    for (let i = 0; i < 3; i += 1) rateLimit('k', { limit: 3, windowMs: 1000 })

    const blocked = rateLimit('k', { limit: 3, windowMs: 1000 })
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('شمارنده باقی‌مانده را درست گزارش می‌کند', () => {
    expect(rateLimit('k', { limit: 5, windowMs: 1000 }).remaining).toBe(4)
    expect(rateLimit('k', { limit: 5, windowMs: 1000 }).remaining).toBe(3)
  })

  it('کلیدهای مختلف سهمیه مستقل دارند', () => {
    for (let i = 0; i < 3; i += 1) rateLimit('a', { limit: 3, windowMs: 1000 })
    expect(rateLimit('a', { limit: 3, windowMs: 1000 }).ok).toBe(false)
    expect(rateLimit('b', { limit: 3, windowMs: 1000 }).ok).toBe(true)
  })

  it('پس از پایان پنجره، سهمیه بازنشانی می‌شود', () => {
    for (let i = 0; i < 3; i += 1) rateLimit('k', { limit: 3, windowMs: 1000 })
    expect(rateLimit('k', { limit: 3, windowMs: 1000 }).ok).toBe(false)

    vi.advanceTimersByTime(1001)
    expect(rateLimit('k', { limit: 3, windowMs: 1000 }).ok).toBe(true)
  })

  it('دقیقاً روی مرز پنجره، سهمیه تازه محسوب می‌شود', () => {
    rateLimit('k', { limit: 1, windowMs: 1000 })
    vi.advanceTimersByTime(1000)
    expect(rateLimit('k', { limit: 1, windowMs: 1000 }).ok).toBe(true)
  })
})
