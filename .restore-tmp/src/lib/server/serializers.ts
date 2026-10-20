/**
 * نگاشت داده دامنه به شکل سبک و پایدار برای مصرف‌کننده‌های API.
 *
 * چرا جدا از فایل route؟ فایل‌های `route.ts` در Next فقط مجاز به export
 * توابع هندلر و تنظیمات مسیر هستند؛ هر export اضافه، خطای تایپ‌چک build
 * می‌سازد. نگه‌داشتن نگاشت در اینجا هم این محدودیت را رعایت می‌کند و هم
 * اجازه می‌دهد چند مسیر API از یک شکل پاسخ مشترک استفاده کنند.
 */

import { brand } from '@/config/brand'
import { discountPercent } from '@/lib/utils/format'
import type { Product } from '@/types'

export interface ProductApiItem {
  id: string
  slug: string
  name: string
  url: string
  category: string
  brand: string
  brandName: string
  price: number
  compareAtPrice: number | null
  discountPercent: number | null
  stock: number
  inStock: boolean
  rating: number
  reviewCount: number
  shortDescription: string
  image: string | null
  readyToShip: boolean
  installmentAvailable: boolean
  energyRating: string | null
  color: string
  capacity: string | null
  inverter: boolean
  warrantyMonths: number
  publishedAt: string
}

/**
 * تبدیل محصول دامنه به شکل قابل انتشار در API.
 *
 * `brandNames` نگاشت نامک برند به نام فارسی است و از لایهٔ کاتالوگ می‌آید؛
 * ماژول‌های دیتابیس را نمی‌شود از اینجا صدا زد چون همگام‌سازی نگاشت یک بار در
 * هر درخواست کافی است و این تابع را در چند مسیر مشترک استفاده می‌کنیم.
 */
export function serializeProduct(product: Product, brandNames: Record<string, string> = {}): ProductApiItem {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    url: `${brand.url}/product/${product.slug}`,
    category: product.category,
    brand: product.attributes.brand,
    brandName: brandNames[product.attributes.brand] ?? product.attributes.brand,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    discountPercent: discountPercent(product.price, product.compareAtPrice),
    stock: product.stock,
    inStock: product.stock > 0,
    rating: product.rating,
    reviewCount: product.reviewCount,
    shortDescription: product.shortDescription,
    image: product.images[0] ?? null,
    readyToShip: product.attributes.readyToShip,
    installmentAvailable: product.attributes.installmentAvailable,
    energyRating: product.attributes.energyRating,
    color: product.attributes.color,
    capacity:
      product.attributes.capacity && product.attributes.capacityUnit
        ? `${product.attributes.capacity} ${product.attributes.capacityUnit}`
        : null,
    inverter: product.attributes.inverter,
    warrantyMonths: product.attributes.warrantyMonths,
    publishedAt: product.publishedAt,
  }
}
