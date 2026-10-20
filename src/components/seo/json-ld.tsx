/**
 * تزریق اسکیما مارک‌آپ.
 * از dangerouslySetInnerHTML استفاده می‌کنیم چون اسکیما باید JSON خالص در
 * تگ script باشد؛ ورودی همیشه از توابع کنترل‌شده lib/seo می‌آید.
 */
export function JsonLd({ data, id }: { data: Record<string, unknown> | Record<string, unknown>[]; id?: string }) {
  return (
    <script
      type="application/ld+json"
      id={id}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
