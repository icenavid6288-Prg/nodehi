import { describe, expect, it } from 'vitest'
import { formatAuditMetadata, parseAuditMetadata } from './audit'

/**
 * گزارش فعالیت باید خوانا باشد. باگ واقعی: مقدار تودرتو (`changed: { percent }`)
 * مستقیم در متن رندر می‌شد و کاربر `[object Object]` می‌دید.
 */
describe('parseAuditMetadata', () => {
  it('مقدار خالی یا نامعتبر را null می‌کند', () => {
    expect(parseAuditMetadata(null)).toBeNull()
    expect(parseAuditMetadata('')).toBeNull()
    expect(parseAuditMetadata('{ not json')).toBeNull()
    expect(parseAuditMetadata('[1,2]')).toBeNull()
  })

  it('شیء معتبر را برمی‌گرداند', () => {
    expect(parseAuditMetadata('{"a":1}')).toEqual({ a: 1 })
  })
})

describe('formatAuditMetadata', () => {
  it('مقدارهای ساده را همان‌طور نشان می‌دهد', () => {
    const result = formatAuditMetadata('{"orderNumber":"ND-1","total":45869000}')
    expect(result).toEqual([
      { key: 'orderNumber', value: 'ND-1' },
      { key: 'total', value: '45869000' },
    ])
  })

  it('شیء تودرتو را یک سطح باز می‌کند تا [object Object] دیده نشود', () => {
    const result = formatAuditMetadata('{"code":"NOWRUZ20","changed":{"percent":25}}')
    expect(result).toContainEqual({ key: 'changed.percent', value: '25' })
    expect(result.some((item) => item.value.includes('object'))).toBe(false)
  })

  it('شیء تودرتوی خالی را با خط تیره نشان می‌دهد', () => {
    expect(formatAuditMetadata('{"changed":{}}')).toEqual([{ key: 'changed', value: '—' }])
  })

  it('null و undefined را با خط تیره نشان می‌دهد', () => {
    expect(formatAuditMetadata('{"from":null}')).toEqual([{ key: 'from', value: '—' }])
  })

  it('آرایه را با جداکننده فارسی به متن تبدیل می‌کند', () => {
    expect(formatAuditMetadata('{"items":["a","b"]}')).toEqual([{ key: 'items', value: 'a، b' }])
    expect(formatAuditMetadata('{"items":[]}')).toEqual([{ key: 'items', value: '—' }])
  })

  it('مقدار منطقی را به متن تبدیل می‌کند', () => {
    expect(formatAuditMetadata('{"isActive":false}')).toEqual([{ key: 'isActive', value: 'false' }])
  })

  it('متادیتای نامعتبر، فهرست خالی می‌دهد', () => {
    expect(formatAuditMetadata(null)).toEqual([])
    expect(formatAuditMetadata('broken')).toEqual([])
  })
})
