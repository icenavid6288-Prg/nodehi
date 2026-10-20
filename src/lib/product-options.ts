/**
 * گزینه‌های ثابت کالا — مشترک بین اعتبارسنجی سرور و فرم پنل.
 *
 * چرا فایل جدا؟ این مقادیر هم در `lib/server/admin-products.ts` (اعتبارسنجی
 * ورودی) لازم‌اند و هم در فرم کلاینتی. اگر از ماژول سرور وارد می‌شدند، باندل
 * مرورگر به ماژولی وابسته می‌گشت که روزی ممکن است کد سرور را بکشد. اینجا هیچ
 * وابستگی‌ای وجود ندارد.
 */

/** گروه‌بندی مشخصات فنی در صفحه کالا */
export const SPEC_GROUPS = ['general', 'technical', 'dimensions', 'energy'] as const
export type SpecGroup = (typeof SPEC_GROUPS)[number]

/** برچسب فارسی گروه مشخصات */
export const SPEC_GROUP_LABELS: Record<SpecGroup, string> = {
  general: 'عمومی',
  technical: 'فنی',
  dimensions: 'ابعاد',
  energy: 'انرژی',
}

/** واحدهای ظرفیت قابل انتخاب */
export const CAPACITY_UNITS = ['لیتر', 'کیلوگرم', 'اینچ'] as const

/** رده‌های انرژی مجاز */
export const ENERGY_RATINGS = ['A+++', 'A++', 'A+', 'A', 'B'] as const
