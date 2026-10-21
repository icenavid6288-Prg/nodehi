<?php

namespace App\Http\Middleware;

use App\Models\AuthSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * احراز هویت با توکن Bearer.
 *
 * توکن خام هرگز در دیتابیس ذخیره نمی‌شود؛ فقط SHA-256 آن ذخیره می‌شود تا
 * نسخه پشتیبان دیتابیس، نشست‌های فعال را لو ندهد.
 *
 * حالت اختیاری (`auth.token:optional`) برای مسیرهایی است که مهمان هم می‌تواند
 * از آن‌ها استفاده کند ولی اگر کاربر وارد شده باشد باید سفارش/نظر به حسابش
 * وصل شود. در این حالت نبود توکن یا توکن منقضی، درخواست را رد نمی‌کند و
 * کاربر مهمان در نظر گرفته می‌شود.
 */
class AuthenticateToken
{
    public function handle(Request $request, Closure $next, string $optional = 'false'): Response
    {
        $isOptional = in_array(strtolower($optional), ['1', 'true', 'optional'], true);
        $token = $request->bearerToken();

        if (! $token) {
            return $isOptional
                ? $next($request)
                : response()->json(['ok' => false, 'error' => 'احراز هویت لازم است.'], 401);
        }

        $session = AuthSession::with('user')
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->first();

        if (! $session || ! $session->user || ! $session->user->is_active) {
            return $isOptional
                ? $next($request)
                : response()->json(['ok' => false, 'error' => 'نشست منقضی شده است.'], 401);
        }

        $request->setUserResolver(fn () => $session->user);
        $request->attributes->set('auth_session', $session);

        return $next($request);
    }
}
