<?php

namespace App\Support;

/**
 * نرمال‌سازی شمارهٔ همراه ایرانی.
 *
 * چرا یک کلاس مشترک؟ شماره در ورود، سفارش، پیگیری و هشدار موجودی ذخیره
 * می‌شود. اگر هر مسیر خودش شماره را دستکاری کند، «۰۹۱۲…» و «+۹۸۹۱۲…» دو
 * رکورد جدا می‌شوند و پیگیری سفارش یا اطلاع موجودی از کار می‌افتد.
 *
 * قاعده: خروجی همیشه ۱۱ رقم و با «09» شروع می‌شود. ورودی نامعتبر همان
 * مقدار پاک‌شده برمی‌گردد تا اعتبارسنجی جداگانه آن را رد کند.
 */
final class Phone
{
    /** تبدیل رقم‌های فارسی/عربی به لاتین. */
    public static function latinDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }

    /** شماره را به قالب 09xxxxxxxxx تبدیل می‌کند. */
    public static function normalize(?string $phone): string
    {
        $digits = preg_replace('/\D+/', '', self::latinDigits((string) $phone)) ?? '';

        if (str_starts_with($digits, '0098')) {
            $digits = '0' . substr($digits, 4);
        } elseif (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = '0' . substr($digits, 2);
        } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0' . $digits;
        }

        return $digits;
    }

    /** آیا شماره بعد از نرمال‌سازی، یک همراه ایران معتبر است؟ */
    public static function isValid(?string $phone): bool
    {
        return (bool) preg_match('/^09\d{9}$/', self::normalize($phone));
    }
}
