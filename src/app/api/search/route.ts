import { searchSuggestions } from '@/lib/server/catalog'
import { clientIp, jsonOk, tooManyRequests } from '@/lib/server/http'
import { rateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * پیشنهاد خودکار جستجو (autocomplete).
 * GET /api/search?q=یخچال&limit=7
 *
 * این مسیر پرترافیک‌ترین نقطه سایت است (هر تایپ کاربر)، پس محدودیت نرخ
 * سخاوتمندانه اما واقعی دارد تا از سوءاستفاده جلوگیری شود.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = (url.searchParams.get('q') ?? '').slice(0, 80)
  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) ? Math.min(10, Math.max(1, limitRaw)) : 7

  const ip = clientIp(request)
  const limited = rateLimit(`search:${ip}`, { limit: 120, windowMs: 60_000 })
  if (!limited.ok) return tooManyRequests(limited.retryAfterSeconds)

  const suggestions = await searchSuggestions(query, limit)

  return jsonOk({
    query,
    count: suggestions.length,
    suggestions: suggestions.map((item) => ({
      type: item.type,
      label: item.label,
      href: item.href,
      meta: item.meta,
    })),
  })
}
