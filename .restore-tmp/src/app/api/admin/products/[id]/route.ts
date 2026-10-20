import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import {
  parseProductInput,
  productAuditAction,
  toProductUpdateData,
} from '@/lib/server/admin-products'
import { toProductSnapshot } from '@/lib/server/catalog'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ویرایش کالا.
 * PATCH /api/admin/products/:id
 *   { "isActive": false }                    ← حذف نرم (خروج از فروشگاه)
 *   { "price": 92000000, "stock": 4 }        ← ویرایش سریع قیمت و موجودی
 *   { "attributes": { "readyToShip": true } } ← تغییر ویژگی‌های فیلترپذیر
 *
 * فقط فیلدهای ارسالی بررسی و نوشته می‌شوند؛ فیلدی که در بدنه نباشد
 * دست‌نخورده می‌ماند. سازگاری با کاتالوگ قبلی: کالا هرگز با تغییر قیمت،
 * مشخصات یا تصاویرش را از دست نمی‌دهد چون فرم فقط تفاوت‌ها را می‌فرستد.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'نقش شما اجازهٔ تغییر کاتالوگ را ندارد.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  const existing = await prisma.product.findUnique({ where: { id: params.id } })
  if (!existing) {
    return jsonError(404, { code: 'not_found', message: 'کالا یافت نشد.' })
  }

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.brand.findMany({ select: { slug: true } }),
  ])

  const { fields, values, changed, changedKeys } = parseProductInput(body, {
    mode: 'update',
    existing: toProductSnapshot(existing),
    categorySlugs: categories.map((row) => row.slug),
    brandSlugs: brands.map((row) => row.slug),
  })

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات ارسالی معتبر نیست.', fields)
  }
  if (changedKeys.length === 0) {
    return badRequest('هیچ تغییری برای ثبت وجود ندارد.')
  }

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: toProductUpdateData(values, changedKeys),
    select: { id: true, slug: true, name: true, price: true, stock: true, isActive: true },
  })

  await writeAuditLog({
    actorId: staff.id,
    action: productAuditAction(changed),
    entity: 'Product',
    entityId: existing.id,
    metadata: { slug: existing.slug, changed },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  revalidateCatalog()

  return jsonOk({ product: updated, changed })
}

/**
 * حذف کالا.
 * DELETE /api/admin/products/:id
 *
 * دو حالت، عمداً متفاوت:
 *  • کالایی که در هیچ سفارشی ثبت نشده → رکورد کاملاً حذف می‌شود (اشتباه در
 *    ورود کالا باید قابل جبران باشد).
 *  • کالایی که سابقهٔ سفارش دارد → حذف قطعی ممنوع (۴۰۹)؛ مدیر باید «غیرفعال»
 *    کند. چرا؟ حذف رکورد، گزارش‌های فروش و بازگشت به عقب را بی‌معنا می‌کند و
 *    ممکن است کاربری در حال خرید همان کالا باشد. غیرفعال‌سازی کالا را از
 *    فروشگاه بیرون می‌برد ولی سابقه را سالم نگه می‌دارد.
 *
 * نظرهای تأییدشده و هشدارهای موجودی وابسته به نامک کالا هستند؛ هنگام حذف
 * قطعی همراه آن پاک می‌شوند تا داده یتیم نماند.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'نقش شما اجازهٔ حذف کالا را ندارد.',
    })
  }

  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) {
    return jsonError(404, { code: 'not_found', message: 'کالا یافت نشد.' })
  }

  const orderCount = await prisma.orderItem.count({ where: { productSlug: product.slug } })
  if (orderCount > 0) {
    return jsonError(409, {
      code: 'product_in_use',
      message: `این کالا در ${orderCount} سفارش ثبت شده و حذف قطعی‌اش سابقهٔ فروش را خراب می‌کند. آن را «غیرفعال» کنید تا از فروشگاه برود ولی سابقه بماند.`,
    })
  }

  await prisma.$transaction([
    prisma.stockAlert.deleteMany({ where: { productSlug: product.slug } }),
    prisma.review.deleteMany({ where: { productSlug: product.slug } }),
    prisma.product.delete({ where: { id: product.id } }),
  ])

  await writeAuditLog({
    actorId: staff.id,
    action: 'product.deleted',
    entity: 'Product',
    entityId: product.id,
    metadata: { slug: product.slug, name: product.name },
    ip: clientIp(request),
    userAgent: request.headers.get('user-agent'),
  })

  revalidateCatalog()

  return jsonOk({ deleted: { id: product.id, slug: product.slug, name: product.name } })
}

/** تازه‌سازی کش فروشگاه پس از تغییر کاتالوگ */
function revalidateCatalog() {
  revalidatePath('/', 'layout')
  revalidatePath('/admin/products')
}
