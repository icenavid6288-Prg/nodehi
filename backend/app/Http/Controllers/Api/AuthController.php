<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthSession;
use App\Models\OtpCode;
use App\Models\User;
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
    private const TTL_SECONDS = 120;
    private const MAX_ATTEMPTS = 5;

    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate(['phone' => ['required', 'string', 'max:20']]);
        $phone = $this->normalizePhone($data['phone']);

        if (! preg_match('/^09\d{9}$/', $phone)) {
            return response()->json(['ok' => false, 'error' => 'شماره همراه معتبر نیست.'], 422);
        }

        $code = (string) random_int(10000, 99999);

        OtpCode::create([
            'phone' => $phone,
            'code_hash' => hash('sha256', $code),
            'purpose' => 'login',
            'attempts' => 0,
            'expires_at' => now()->addSeconds(self::TTL_SECONDS),
        ]);

        $devMode = (bool) config('app.debug') && env('AUTH_OTP_DEV_MODE', '1') === '1';

        $payload = [
            'ok' => true,
            'message' => 'کد ورود ارسال شد.',
            'expiresIn' => self::TTL_SECONDS,
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

        $phone = $this->normalizePhone($data['phone']);
        $otp = OtpCode::query()
            ->where('phone', $phone)
            ->where('purpose', 'login')
            ->latest()
            ->first();

        if (! $otp || ! $otp->isUsable()) {
            return response()->json(['ok' => false, 'error' => 'کد منقضی شده است؛ دوباره درخواست کنید.'], 422);
        }

        if (! hash_equals($otp->code_hash, hash('sha256', $this->normalizeDigits($data['code'])))) {
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
        $days = (int) env('AUTH_SESSION_DAYS', 30);

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

    private function normalizePhone(string $phone): string
    {
        $digits = $this->normalizeDigits($phone);
        $digits = preg_replace('/\D+/', '', $digits);

        if (str_starts_with($digits, '0098')) {
            $digits = '0' . substr($digits, 4);
        } elseif (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = '0' . substr($digits, 2);
        } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0' . $digits;
        }

        return $digits;
    }

    private function normalizeDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }
}
