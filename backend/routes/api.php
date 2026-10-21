<?php

use App\Http\Controllers\Api\Admin\AdminAuditController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API فروشگاه نودهی
|--------------------------------------------------------------------------
| این فایل جایگزین مسیرهای src/app/api/* نسخه Next.js است.
*/

Route::get('/health', [CatalogController::class, 'health']);

// کاتالوگ
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/by-slugs', [ProductController::class, 'bySlugs']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/products/{slug}/reviews', [ProductController::class, 'reviews']);
Route::post('/products/{slug}/reviews', [ProductController::class, 'storeReview'])
    ->middleware(['throttle:reviews', 'auth.token:optional']);
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/categories/{slug}', [CatalogController::class, 'category']);
Route::get('/brands', [CatalogController::class, 'brands']);
Route::get('/brands/{slug}', [CatalogController::class, 'brand']);
Route::get('/search', SearchController::class);

// تنظیمات و پرداخت
Route::get('/settings/public', [SettingController::class, 'publicSettings']);
Route::get('/payments/methods', [SettingController::class, 'paymentMethods']);

// محتوای صفحات عمومی
Route::get('/articles', [ContentController::class, 'articles']);
Route::get('/articles/{slug}', [ContentController::class, 'article']);
Route::get('/faqs', [ContentController::class, 'faqs']);
Route::get('/legal', [ContentController::class, 'legalIndex']);
Route::get('/legal/{slug}', [ContentController::class, 'legalPage']);
Route::get('/loyalty', [ContentController::class, 'loyalty']);

// تعامل با مشتری
Route::post('/contact', [EngagementController::class, 'contact'])->middleware('throttle:contact');
Route::post('/stock-alerts', [EngagementController::class, 'stockAlert'])
    ->middleware(['throttle:stock-alerts', 'auth.token:optional']);

// سفارش — توکن اختیاری است تا سفارش مهمان ثبت شود و سفارش کاربر واردشده
// به حسابش وصل شود.
Route::post('/checkout', CheckoutController::class)
    ->middleware(['throttle:checkout', 'auth.token:optional']);
Route::post('/orders/track', [OrderController::class, 'track'])->middleware('throttle:contact');

// احراز هویت
Route::post('/auth/otp/request', [AuthController::class, 'requestOtp'])
    ->middleware(['throttle:otp-phone', 'throttle:otp-ip']);
Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp'])
    ->middleware('throttle:otp-ip');

Route::middleware('auth.token')->group(function () {
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/account/orders', [OrderController::class, 'myOrders']);
});

/*
|--------------------------------------------------------------------------
| پنل مدیریت
|--------------------------------------------------------------------------
| همهٔ مسیرها به توکن معتبر و نقش admin/operator نیاز دارند. هر تغییر
| مدیریتی در audit_logs ثبت می‌شود (App\Support\Audit).
*/
Route::middleware(['auth.token', 'admin'])->prefix('admin')->group(function () {
    Route::get('/stats', DashboardController::class);

    Route::get('/products', [AdminProductController::class, 'index']);
    Route::get('/products/{slug}', [AdminProductController::class, 'show']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::patch('/products/{slug}', [AdminProductController::class, 'update']);
    Route::delete('/products/{slug}', [AdminProductController::class, 'destroy']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{orderNumber}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{orderNumber}', [AdminOrderController::class, 'update']);

    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::patch('/reviews/{review}', [AdminReviewController::class, 'update']);

    Route::get('/audit', [AdminAuditController::class, 'index']);
});
