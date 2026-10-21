<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * هدرهای امنیتی پایه.
 *
 * این‌ها در نسخهٔ Next داخل `next.config.mjs` بودند و با حذف آن از دست
 * می‌رفتند. HSTS فقط در production فرستاده می‌شود تا توسعهٔ محلی روی HTTP
 * قفل نشود.
 *
 * CSP فعلاً ارسال نمی‌شود: فرانت در محیط توسعه از WebSocket و در تولید از
 * دامنهٔ API استفاده می‌کند و باید پس از تثبیت دامنه‌ها با گزارش‌گیری
 * (Report-Only) اضافه شود.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

        if (app()->isProduction()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        }

        return $response;
    }
}
