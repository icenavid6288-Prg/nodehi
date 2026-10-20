import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { canMutate, getStaffUser } from '@/lib/server/admin'
import { parseProductInput, toProductCreateData } from '@/lib/server/admin-products'
import { badRequest, clientIp, jsonError, jsonOk } from '@/lib/server/http'
import { writeAuditLog } from '@/lib/server/orders'
import { readJson } from '@/lib/server/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ساخت کالای تازه.
 * POST /api/admin/products
 *
 * تا پیش از این، کاتالوگ یک آرایهٔ ثابت در کد بود و افزودن کالا یعنی ویرایش
 * فایل و انتشار دوباره. حالا کالا از پنل ساخته می‌شود و در جدول `Product`
 * می‌نشیند.
 *
 * تفاوت دسترسی با کد تخفیف: تعریف کمپین اثر مالی مستقیم دارد و تنها مدیر کل
 * می‌تواند؛ کالا اما کار روزمرهٔ فروشگاه است، پس مدیر و اپراتور هر دو مجازند
 * (حسابدار فقط می‌خواند).
 */
export async function POST(request: Request) {
  const staff = await getStaffUser()
  if (!staff) {
    return jsonError(403, { code: 'forbidden', message: 'دسترسی به این عملیات مجاز نیست.' })
  }
  if (!canMutate(staff.role)) {
    return jsonError(403, {
      code: 'insufficient_role',
      message: 'نقش شما اجازهٔ افزودن کالا را ندارد.',
    })
  }

  const body = await readJson(request)
  if (!body) return badRequest('بدنه درخواست نامعتبر است.')

  // دسته و برند باید از میان ردیف‌های موجود انتخاب شوند؛ ارجاع به نامکِ
  // ناموجود یعنی کالایی که در هیچ صفحهٔ دسته/برندی دیده نمی‌شود.
  const [categories, brands, existingSlugs] = await Promise.all([
    prisma.category.findMany({ select: { slug: true } }),
    prisma.brand.findMany({ select: { slug: true } }),
    prisma.product.findMany({ select: { slug: true } }),
  ])

  const { fields, values } = parseProductInput(body, {
    mode: 'create',
    categorySlugs: categories.map((row) => row.slug),
    brandSlugs: brands.map((row) => row.slug),
    takenSlugs: new Set(existingSlugs.map((row) => row.slug)),
  })

  if (Object.keys(fields).length > 0) {
    return badRequest('اطلاعات کالا کامل نیست.', fields)
  }

  try {
    const created = await prisma.product.create({
      data: toProductCreateData(values),
      select: { id: true, slug: true, name: true },
    })

    await writeAuditLog({
      actorId: staff.id,
      action: 'product.created',
      entity: 'Product',
      entityId: created.id,
      metadata: {
        slug: created.slug,
        name: created.name,
        price: values.price,
        categorySlug: values.categorySlug,
        brandSlug: values.brandSlug,
      },
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent'),
    })

    revalidateCatalog()

    return jsonOk({ product: created }, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return badRequest('این نامک قبلاً استفاده شده است.', {
        slug: 'نامک تکراری است؛ مقدار دیگری انتخاب کنید.',
      })
    }
    throw error
  }
}

/**
 * تازه‌سازی کش فروشگاه.
 *
 * صفحه‌های کاتالوگ با `cache()` و ISR سرو می‌شوند؛ بدون این فراخوانی،
 * کالای تازه‌ساخته تا انقضای کش در فروشگاه دیده نمی‌شد. تازه‌سازی سطح
 * «layout ریشه» همهٔ صفحه‌هایی که در همان پوسته رندر می‌شوند را پوشش می‌دهد
 * (همان کاری که ذخیرهٔ تنظیمات سایت می‌کند).
 */
function revalidateCatalog() {
  revalidatePath('/', 'layout')
  revalidatePath('/admin/products')
}
