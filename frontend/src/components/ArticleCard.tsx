import { Link } from 'react-router-dom'
import type { ArticleSummary } from '../lib/api'
import { formatDate, toFa } from '../lib/format'

export default function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-surface-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-card">
      <span className="w-fit rounded-full bg-primary/[0.08] px-3 py-1 text-[11px] font-medium text-primary">
        {article.categoryLabel}
      </span>

      <h3 className="mt-3 text-sm font-bold leading-7">
        <Link to={`/blog/${article.slug}`} className="transition-colors hover:text-primary">
          {article.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-xs leading-6 text-ink-muted">{article.excerpt}</p>

      <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-surface-border pt-3 text-[11px] text-ink-subtle">
        <span>{formatDate(article.publishedAt)}</span>
        <span>·</span>
        <span>{toFa(article.readingMinutes)} دقیقه مطالعه</span>
      </div>
    </article>
  )
}
