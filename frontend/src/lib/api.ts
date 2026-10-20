/**
 * کلاینت API لاراول.
 *
 * آدرس پیش‌فرض `/api` است و Vite آن را به `http://127.0.0.1:8000` پروکسی
 * می‌کند؛ در تولید با `VITE_API_URL` می‌توان آدرس مطلق داد.
 */
const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function token(): string | null {
  return localStorage.getItem('nodehi.token')
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')

  const auth = token()
  if (auth) headers.set('Authorization', `Bearer ${auth}`)

  const response = await fetch(`${BASE}${path}`, { ...init, headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      (data?.errors ? Object.values(data.errors).flat().join(' ') : null) ||
      'خطایی رخ داد؛ دوباره تلاش کنید.'
    throw new ApiError(String(message), response.status)
  }

  return data as T
}

export const get = <T>(path: string) => api<T>(path)
export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })

export type ProductSummary = {
  id: string
  slug: string
  name: string
  category: string
  brand: string
  price: number
  compareAtPrice: number | null
  discountPercent: number
  stock: number
  inStock: boolean
  rating: number
  reviewCount: number
  shortDescription: string
  highlights: string[]
  images: string[]
  tags: string[]
  relatedSlugs: string[]
  readyToShip: boolean
  publishedAt: string | null
}

export type ProductDetail = ProductSummary & {
  description: string
  specs: { label: string; value: string; group?: string }[]
  attributes: Record<string, unknown>
  videoUrl: string | null
}

export type Category = {
  slug: string
  name: string
  nameEn: string
  description: string
  seoIntro: string
  icon: string
  featured: boolean
  count: number
}

export type Brand = {
  slug: string
  name: string
  nameEn: string
  origin: string
  description: string
  featured: boolean
}

export type AuthUser = {
  id: number
  phone: string
  firstName: string | null
  lastName: string | null
  fullName: string
  role: string
  loyaltyPoints: number
  loyaltyTier: string
}

export type ArticleSummary = {
  slug: string
  title: string
  excerpt: string
  category: string
  categoryLabel: string
  author: string
  publishedAt: string
  updatedAt: string
  readingMinutes: number
  keywords: string[]
}

export type ArticleDetail = ArticleSummary & { body: string[] }

export type ArticleListResponse = {
  total: number
  category: string
  categories: { slug: string; label: string; count: number }[]
  items: ArticleSummary[]
}

export type ArticleResponse = {
  article: ArticleDetail
  related: ArticleSummary[]
}

export type FaqResponse = {
  total: number
  categories: { slug: string; label: string; count: number }[]
  items: { id: number; category: string; question: string; answer: string }[]
}

export type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets: string[]
}

export type LegalPageResponse = {
  page: {
    slug: string
    title: string
    intro: string
    updatedAt: string
    sections: LegalSection[]
  }
}

export type LoyaltyResponse = {
  tiers: { name: string; requirement: string; discount: string; points: string; perks: string[] }[]
  installments: { months: number; label: string; interest: string; note: string; featured: boolean }[]
  steps: { step: number; title: string; description: string }[]
}

export type OrderResponse = {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  subtotal: number
  discount: number
  shipping: number
  total: number
  couponCode: string | null
  customerName: string
  createdAt: string
  items: { slug: string; name: string; unitPrice: number; quantity: number; lineTotal: number }[]
}
