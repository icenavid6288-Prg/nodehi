<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\OtpCode;
use App\Models\User;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ورود با شماره همراه و کد یک‌بارمصرف.
 *
 * در محیط توسعه اگر سرویس پیامک تنظیم نشده باشد، کد در پاسخ برگردانده
 * می‌شود (فقط وقتی AUTH_OTP_DEV_MODE=1) — در تولید هرگز.
 */
class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);
        $phone = Phone::normalize($data['phone']);

        if (! Phone::isValid($phone)) {
            return response()->json(['ok' => false, 'error' => 'شماره همراه معتبر نیست.'], 422);
        }

        $ttl = (int) config('auth_otp.ttl', 120);
        $code = (string) random_int(10000, 99999);

        // کدهای فعال قبلی همان شماره باطل می‌شوند؛ فقط آخرین پیامک معتبر است.
        OtpCode::query()
            ->where('phone', $phone)
            ->where('purpose', 'login')
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        OtpCode::create([
            'phone' => $phone,
            'code_hash' => $this->hashCode($phone, $code),
            'purpose' => 'login',
            'attempts' => 0,
            'expires_at' => now()->addSeconds($ttl),
        ]);

        $devMode = config('app.debug')
            && ! app()->isProduction()
            && (bool) config('auth_otp.dev_mode');

        $payload = [
            'ok' => true,
            'message' => 'کد ورود ارسال شد.',
            'expiresIn' => $ttl,
        ];

        if ($devMode) {
            $payload['devCode'] = $code;
        }

        return response()->json($payload);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'string', 'max:10'],
            'firstName' => ['nullable', 'string', 'max:60'],
            'lastName' => ['nullable', 'string', 'max:60'],
        ]);

        $phone = Phone::normalize($data['phone']);
        $otp = OtpCode::query()
            ->where('phone', $phone)
            ->where('purpose', 'login')
            ->latest()
            ->first();

        if (! $otp || ! $otp->isUsable()) {
            return response()->json(['ok' => false, 'error' => 'کد منقضی شده است؛ دوباره درخواست کنید.'], 422);
        }

        if (! hash_equals($otp->code_hash, $this->hashCode($phone, Phone::latinDigits($data['code'])))) {
            $otp->increment('attempts');

            $left = max(self::MAX_ATTEMPTS - $otp->attempts, 0);

            return response()->json([
                'ok' => false,
                'error' => $left > 0 ? "کد نادرست است؛ {$left} تلاش باقی مانده." : 'تعداد تلاش بیش از حد مجاز شد.',
            ], 422);
        }

        $otp->update(['consumed_at' => now()]);

        $user = User::firstOrCreate(
            ['phone' => $phone],
            [
                'first_name' => $data['firstName'] ?? null,
                'last_name' => $data['lastName'] ?? null,
                'role' => 'customer',
                'is_active' => true,
            ]
        );

        $user->update([
            'phone_verified_at' => $user->phone_verified_at ?? now(),
            'last_login_at' => now(),
        ]);

        $token = bin2hex(random_bytes(32));
        $days = (int) config('auth_otp.session_days', 30);

        AuthSession::create([
            'token_hash' => hash('sha256', $token),
            'user_id' => $user->id,
            'expires_at' => now()->addDays($days),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'ip' => $request->ip(),
        ]);

        return response()->json([
            'ok' => true,
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function session(Request $request): JsonResponse
    {
        return response()->json(['ok' => true, 'user' => $this->userPayload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $session = $request->attributes->get('auth_session');
        $session?->delete();

        return response()->json(['ok' => true, 'message' => 'از حساب خارج شدید.']);
    }

    private function userPayload(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'phone' => $user->phone,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'fullName' => $user->fullName(),
            'role' => $user->role,
            'loyaltyPoints' => $user->loyalty_points,
            'loyaltyTier' => $user->loyalty_tier,
        ];
    }

    /**
     * هش کد با کلید برنامه و شماره به‌عنوان نمک.
     *
     * SHA-256 خالی برای کد پنج‌رقمی (فقط ۱۰۰٬۰۰۰ حالت) با brute force آفلاین
     * شکسته می‌شود؛ نمکِ شماره + کلید برنامه این کار را غیرعملی می‌کند.
     */
    private function hashCode(string $phone, string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key') . '|' . $phone);
    }
}
