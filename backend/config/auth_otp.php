<?php

/**
 * تنظیمات ورود با کد یک‌بارمصرف.
 *
 * این مقادیر از env خوانده می‌شوند تا با `php artisan config:cache` هم درست
 * کار کنند؛ فراخوانی مستقیم env() در کنترلر بعد از cache شدن config مقدار
 * null برمی‌گرداند و رفتار برنامه بی‌صدا عوض می‌شود.
 */
return [
    /*
     | فقط برای توسعه: کد را در پاسخ API برمی‌گرداند تا بدون سرویس پیامک هم
     | بتوان وارد شد. پیش‌فرض عمداً false است و علاوه بر این، در محیط
     | production و وقتی APP_DEBUG=false باشد هرگز فعال نمی‌شود.
     */
    'dev_mode' => (bool) env('AUTH_OTP_DEV_MODE', false),

    /** طول عمر کد (ثانیه) */
    'ttl' => (int) env('AUTH_OTP_TTL_SECONDS', 120),

    /** طول عمر نشست ورود (روز) */
    'session_days' => (int) env('AUTH_SESSION_DAYS', 30),
];
