/** انواع پاسخ‌های API مدیریت. */

export type AdminProduct = {
  slug: string
  name: string
  category: string
  brand: string
  price: number
  compareAtPrice: number | null
  discountPercent: number
  stock: number
  rating: number
  reviewCount: number
  shortDescription: string
  description: string | null
  highlights: string[]
  specs: { label: string; value: string; group?: string }[]
  attributes: Record<string, unknown>
  images: string[]
  tags: string[]
  relatedSlugs: string[]
  videoUrl: string | null
  isActive: boolean
  publishedAt: string | null
  updatedAt: string | null
}

export type AdminProductList = {
  items: AdminProduct[]
  total: number
  page: number
  perPage: number
  pageCount: number
}

export type AdminOrderSummary = {
  orderNumber: string
  status: string
  paymentMethod: string
  customerName: string
  customerPhone: string
  total: number
  itemCount: number
  trackingCode: string | null
  createdAt: string
}

export type AdminOrderDetail = {
  id: number
  orderNumber: string
  status: string
  paymentMethod: string
  shippingMethod: string
  subtotal: number
  discount: number
  shipping: number
  total: number
  couponCode: string | null
  trackingCode: string | null
  note: string | null
  customer: { firstName: string; lastName: string; phone: string; email: string | null }
  address: { province: string; city: string; line: string; postalCode: string | null }
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  items: { slug: string; name: string; unitPrice: number; quantity: number; lineTotal: number }[]
}

export type AdminOrderList = {
  items: AdminOrderSummary[]
  total: number
  page: number
  pageCount: number
  perPage: number
}

export type AdminReview = {
  id: number
  productSlug: string
  productName: string
  author: string
  rating: number
  title: string
  body: string
  status: string
  createdAt: string
}

export type AdminReviewList = {
  items: AdminReview[]
  total: number
  page: number
  pageCount: number
  perPage: number
}

export type AuditEntry = {
  id: number
  action: string
  entity: string
  entityId: string | null
  actor: { name: string; phone: string } | null
  metadata: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

export type AuditList = {
  items: AuditEntry[]
  total: number
  page: number
  pageCount: number
  perPage: number
}

export type AdminStats = {
  products: { total: number; active: number; outOfStock: number }
  orders: { total: number; byStatus: Record<string, number>; revenue: number }
  customers: number
  reviews: { pending: number; approved: number }
  recentOrders: {
    orderNumber: string
    customerName: string
    status: string
    total: number
    createdAt: string
  }[]
  lowStock: { slug: string; name: string; stock: number }[]
  recentAudit: { id: number; action: string; entity: string; actor: string; createdAt: string }[]
}
