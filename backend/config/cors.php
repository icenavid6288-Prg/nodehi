<?php

/**
 * CORS — فقط مبدأ فرانت‌اند (Vite) مجاز است.
 * توکن ورود در هدر Authorization فرستاده می‌شود، پس کوکی اشتراکی لازم نیست؛
 * با این حال credentials برای توسعه محلی باز گذاشته شده است.
 */
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    // در production فقط دامنهٔ اعلام‌شده در FRONTEND_URL مجاز است؛ مبدأهای
    // محلی فقط وقتی APP_ENV برابر production نیست اضافه می‌شوند.
    'allowed_origins' => array_values(array_filter(array_unique(array_merge(
        [env('FRONTEND_URL')],
        env('APP_ENV', 'production') === 'production' ? [] : [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ],
    )))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    'exposed_headers' => [],
    'max_age' => 3600,
    // توکن در هدر Authorization می‌رود، پس کوکی اشتراکی لازم نیست و باز گذاشتن
    // credentials فقط سطح حمله را زیاد می‌کند.
    'supports_credentials' => false,
];
