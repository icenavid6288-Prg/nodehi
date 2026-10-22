<?php

/**
 * نصب‌کنندهٔ نودهی — برای هاست اشتراکی که SSH/Composer ندارد.
 *
 * این فایل در داکیومنتروت (کنار index.html) قرار می‌گیرد و کد لاراول در پوشهٔ
 * کنارِ آن (پیش‌فرض nodehi/) است. کارهایی که انجام می‌دهد:
 *
 *   ۱. بررسی پیش‌نیازها (نسخهٔ PHP، افزونه‌ها، دسترسی نوشتن)
 *   ۲. نوشتن فایل .env بیرون از داکیومنتروت
 *   ۳. ساخت جدول‌ها و (اختیاری) دادهٔ نمونه با اجرای artisan در همان پروسه
 *   ۴. تعیین شمارهٔ مدیر و ساخت قفل نصب، سپس حذف همین فایل
 *
 * پس از نصب موفق، بازکردن دوبارهٔ این نشانی چیزی را تغییر نمی‌دهد.
 * برای اجرای مجدد، فایل storage/app/installed.lock در پوشهٔ برنامه را پاک کنید.
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

session_start();

const INSTALLER_VERSION = '1.0.0';

/* ------------------------------ مسیرها ------------------------------ */

$appDir = getenv('NODEHI_APP_DIR') ?: dirname(__DIR__) . '/nodehi';
$appDir = rtrim($appDir, '/');

if (! is_file($appDir . '/vendor/autoload.php')) {
    foreach (glob(dirname(__DIR__) . '/*', GLOB_ONLYDIR) ?: [] as $candidate) {
        if (is_file($candidate . '/vendor/autoload.php') && is_file($candidate . '/bootstrap/app.php')) {
            $appDir = $candidate;
            break;
        }
    }
}

$publicDir = __DIR__;
$envFile = $appDir . '/.env';
$lockFile = $appDir . '/storage/app/installed.lock';
$appFound = is_file($appDir . '/bootstrap/app.php') && is_file($appDir . '/vendor/autoload.php');
$installed = is_file($lockFile);

/* --------------------------- کمک‌کننده‌ها --------------------------- */

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function post(string $key, string $default = ''): string
{
    return trim((string) ($_POST[$key] ?? $default));
}

/** مقدار مناسب برای نوشتن در .env — رشته‌های خاص در تک‌کوتیشن می‌روند. */
function envValue(string $value): string
{
    if ($value === '') {
        return '';
    }
    if (preg_match('/^[A-Za-z0-9_.\-:@\/]+$/', $value) === 1) {
        return $value;
    }

    return "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $value) . "'";
}

function envLine(string $key, string $value): string
{
    return $key . '=' . envValue($value);
}

/** ساخت پوشه و بررسی واقعی نوشتن در آن. */
function ensureWritableDir(string $dir): bool
{
    if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
        return false;
    }
    $probe = $dir . '/.write-test-' . bin2hex(random_bytes(4));
    if (@file_put_contents($probe, 'ok') === false) {
        return false;
    }
    @unlink($probe);

    return true;
}

function isOutside(string $path, string $publicDir): bool
{
    $realApp = realpath($path) ?: $path;
    $realPublic = realpath($publicDir) ?: $publicDir;

    return ! str_starts_with($realApp . '/', rtrim($realPublic, '/') . '/');
}

/** شمارهٔ همراه را به شکل 09xxxxxxxxx درمی‌آورد. */
function normalizePhone(string $value): ?string
{
    $map = ['۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9'];
    $digits = preg_replace('/\D+/', '', strtr($value, $map)) ?? '';

    if (str_starts_with($digits, '0098')) {
        $digits = '0' . substr($digits, 4);
    } elseif (str_starts_with($digits, '98') && strlen($digits) === 12) {
        $digits = '0' . substr($digits, 2);
    } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
        $digits = '0' . $digits;
    }

    return preg_match('/^09\d{9}$/', $digits) === 1 ? $digits : null;
}

/** فهرست پیش‌نیازها با وضعیت هر مورد. */
function requirements(string $appDir, string $publicDir, bool $appFound): array
{
    $rows = [];

    $ok = version_compare(PHP_VERSION, '8.2.0', '>=');
    $rows[] = ['نسخهٔ PHP 8.2 یا بالاتر', $ok, 'نسخهٔ فعلی: ' . PHP_VERSION . ' — از پنل هاست تغییرش دهید.'];

    $rows[] = ['برنامهٔ لاراول در مسیر ' . $appDir, $appFound, 'پوشهٔ nodehi باید کنار public_html باشد.'];

    foreach (['pdo' => 'PDO', 'mbstring' => 'mbstring', 'openssl' => 'openssl', 'tokenizer' => 'tokenizer',
        'ctype' => 'ctype', 'json' => 'json', 'fileinfo' => 'fileinfo', 'curl' => 'curl',
        'dom' => 'dom', 'xml' => 'xml', 'session' => 'session'] as $ext => $label) {
        $rows[] = ['افزونهٔ ' . $label, extension_loaded($ext), 'افزونهٔ php-' . $ext . ' را فعال کنید.'];
    }

    $hasSqlite = extension_loaded('pdo_sqlite');
    $hasMysql = extension_loaded('pdo_mysql');
    $rows[] = [
        'درایور دیتابیس (pdo_sqlite یا pdo_mysql)',
        $hasSqlite || $hasMysql,
        'حداقل یکی از این دو باید فعال باشد.',
    ];

    if (is_dir($appDir . '/storage')) {
        $rows[] = ['نوشتن در storage/', ensureWritableDir($appDir . '/storage/framework/views'), 'دسترسی پوشه را 755/775 کنید.'];
        $rows[] = ['نوشتن در bootstrap/cache/', ensureWritableDir($appDir . '/bootstrap/cache'), 'دسترسی پوشه را 755/775 کنید.'];
        $rows[] = ['نوشتن در database/', ensureWritableDir($appDir . '/database'), 'دسترسی پوشه را 755/775 کنید.'];
    }

    $rows[] = ['نوشتن در داکیومنتروت (uploads)', ensureWritableDir($publicDir . '/uploads'), 'برای آپلود تصویر اسلایدها لازم است.'];

    $rows[] = ['قواعد .htaccess', is_file($publicDir . '/.htaccess'), 'فایل .htaccess را در public_html بگذارید.'];
    $rows[] = ['برنامه بیرون از داکیومنتروت است', isOutside($appDir, $publicDir), 'اگر nodehi داخل public_html باشد، .env و کد قابل دانلود می‌شود.'];

    return $rows;
}

/* --------------------------- اجرای artisan --------------------------- */

/**
 * یک فرمان artisan را در همین پروسه اجرا می‌کند (بدون shell_exec).
 *
 * @return array{code:int, output:string}
 */
function runArtisan(string $appDir, string $publicDir, string $command, array $parameters = []): array
{
    static $kernel = null;

    if ($kernel === null) {
        require_once $appDir . '/vendor/autoload.php';
        /** @var \Illuminate\Foundation\Application $app */
        $app = require $appDir . '/bootstrap/app.php';
        $app->usePublicPath($publicDir);
        $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
    }

    ob_start();
    try {
        $code = (int) $kernel->call($command, $parameters);
    } catch (\Throwable $error) {
        $code = 1;
        echo $error->getMessage();
    }
    $output = (string) ob_get_clean();

    return ['code' => $code, 'output' => trim($output)];
}

/* --------------------------- پردازش نصب --------------------------- */

$errors = [];
$notices = [];
$summary = [];
$justInstalled = false;

if (! $installed && ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $token = (string) ($_POST['csrf'] ?? '');
    $sessionToken = (string) ($_SESSION['nodehi_install_csrf'] ?? '');

    if ($sessionToken === '' || ! hash_equals($sessionToken, $token)) {
        $errors[] = 'نشست منقضی شده است؛ صفحه را دوباره باز کنید.';
    }

    $siteUrl = rtrim(post('site_url'), '/');
    $driver = post('db_driver', 'sqlite') === 'mysql' ? 'mysql' : 'sqlite';
    $dbHost = post('db_host', '127.0.0.1');
    $dbPort = post('db_port', '3306');
    $dbName = post('db_name');
    $dbUser = post('db_user');
    $dbPass = (string) ($_POST['db_pass'] ?? '');
    $adminPhone = normalizePhone(post('admin_phone', '09120000000'));
    $seed = isset($_POST['seed']);
    $smsKey = post('sms_key');
    $smsSender = post('sms_sender', '10008663');
    $smsTemplate = post('sms_template');
    $zarinpal = post('zarinpal_id');
    $zarinpalSandbox = isset($_POST['zarinpal_sandbox']);
    $otpDev = isset($_POST['otp_dev']);

    if (! filter_var($siteUrl, FILTER_VALIDATE_URL) || ! preg_match('#^https?://#i', $siteUrl)) {
        $errors[] = 'آدرس سایت معتبر نیست؛ باید با http:// یا https:// شروع شود.';
    }
    if ($adminPhone === null) {
        $errors[] = 'شمارهٔ همراه مدیر باید شکل 09xxxxxxxxx داشته باشد.';
    }
    if ($driver === 'mysql' && ($dbName === '' || $dbUser === '')) {
        $errors[] = 'برای MySQL نام دیتابیس و نام کاربری لازم است.';
    }

    if ($errors === [] && $driver === 'mysql') {
        try {
            new PDO(
                sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $dbHost, $dbPort, $dbName),
                $dbUser,
                $dbPass,
                [PDO::ATTR_TIMEOUT => 5]
            );
        } catch (\Throwable $error) {
            $errors[] = 'اتصال به MySQL برقرار نشد: ' . $error->getMessage();
        }
    }

    /* ---------- آماده‌سازی پوشه‌ها ---------- */

    if ($errors === []) {
        $dirs = [
            $appDir . '/storage/framework/cache/data',
            $appDir . '/storage/framework/sessions',
            $appDir . '/storage/framework/views',
            $appDir . '/storage/logs',
            $appDir . '/storage/app/private',
            $appDir . '/storage/app/public',
            $appDir . '/bootstrap/cache',
            $appDir . '/database',
            $publicDir . '/uploads',
        ];
        foreach ($dirs as $dir) {
            if (! ensureWritableDir($dir)) {
                $errors[] = 'نوشتن در «' . $dir . '» ممکن نشد؛ دسترسی پوشه را 755 یا 775 کنید.';
            }
        }

        // کش‌های کهنهٔ یک تلاش قبلی می‌توانند .env تازه را بی‌اثر کنند.
        foreach (glob($appDir . '/bootstrap/cache/*.php') ?: [] as $cacheFile) {
            @unlink($cacheFile);
        }
    }

    /* ---------- نوشتن .env ---------- */

    $sqlitePath = $appDir . '/database/database.sqlite';

    if ($errors === []) {
        if ($driver === 'sqlite' && ! is_file($sqlitePath) && @touch($sqlitePath) === false) {
            $errors[] = 'ساخت فایل SQLite ممکن نشد: ' . $sqlitePath;
        }
    }

    if ($errors === []) {
        $example = is_file($appDir . '/.env.example') ? (string) file_get_contents($appDir . '/.env.example') : '';
        $lines = [];

        $lines[] = '# ساخته‌شده با نصب‌کنندهٔ نودهی — ' . date('Y-m-d H:i:s');
        $lines[] = envLine('APP_NAME', 'نودهی');
        $lines[] = 'APP_ENV=production';
        $lines[] = envLine('APP_KEY', 'base64:' . base64_encode(random_bytes(32)));
        $lines[] = 'APP_DEBUG=false';
        $lines[] = envLine('APP_URL', $siteUrl);
        $lines[] = 'APP_LOCALE=fa';
        $lines[] = 'APP_FALLBACK_LOCALE=fa';
        $lines[] = 'APP_FAKER_LOCALE=fa_IR';
        $lines[] = 'APP_MAINTENANCE_DRIVER=file';
        $lines[] = 'BCRYPT_ROUNDS=12';
        $lines[] = 'LOG_CHANNEL=stack';
        $lines[] = 'LOG_STACK=single';
        $lines[] = 'LOG_DEPRECATIONS_CHANNEL=null';
        $lines[] = 'LOG_LEVEL=warning';
        $lines[] = '';
        $lines[] = '# ── دیتابیس ──';
        if ($driver === 'mysql') {
            $lines[] = 'DB_CONNECTION=mysql';
            $lines[] = envLine('DB_HOST', $dbHost);
            $lines[] = envLine('DB_PORT', $dbPort);
            $lines[] = envLine('DB_DATABASE', $dbName);
            $lines[] = envLine('DB_USERNAME', $dbUser);
            $lines[] = envLine('DB_PASSWORD', $dbPass);
        } else {
            $lines[] = 'DB_CONNECTION=sqlite';
            $lines[] = envLine('DB_DATABASE', $sqlitePath);
        }
        $lines[] = '';
        $lines[] = '# ── نشست و کش (جدول‌هایشان با مهاجرت ساخته می‌شوند) ──';
        $lines[] = 'SESSION_DRIVER=database';
        $lines[] = 'SESSION_LIFETIME=120';
        $lines[] = 'SESSION_ENCRYPT=false';
        $lines[] = 'SESSION_PATH=/';
        $lines[] = 'SESSION_DOMAIN=null';
        $lines[] = 'BROADCAST_CONNECTION=log';
        $lines[] = 'FILESYSTEM_DISK=local';
        $lines[] = 'QUEUE_CONNECTION=sync';
        $lines[] = 'CACHE_STORE=database';
        $lines[] = '';
        $lines[] = '# ── ایمیل ──';
        $lines[] = 'MAIL_MAILER=log';
        $lines[] = envLine('MAIL_FROM_ADDRESS', 'hello@' . (parse_url($siteUrl, PHP_URL_HOST) ?: 'localhost'));
        $lines[] = envLine('MAIL_FROM_NAME', 'نودهی');
        $lines[] = '';
        $lines[] = '# ── فرانت‌اند و احراز هویت ──';
        $lines[] = envLine('FRONTEND_URL', $siteUrl);
        $lines[] = 'AUTH_SESSION_DAYS=30';
        $lines[] = 'AUTH_OTP_DEV_MODE=' . ($otpDev ? '1' : '0');
        $lines[] = '';
        $lines[] = '# ── پیامک (کاوه‌نگار) ──';
        $lines[] = envLine('KAVENEGAR_API_KEY', $smsKey);
        $lines[] = envLine('KAVENEGAR_SENDER', $smsSender);
        $lines[] = envLine('KAVENEGAR_OTP_TEMPLATE', $smsTemplate);
        $lines[] = '';
        $lines[] = '# ── پرداخت آنلاین (زرین‌پال) ──';
        $lines[] = envLine('ZARINPAL_MERCHANT_ID', $zarinpal);
        $lines[] = 'ZARINPAL_SANDBOX=' . ($zarinpalSandbox ? 'true' : 'false');
        $lines[] = envLine('ZARINPAL_CALLBACK_URL', $siteUrl . '/api/payments/zarinpal/callback');
        $lines[] = '';

        if ($example !== '' && ! str_contains($example, 'APP_KEY=')) {
            $notices[] = 'نمونهٔ .env خوانده نشد؛ فایل تازه ساخته شد.';
        }

        if (@file_put_contents($envFile, implode("\n", $lines), LOCK_EX) === false) {
            $errors[] = 'نوشتن فایل .env ممکن نشد: ' . $envFile;
        }
    }

    /* ---------- مهاجرت و دادهٔ اولیه ---------- */

    if ($errors === []) {
        $migrate = runArtisan($appDir, $publicDir, 'migrate', ['--force' => true]);
        if ($migrate['code'] !== 0) {
            $errors[] = "اجرای جدول‌ها (migrate) ناموفق بود:\n" . $migrate['output'];
        } else {
            $summary[] = 'جدول‌های دیتابیس ساخته شد.';
        }
    }

    if ($errors === [] && $seed) {
        $seedRun = runArtisan($appDir, $publicDir, 'db:seed', ['--force' => true]);
        if ($seedRun['code'] !== 0) {
            $errors[] = "بارگذاری دادهٔ نمونه (db:seed) ناموفق بود:\n" . $seedRun['output'];
        } else {
            $summary[] = 'کاتالوگ، مقاله‌ها، سوالات متداول و اسلایدهای نمونه اضافه شد.';
        }
    }

    /* ---------- کاربر مدیر ---------- */

    if ($errors === []) {
        try {
            $userClass = '\App\Models\User';
            $admin = $userClass::query()->where('role', 'admin')->first();

            if ($admin === null) {
                $userClass::query()->create([
                    'phone' => $adminPhone,
                    'first_name' => 'مدیر',
                    'last_name' => 'نودهی',
                    'role' => 'admin',
                    'is_active' => true,
                    'phone_verified_at' => now(),
                ]);
                $summary[] = 'کاربر مدیر با شمارهٔ ' . $adminPhone . ' ساخته شد.';
            } else {
                if ($admin->phone !== $adminPhone) {
                    $existing = $userClass::query()->where('phone', $adminPhone)->where('id', '!=', $admin->id)->first();
                    if ($existing !== null) {
                        $existing->forceFill(['role' => 'admin', 'is_active' => true])->save();
                        $admin->forceFill(['role' => 'customer'])->save();
                        $summary[] = 'نقش مدیر به شمارهٔ ' . $adminPhone . ' منتقل شد.';
                    } else {
                        $admin->forceFill(['phone' => $adminPhone])->save();
                        $summary[] = 'شمارهٔ مدیر روی ' . $adminPhone . ' تنظیم شد.';
                    }
                } else {
                    $summary[] = 'کاربر مدیر با شمارهٔ ' . $adminPhone . ' آماده است.';
                }
            }
        } catch (\Throwable $error) {
            $errors[] = 'ساخت کاربر مدیر ناموفق بود: ' . $error->getMessage();
        }
    }

    /* ---------- قفل نصب ---------- */

    if ($errors === []) {
        $lock = json_encode([
            'installed_at' => date('c'),
            'site_url' => $siteUrl,
            'installer' => INSTALLER_VERSION,
            'php' => PHP_VERSION,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        if (@file_put_contents($lockFile, (string) $lock) === false) {
            $errors[] = 'نوشتن قفل نصب ممکن نشد: ' . $lockFile;
        } else {
            $installed = true;
            $justInstalled = true;
            $deleted = @unlink(__FILE__);
            $summary[] = $deleted
                ? 'فایل نصب‌کننده (install.php) برای امنیت حذف شد.'
                : 'فایل install.php حذف نشد؛ آن را از File Manager پاک کنید.';
        }
    }
}

$csrf = (string) ($_SESSION['nodehi_install_csrf'] ?? '');
if ($csrf === '') {
    $csrf = bin2hex(random_bytes(16));
    $_SESSION['nodehi_install_csrf'] = $csrf;
}

$requirements = requirements($appDir, $publicDir, $appFound);
$missing = array_values(array_filter($requirements, fn ($row) => $row[1] === false));
$siteGuess = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
    . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

$form = [
    'site_url' => post('site_url', $siteGuess),
    'db_driver' => post('db_driver', extension_loaded('pdo_sqlite') ? 'sqlite' : 'mysql'),
    'db_host' => post('db_host', '127.0.0.1'),
    'db_port' => post('db_port', '3306'),
    'db_name' => post('db_name'),
    'db_user' => post('db_user'),
    'admin_phone' => post('admin_phone', '09120000000'),
    'sms_sender' => post('sms_sender', '10008663'),
];
?>
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>نصب نودهی</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 16px 64px;
    font-family: Vazirmatn, "Segoe UI", Tahoma, sans-serif;
    background: #f4f6f8; color: #1f2937; line-height: 1.9;
  }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
  .card {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
    padding: 18px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04);
  }
  .card h2 { font-size: 15px; margin: 0 0 12px; }
  ul.req { list-style: none; margin: 0; padding: 0; font-size: 13px; }
  ul.req li { display: flex; gap: 8px; padding: 3px 0; align-items: flex-start; }
  .mark { flex: 0 0 18px; font-weight: 700; }
  .ok { color: #047857; }
  .bad { color: #b91c1c; }
  .hint { color: #9ca3af; font-size: 11px; display: block; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 12px 0 4px; }
  input[type=text], input[type=url], input[type=password], select {
    width: 100%; padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 9px;
    font: inherit; font-size: 13px; background: #fff; direction: ltr; text-align: left;
  }
  input[type=text]::placeholder { direction: rtl; text-align: right; color: #c3c8d0; }
  .grid { display: grid; gap: 0 14px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .check { display: flex; gap: 8px; align-items: flex-start; margin: 10px 0; font-size: 13px; font-weight: 500; }
  .check input { margin-top: 6px; }
  .note { font-size: 12px; border-radius: 10px; padding: 10px 12px; margin: 12px 0 0; }
  .note.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
  .note.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
  .note.bad { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  .note.good { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  pre { white-space: pre-wrap; word-break: break-word; font-size: 12px; background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 10px; direction: ltr; text-align: left; }
  button {
    appearance: none; border: 0; border-radius: 10px; padding: 12px 22px; font: inherit;
    font-size: 14px; font-weight: 700; color: #fff; background: #0f766e; cursor: pointer;
  }
  button:disabled { background: #9ca3af; cursor: not-allowed; }
  a { color: #0f766e; }
  .mono { direction: ltr; text-align: left; font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 5px; font-size: 12px; direction: ltr; display: inline-block; }
  .muted { color: #6b7280; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>نصب فروشگاه نودهی</h1>
  <p class="sub">نسخهٔ <?= e(INSTALLER_VERSION) ?> — این صفحه فقط یک بار کار می‌کند و بعد از نصب خودش را حذف می‌کند.</p>

<?php if (! $appFound): ?>
  <div class="card">
    <h2 class="bad">پوشهٔ برنامه پیدا نشد</h2>
    <p class="muted">
      کد لاراول باید در پوشه‌ای کنار <code>public_html</code> باشد. ساختار درست:
    </p>
    <pre>home/username/
├── public_html/   ← محتوای بستهٔ فرانت‌اند + همین install.php
└── nodehi/        ← کل پوشهٔ برنامه (app، vendor، storage، ...)</pre>
    <p class="muted">مسیر بررسی‌شده: <span class="mono"><?= e($appDir) ?></span></p>
  </div>

<?php elseif ($installed): ?>
  <div class="card">
    <h2 class="ok">این سایت قبلاً نصب شده است</h2>
<?php if ($justInstalled): ?>
    <div class="note good">
      نصب با موفقیت تمام شد.
      <ul style="margin:8px 0 0;padding-inline-start:18px">
        <?php foreach ($summary as $item): ?><li><?= e($item) ?></li><?php endforeach; ?>
      </ul>
    </div>
    <p style="margin-top:14px">
      <a href="/">بازکردن سایت</a> ·
      <a href="/admin">پنل مدیریت</a> ·
      <a href="/api/health">بررسی API</a>
    </p>
    <div class="note warn">
      اگر ورود بدون پیامک فعال است، کد یک‌بارمصرف در همان صفحهٔ ورود نمایش داده می‌شود.
      بعد از تنظیم کاوه‌نگار، <code>AUTH_OTP_DEV_MODE</code> را در فایل <code>.env</code> صفر کنید.
    </div>
<?php else: ?>
    <p class="muted">
      قفل نصب در <span class="mono">storage/app/installed.lock</span> موجود است.
      برای اجرای دوبارهٔ نصب‌کننده، آن فایل و <code>.env</code> را پاک کنید و
      <code>install.php</code> را دوباره آپلود کنید.
    </p>
    <p><a href="/">رفتن به سایت</a></p>
<?php endif; ?>
  </div>

<?php else: ?>

<?php if ($errors !== []): ?>
  <div class="card">
    <h2 class="bad">نصب انجام نشد</h2>
    <?php foreach ($errors as $error): ?>
      <div class="note bad"><?= nl2br(e($error)) ?></div>
    <?php endforeach; ?>
    <p class="muted">مشکل را برطرف کنید و همین فرم را دوباره بفرستید. هیچ داده‌ای نصفه باقی نمی‌ماند؛
      مهاجرت‌ها با {@see migrate} از همان‌جا ادامه می‌یابند.</p>
  </div>
<?php endif; ?>

  <div class="card">
    <h2>۱. بررسی پیش‌نیازها</h2>
    <ul class="req">
      <?php foreach ($requirements as [$label, $pass, $hint]): ?>
        <li>
          <span class="mark <?= $pass ? 'ok' : 'bad' ?>"><?= $pass ? '✓' : '✗' ?></span>
          <span><?= e($label) ?><?php if (! $pass): ?><span class="hint"><?= e($hint) ?></span><?php endif; ?></span>
        </li>
      <?php endforeach; ?>
    </ul>
    <p class="muted" style="margin:12px 0 0">
      مسیر برنامه: <span class="mono"><?= e($appDir) ?></span><br>
      داکیومنتروت: <span class="mono"><?= e($publicDir) ?></span>
    </p>
  </div>

  <div class="card">
    <h2>۲. تنظیمات نصب</h2>
    <form method="post" autocomplete="off">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">

      <label for="site_url">آدرس کامل سایت</label>
      <input id="site_url" type="url" name="site_url" value="<?= e($form['site_url']) ?>" required>
      <span class="muted">بدون اسلش پایانی؛ همان دامنه‌ای که سایت با آن باز می‌شود (مثلاً <span class="mono">https://noudalife.ir</span>).</span>

      <label for="db_driver">دیتابیس</label>
      <select id="db_driver" name="db_driver" onchange="document.getElementById('mysql-box').hidden = this.value !== 'mysql'">
        <option value="sqlite" <?= $form['db_driver'] === 'sqlite' ? 'selected' : '' ?>>SQLite — بدون تنظیم، فایل داخل پوشهٔ برنامه</option>
        <option value="mysql" <?= $form['db_driver'] === 'mysql' ? 'selected' : '' ?>>MySQL / MariaDB — دیتابیس هاست</option>
      </select>

      <div id="mysql-box" <?= $form['db_driver'] === 'mysql' ? '' : 'hidden' ?>>
        <div class="grid">
          <div>
            <label for="db_host">هاست</label>
            <input id="db_host" type="text" name="db_host" value="<?= e($form['db_host']) ?>">
          </div>
          <div>
            <label for="db_port">پورت</label>
            <input id="db_port" type="text" name="db_port" value="<?= e($form['db_port']) ?>">
          </div>
          <div>
            <label for="db_name">نام دیتابیس</label>
            <input id="db_name" type="text" name="db_name" value="<?= e($form['db_name']) ?>">
          </div>
          <div>
            <label for="db_user">کاربر دیتابیس</label>
            <input id="db_user" type="text" name="db_user" value="<?= e($form['db_user']) ?>">
          </div>
          <div>
            <label for="db_pass">رمز دیتابیس</label>
            <input id="db_pass" type="password" name="db_pass" value="">
          </div>
        </div>
        <p class="muted">دیتابیس و کاربر را از بخش MySQL Databases پنل هاست بسازید.</p>
      </div>

      <label for="admin_phone">شمارهٔ همراه مدیر</label>
      <input id="admin_phone" type="text" name="admin_phone" value="<?= e($form['admin_phone']) ?>" dir="ltr" required>
      <span class="muted">ورود به پنل با همین شماره و کد یک‌بارمصرف انجام می‌شود.</span>

      <div class="check">
        <input id="seed" type="checkbox" name="seed" value="1" <?= isset($_POST['seed']) || $_SERVER['REQUEST_METHOD'] !== 'POST' ? 'checked' : '' ?>>
        <label for="seed" style="margin:0;font-weight:500">دادهٔ نمونه (کاتالوگ، مقاله، سوالات متداول، اسلاید) اضافه شود</label>
      </div>

      <label for="sms_key">کلید API کاوه‌نگار <span class="muted">(اختیاری)</span></label>
      <input id="sms_key" type="text" name="sms_key" value="<?= e(post('sms_key')) ?>">
      <div class="grid">
        <div>
          <label for="sms_sender">شمارهٔ فرستنده</label>
          <input id="sms_sender" type="text" name="sms_sender" value="<?= e($form['sms_sender']) ?>">
        </div>
        <div>
          <label for="sms_template">نام قالب کد ورود</label>
          <input id="sms_template" type="text" name="sms_template" value="<?= e(post('sms_template')) ?>">
        </div>
      </div>

      <label for="zarinpal_id">شناسهٔ پذیرندهٔ زرین‌پال <span class="muted">(اختیاری)</span></label>
      <input id="zarinpal_id" type="text" name="zarinpal_id" value="<?= e(post('zarinpal_id')) ?>">
      <div class="check">
        <input id="zarinpal_sandbox" type="checkbox" name="zarinpal_sandbox" value="1" <?= isset($_POST['zarinpal_sandbox']) ? 'checked' : '' ?>>
        <label for="zarinpal_sandbox" style="margin:0;font-weight:500">حالت آزمایشی زرین‌پال (sandbox)</label>
      </div>

      <div class="check">
        <input id="otp_dev" type="checkbox" name="otp_dev" value="1" <?= isset($_POST['otp_dev']) || $_SERVER['REQUEST_METHOD'] !== 'POST' ? 'checked' : '' ?>>
        <label for="otp_dev" style="margin:0;font-weight:500">ورود بدون پیامک تا زمان تنظیم کاوه‌نگار</label>
      </div>
      <div class="note warn">
        با فعال‌بودن این گزینه، کد یک‌بارمصرف در پاسخ API و صفحهٔ ورود نمایش داده می‌شود؛
        یعنی هر کسی می‌تواند با هر شماره‌ای وارد شود. فقط برای راه‌اندازی مناسب است.
        بعد از ثبت کلید کاوه‌نگار، در <code>.env</code> مقدار <code>AUTH_OTP_DEV_MODE</code> را
        <code>0</code> کنید.
      </div>

      <p style="margin-top:18px">
        <button type="submit" <?= $missing !== [] ? 'disabled' : '' ?>>نصب کن</button>
        <?php if ($missing !== []): ?>
          <span class="muted">تا رفع موارد مشخص‌شده با ✗ امکان نصب نیست.</span>
        <?php endif; ?>
      </p>
    </form>
  </div>

  <div class="card">
    <h2>نکته‌ها</h2>
    <p class="muted">
      پس از نصب، فایل <code>install.php</code> خودکار حذف می‌شود. اگر حذف نشد، از File Manager پاکش کنید.<br>
      فایل <code>.env</code> بیرون از <code>public_html</code> ساخته می‌شود و از وب قابل دانلود نیست.<br>
      اگر بعد از نصب خطای ۵۰۰ دیدید، موقتاً در <code>.env</code> مقدار <code>APP_DEBUG=true</code> بگذارید،
      پیام خطا را ببینید و بعد دوباره <code>false</code> کنید.
    </p>
  </div>
<?php endif; ?>
</div>
</body>
</html>
