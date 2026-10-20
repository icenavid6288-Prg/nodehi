/** انواع دامنه فروشگاه نودهی */

export type CategorySlug =
  | 'refrigerator'
  | 'washer'
  | 'dishwasher'
  | 'tv'
  | 'air-conditioner'
  | 'vacuum'
  | 'oven'
  | 'small-appliance'

export interface Category {
  slug: CategorySlug
  name: string
  /** نام در URL — برای سئو، لاتین و خوانا */
  nameEn: string
  description: string
  /** متن سئو برای صفحه دسته‌بندی */
  seoIntro: string
  icon: CategorySlug
  featured: boolean
}

export interface Brand {
  slug: string
  name: string
  nameEn: string
  /** کشور مبدأ برند */
  origin: string
  description: string
  featured: boolean
}

/**
 * فرادادهٔ سبک کاتالوگ برای کامپوننت‌های کلاینتی.
 *
 * هدر، فیلتر فروشگاه و کارت محصول به نام دسته و برند نیاز دارند ولی از سرور
 * نمی‌توانند در مرورگر کوئری بزنند؛ این ساختار یک‌بار در پوسته از دیتابیس
 * خوانده و به مرورگر پاس داده می‌شود.
 */
export interface CatalogMeta {
  categories: Category[]
  brands: Brand[]
  /** تعداد محصول هر دسته */
  counts: Record<CategorySlug, number>
  brandNames: Record<string, string>
  categoryNames: Record<string, string>
  /**
   * نامک پرطرفدارترین کالاهای موجود.
   * فقط نامک می‌فرستیم (نه خود کالا) تا حجم پیلود کوچک بماند؛ صفحه‌هایی مثل
   * «مقایسه» که به پیشنهاد کالا نیاز دارند با همین نامک‌ها از API می‌خوانند.
   */
  popularSlugs: string[]
}

/** یک سطر مشخصات فنی */
export interface SpecItem {
  label: string
  value: string
  /** گروه‌بندی مشخصات در صفحه محصول */
  group: 'general' | 'technical' | 'dimensions' | 'energy'
}

export interface Review {
  id: string
  author: string
  rating: 1 | 2 | 3 | 4 | 5
  date: string
  title: string
  body: string
  verified: boolean
  /** تعداد لایک برای مرتب‌سازی «مفیدترین» */
  helpfulCount: number
}

/** ویژگی‌های قابل فیلتر که در لیست فیلتر پیشرفته نمایش داده می‌شوند */
export interface ProductAttributes {
  brand: string
  /** ظرفیت/سایز به لیتر یا کیلوگرم یا اینچ */
  capacity: number | null
  capacityUnit: 'لیتر' | 'کیلوگرم' | 'اینچ' | null
  energyRating: 'A+++' | 'A++' | 'A+' | 'A' | 'B' | null
  color: string
  widthCm: number | null
  heightCm: number | null
  depthCm: number | null
  inverter: boolean
  warrantyMonths: number
  madeIn: string
  installmentAvailable: boolean
  readyToShip: boolean
}

export interface Product {
  id: string
  slug: string
  name: string
  category: CategorySlug
  brand: string
  /** قیمت به تومان. 0 یعنی «تماس بگیرید» */
  price: number
  /** قیمت پیش از تخفیف؛ اگر بزرگ‌تر از price باشد، درصد تخفیف محاسبه می‌شود */
  compareAtPrice: number | null
  stock: number
  rating: number
  reviewCount: number
  shortDescription: string
  description: string
  highlights: string[]
  specs: SpecItem[]
  attributes: ProductAttributes
  images: string[]
  videoUrl: string | null
  tags: string[]
  reviews: Review[]
  relatedSlugs: string[]
  publishedAt: string
}

export interface Article {
  slug: string
  title: string
  excerpt: string
  body: string[]
  category: 'buying-guide' | 'tutorial' | 'comparison' | 'maintenance'
  author: string
  publishedAt: string
  updatedAt: string
  readingMinutes: number
  keywords: string[]
}

export interface Testimonial {
  id: string
  name: string
  city: string
  rating: 1 | 2 | 3 | 4 | 5
  body: string
  productName: string
}

export interface FaqItem {
  question: string
  answer: string
  category: 'shipping' | 'payment' | 'warranty' | 'product'
}

export interface CartLine {
  productId: string
  slug: string
  name: string
  price: number
  quantity: number
  maxStock: number
  readyToShip: boolean
}

/** فیلترهای قابل اعمال در صفحه فروشگاه */
export interface ProductFilters {
  q: string
  categories: CategorySlug[]
  brands: string[]
  minPrice: number | null
  maxPrice: number | null
  energyRatings: string[]
  colors: string[]
  inverterOnly: boolean
  installmentOnly: boolean
  readyToShipOnly: boolean
  inStockOnly: boolean
  sort: SortKey
}

export type SortKey = 'relevance' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular'

/**
 * کاربر احراز هویت‌شده به شکلی که به مرورگر فرستاده می‌شود.
 * رکورد کامل دیتابیس هرگز به کلاینت نمی‌رود؛ این شکل فقط فیلدهای ایمن دارد.
 */
export interface AuthUser {
  id: string
  phone: string
  firstName: string | null
  lastName: string | null
  email: string | null
  role: string
  /** دسترسی به پنل مدیریت */
  isAdmin: boolean
  loyaltyPoints: number
  loyaltyTier: string
  /** نام نمایشی — اگر نامی ثبت نشده باشد، شماره تلفن */
  displayName: string
  /** حرف اول نام برای آواتار؛ اگر نامی نباشد رشته خالی */
  initial: string
  createdAt: string
}
