<?php

/**
 * نقطهٔ ورود API لاراول در داکیومنتروت.
 *
 * چرا این فایل وجود دارد؟
 * روی بیشتر هاست‌های اشتراکی، Document Root دامنه همان public_html است و
 * تغییرش ممکن نیست. پس کد لاراول بیرون از داکیومنتروت (پیش‌فرض: پوشهٔ
 * کنارِ آن با نام nodehi) می‌ماند و تنها همین فایل به آن وصل می‌شود.
 *
 * مسیر برنامه:
 * اگر پوشهٔ برنامه را جایی جز «nodehi» گذاشتید، مسیر زیر را عوض کنید یا
 * متغیر محیطی NODEHI_APP_DIR را ست کنید.
 */

declare(strict_types=1);

$appDir = getenv('NODEHI_APP_DIR') ?: dirname(__DIR__) . '/nodehi';

if (! is_file($appDir . '/vendor/autoload.php') || ! is_file($appDir . '/bootstrap/app.php')) {
    // تشخیص خودکار وقتی نام پوشه چیز دیگری است (فقط چند پوشهٔ کنارِ داکیومنتروت).
    $parent = dirname(__DIR__);
    foreach (glob($parent . '/*', GLOB_ONLYDIR) ?: [] as $candidate) {
        if (is_file($candidate . '/vendor/autoload.php') && is_file($candidate . '/bootstrap/app.php')) {
            $appDir = $candidate;
            break;
        }
    }
}

if (! is_file($appDir . '/vendor/autoload.php') || ! is_file($appDir . '/bootstrap/app.php')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'برنامهٔ لاراول پیدا نشد. پوشهٔ nodehi باید کنار public_html باشد.',
        'expected' => dirname(__DIR__) . '/nodehi',
    ], JSON_UNESCAPED_UNICODE);

    return;
}

if (! is_file($appDir . '/.env')) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'سایت هنوز نصب نشده است. نشانی /install.php را در مرورگر باز کنید.',
        'install' => '/install.php',
    ], JSON_UNESCAPED_UNICODE);

    return;
}

define('LARAVEL_START', microtime(true));

// حالت تعمیر و نگهداری لاراول (php artisan down) هم پشتیبانی می‌شود.
if (file_exists($maintenance = $appDir . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appDir . '/vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require $appDir . '/bootstrap/app.php';

/*
 * داکیومنتروت همین پوشه است. بدون این خط، public_path() به nodehi/public
 * اشاره می‌کند و تصاویر آپلودی (uploads) و هر فایل عمومی دیگر ۴۰۴ می‌شود.
 */
$app->usePublicPath(__DIR__);

$app->handleRequest(\Illuminate\Http\Request::capture());
