import { describe, expect, it } from 'vitest'
import {
  countActiveFilters,
  parseShopSearchParams,
  toSearchParams,
  toggleListValue,
} from '@/lib/filters'

describe('خواندن پارامترهای فیلتر از URL', () => {
  it('مقادیر پیش‌فرض را در نبود پارامتر برمی‌گرداند', () => {
    const state = parseShopSearchParams({})
    expect(state.filters.sort).toBe('relevance')
    expect(state.filters.categories).toEqual([])
    expect(state.page).toBe(1)
  })

  it('فهرست‌های چندگانه جداشده با کاما را تفکیک می‌کند', () => {
    const state = parseShopSearchParams({ brand: 'samsung,lg,bosch' })
    expect(state.filters.brands).toEqual(['samsung', 'lg', 'bosch'])
  })

  it('آرایه پارامتر تکراری را نیز پشتیبانی می‌کند', () => {
    const state = parseShopSearchParams({ category: ['tv', 'washer'] })
    expect(state.filters.categories).toEqual(['tv', 'washer'])
  })

  it('قیمت با ارقام فارسی و جداکننده را به عدد تبدیل می‌کند', () => {
    const state = parseShopSearchParams({ minPrice: '۱۰,۰۰۰,۰۰۰' })
    expect(state.filters.minPrice).toBe(10000000)
  })

  it('پرچم‌های بولی را از مقدار 1 تشخیص می‌دهد', () => {
    const state = parseShopSearchParams({ inverter: '1', ready: '1' })
    expect(state.filters.inverterOnly).toBe(true)
    expect(state.filters.readyToShipOnly).toBe(true)
    expect(state.filters.installmentOnly).toBe(false)
  })

  it('ترتیب نامعتبر را به مقدار پیش‌فرض برمی‌گرداند', () => {
    const state = parseShopSearchParams({ sort: 'hack-attempt' })
    expect(state.filters.sort).toBe('relevance')
    expect(state.page).toBe(1)
  })

  it('شماره صفحه منفی یا صفر را به یک اصلاح می‌کند', () => {
    expect(parseShopSearchParams({ page: '-5' }).page).toBe(1)
    expect(parseShopSearchParams({ page: '0' }).page).toBe(1)
  })

  it('طول عبارت جستجو را محدود می‌کند', () => {
    const state = parseShopSearchParams({ q: 'ا'.repeat(500) })
    expect(state.filters.q.length).toBeLessThanOrEqual(100)
  })
})

describe('تبدیل وضعیت فیلتر به query string', () => {
  it('رفت و برگشت تبدیل، وضعیت را حفظ می‌کند', () => {
    const original = parseShopSearchParams({
      q: 'یخچال',
      category: 'refrigerator',
      brand: 'samsung,lg',
      minPrice: '10000000',
      energy: 'A++',
      inverter: '1',
      sort: 'price-asc',
      page: '2',
    })

    const roundTripped = parseShopSearchParams(
      Object.fromEntries(toSearchParams(original).entries()),
    )

    expect(roundTripped.filters).toEqual(original.filters)
    expect(roundTripped.page).toBe(2)
  })

  it('مقادیر پیش‌فرض را در URL نمی‌نویسد تا لینک تمیز بماند', () => {
    const params = toSearchParams(parseShopSearchParams({}))
    expect(params.toString()).toBe('')
  })

  it('صفحه یک را در URL درج نمی‌کند', () => {
    const params = toSearchParams(parseShopSearchParams({ page: '1', brand: 'lg' }))
    expect(params.has('page')).toBe(false)
    expect(params.get('brand')).toBe('lg')
  })
})

describe('کمکی‌های فیلتر', () => {
  it('مقدار را از فهرست اضافه یا حذف می‌کند', () => {
    expect(toggleListValue(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleListValue(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('تعداد فیلترهای فعال را می‌شمارد', () => {
    const state = parseShopSearchParams({
      category: 'tv',
      brand: 'lg,samsung',
      inverter: '1',
      discounted: '1',
      minPrice: '5000000',
    })
    expect(countActiveFilters(state.filters, state.discountedOnly)).toBe(6)
  })

  it('در نبود فیلتر، شمارش صفر است', () => {
    const state = parseShopSearchParams({})
    expect(countActiveFilters(state.filters, state.discountedOnly)).toBe(0)
  })
})
