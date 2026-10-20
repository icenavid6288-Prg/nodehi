import { describe, expect, it } from 'vitest'
import { signPayload, verifySignature } from './webhook'

const SECRET = 'super-secret-key'
const BODY = JSON.stringify({ orderId: 'ND-123456', status: 'paid' })

describe('signPayload', () => {
  it('امضای قطعی و تکرارپذیر می‌سازد', () => {
    expect(signPayload(BODY, SECRET)).toBe(signPayload(BODY, SECRET))
  })

  it('با تغییر بدنه، امضا تغییر می‌کند', () => {
    expect(signPayload(BODY, SECRET)).not.toBe(signPayload(`${BODY} `, SECRET))
  })

  it('با تغییر کلید، امضا تغییر می‌کند', () => {
    expect(signPayload(BODY, SECRET)).not.toBe(signPayload(BODY, 'other-key'))
  })

  it('امضای hex با طول ۶۴ نویسه می‌سازد', () => {
    expect(signPayload(BODY, SECRET)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('verifySignature', () => {
  it('امضای درست را می‌پذیرد', () => {
    expect(verifySignature(BODY, signPayload(BODY, SECRET), SECRET)).toBe(true)
  })

  it('امضای نادرست را رد می‌کند', () => {
    expect(verifySignature(BODY, 'deadbeef', SECRET)).toBe(false)
  })

  it('امضای غایب را رد می‌کند', () => {
    expect(verifySignature(BODY, null, SECRET)).toBe(false)
    expect(verifySignature(BODY, '', SECRET)).toBe(false)
  })

  it('بدنه دست‌کاری‌شده را رد می‌کند', () => {
    const signature = signPayload(BODY, SECRET)
    expect(verifySignature(`${BODY}tampered`, signature, SECRET)).toBe(false)
  })

  it('کلید نادرست را رد می‌کند', () => {
    expect(verifySignature(BODY, signPayload(BODY, 'wrong'), SECRET)).toBe(false)
  })

  it('امضای با طول نامساوی را بدون خطا رد می‌کند', () => {
    expect(verifySignature(BODY, 'abc', SECRET)).toBe(false)
  })
})
