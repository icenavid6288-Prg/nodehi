import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ButtonLink } from '@/components/ui/button'
import { formatJalaliDate } from '@/lib/utils/format'

export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
}

/**
 * قالب مشترک صفحات حقوقی (قوانین، حریم خصوصی).
 * فهرست مطالب چسبان، خوانایی متن‌های طولانی را بالا می‌برد و ساختار هدینگ‌ها
 * برای سئو نیز درست حفظ می‌شود.
 */
export function LegalPage({
  title,
  intro,
  updatedAt,
  sections,
}: {
  title: string
  intro: string
  updatedAt: string
  sections: LegalSection[]
}) {
  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumbs items={[{ name: title, path: '#' }]} />
      </div>

      <header className="pb-6">
        <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-7 text-ink-muted">{intro}</p>
        <p className="mt-3 text-xs text-ink-subtle">آخرین به‌روزرسانی: {formatJalaliDate(updatedAt)}</p>
      </header>

      <div className="grid gap-8 pb-12 lg:grid-cols-[1fr_280px]">
        <article className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="text-base font-bold text-ink">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-sm leading-8 text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5 text-sm leading-7 text-ink-muted">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>

        <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-32">
          <nav aria-label="فهرست مطالب" className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">فهرست مطالب</h2>
            <ol className="flex flex-col gap-2 text-xs">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-ink-muted transition-colors hover:text-primary">
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="rounded-2xl border border-surface-border bg-white p-5">
            <h2 className="text-sm font-bold text-ink">پرسشی دارید؟</h2>
            <p className="mt-2 text-xs leading-6 text-ink-muted">
              اگر بخشی از این سند برای شما روشن نیست، با پشتیبانی نودهی تماس بگیرید تا توضیح دهیم.
            </p>
            <ButtonLink href="/contact" variant="outline" size="sm" className="mt-3 w-full">
              تماس با پشتیبانی
            </ButtonLink>
            <Link
              href="/faq"
              className="mt-3 block text-center text-xs text-primary transition-colors hover:text-accent"
            >
              مطالعه سوالات متداول ←
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
