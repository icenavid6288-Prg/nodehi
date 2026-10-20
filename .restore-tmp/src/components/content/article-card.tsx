import Link from 'next/link'
import { articleCategoryLabels } from '@/lib/data/articles'
import { cn } from '@/lib/utils/cn'
import { formatJalaliDate, toPersianDigits } from '@/lib/utils/format'
import type { Article } from '@/types'

export function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-float',
      )}
    >
      {/* نوار تزئینی بالای کارت — جای تصویر شاخص مقاله */}
      <div
        className={cn(
          'relative flex items-center justify-center bg-gradient-to-l from-primary/[0.08] via-surface-muted to-secondary/10',
          featured ? 'h-44' : 'h-28',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} className="h-10 w-10 text-primary/25">
          <path d="M6 3h9l5 5v13H6z" strokeLinejoin="round" />
          <path d="M15 3v5h5M9 13h8M9 17h5" strokeLinecap="round" />
        </svg>
        <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-primary shadow-sm">
          {articleCategoryLabels[article.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className={cn('font-bold leading-7', featured ? 'text-base sm:text-lg' : 'text-sm')}>
          <Link href={`/blog/${article.slug}`} className="text-ink transition-colors group-hover:text-primary">
            {article.title}
          </Link>
        </h3>

        <p className={cn('text-ink-muted', featured ? 'line-clamp-3 text-sm leading-7' : 'line-clamp-2 text-xs leading-6')}>
          {article.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] text-ink-subtle">
          <span>{formatJalaliDate(article.publishedAt)}</span>
          <span>{toPersianDigits(article.readingMinutes)} دقیقه مطالعه</span>
        </div>
      </div>
    </article>
  )
}
