<?php

namespace App\Providers;

use App\Support\Phone;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * محدودیت نرخ مسیرهای حساس.
     *
     * بدون این‌ها کد پنج‌رقمی OTP با درخواست پی‌درپی کد تازه قابل جاروب است
     * و فرم‌های عمومی (تماس، نظر، هشدار موجودی) به ابزار اسپم تبدیل می‌شوند.
     * کلید OTP ترکیب شماره و IP است؛ محدودیت فقط بر IP با NAT همراهان را
     * قربانی می‌کند و محدودیت فقط بر شماره، جاروب از چند IP را نمی‌بندد.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('otp-phone', fn (Request $request) => Limit::perMinutes(2, 3)
            ->by('otp-phone:' . Phone::normalize($request->input('phone'))));

        // سقف IP سخاوتمندانه‌تر از سقف شماره است: بسیاری از کاربران ایرانی
        // پشت NAT اپراتور IP مشترک دارند و سقف ۱۰ در ساعت، مشتریان واقعی را
        // قربانی می‌کند. محافظ اصلی، همان سقف شماره است.
        RateLimiter::for('otp-ip', fn (Request $request) => Limit::perHour(30)
            ->by('otp-ip:' . $request->ip()));

        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinutes(10, 10)
            ->by('checkout:' . $request->ip()));

        RateLimiter::for('contact', fn (Request $request) => Limit::perHour(5)
            ->by('contact:' . $request->ip()));

        RateLimiter::for('reviews', fn (Request $request) => Limit::perHour(5)
            ->by('reviews:' . $request->ip()));

        RateLimiter::for('stock-alerts', fn (Request $request) => Limit::perHour(5)
            ->by('stock-alerts:' . $request->ip()));
    }
}
