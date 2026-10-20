/**
 * ─────────────────────────────────────────────────────────────
 *  هویت برند نودهی — «تنها فایلی که برای تغییر ظاهر باید ویرایش شود»
 * ─────────────────────────────────────────────────────────────
 *  رنگ‌ها از همین‌جا به tailwind.config.ts تزریق می‌شوند، پس تغییر مقدار
 *  یک رنگ در این فایل، در تمام کامپوننت‌ها اعمال می‌گردد.
 *  نکته: این فایل عمداً هیچ import ای ندارد تا Tailwind بتواند آن را
 *  در زمان build بدون وابستگی اضافه بخواند.
 */

export const brand = {
  name: 'نودهی',
  nameEn: 'Nodehi',
  tagline: 'لوازم خانگی مطمئن، با گارانتی و ارسال سریع',
  description:
    'فروشگاه اینترنتی نودهی؛ خرید آنلاین یخچال، ماشین لباسشویی، ظرفشویی، تلویزیون، کولر گازی و لوازم خانگی با ضمانت اصالت کالا، گارانتی معتبر و ارسال سریع به سراسر ایران.',

  /** رنگ‌های اصلی برند */
  colors: {
    /** سرمه‌ای مطمئن — رنگ غالب برند (اعتماد و تخصص) */
    primary: {
      DEFAULT: '#0F2A43',
      light: '#1B4066',
      dark: '#081A2B',
      foreground: '#FFFFFF',
    },
    /** فیروزه‌ای مکمل — حس فناوری و پاکیزگی */
    secondary: {
      DEFAULT: '#12B5A5',
      light: '#3FCFC0',
      dark: '#0B8478',
      foreground: '#04231F',
    },
    /** نارنجی تأکیدی — فقط برای CTA، تخفیف و هشدار */
    accent: {
      DEFAULT: '#FF6B35',
      light: '#FF8A5C',
      dark: '#E04E1B',
      foreground: '#FFFFFF',
    },
  },

  /** فونت پیشنهادی: وزیرمتن (Vazirmatn) با فالبک سیستم */
  font: {
    family: 'Vazirmatn',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap',
  },

  /** اطلاعات تماس و شبکه‌های اجتماعی */
  contact: {
    phone: '۰۲۱-۹۱۰۰۰۰۰۰',
    phoneRaw: '+982191000000',
    mobile: '۰۹۱۲۰۰۰۰۰۰۰',
    email: 'info@nodehi.ir',
    address: 'تهران، خیابان ولیعصر، پلاک ۱۲۳، طبقه سوم',
    postalCode: '۱۹۶۸۷۶۵۴۳۲',
    workingHours: 'شنبه تا پنجشنبه، ۹ صبح تا ۹ شب',
  },

  social: {
    instagram: 'https://instagram.com/nodehi',
    telegram: 'https://t.me/nodehi',
    whatsapp: 'https://wa.me/989120000000',
    linkedin: 'https://linkedin.com/company/nodehi',
  },

  /** آدرس عمومی سایت — در محیط تولید از NEXT_PUBLIC_SITE_URL خوانده می‌شود */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://noudalife.ir',

  /** شعبه‌ها (برای سئوی محلی و Google Business Profile) */
  branches: [
    { city: 'تهران', address: 'خیابان ولیعصر، پلاک ۱۲۳', mapUrl: 'https://maps.google.com' },
    { city: 'اصفهان', address: 'خیابان چهارباغ بالا، پلاک ۴۵', mapUrl: 'https://maps.google.com' },
  ],
} as const

export type Brand = typeof brand
