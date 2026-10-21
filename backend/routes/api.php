<?php

use App\Http\Controllers\Api\AdminCouponController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\AdminReviewController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\EngagementController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SettingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API فروشگاه نودهی
|--------------------------------------------------------------------------
| همهٔ مسیرهای فروشگاه زیر /api هستند و فرانت‌اند React از همین قرارداد
| استفاده می‌کند. مسیرهای /api/admin فقط برای نقش admin و operator است.
*/

Route::get('/health', [CatalogController::class, 'health']);

// کاتالوگ
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/by-slugs', [ProductController::class, 'bySlugs']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/products/{slug}/reviews', [ProductController::class, 'reviews']);
Route::post('/products/{slug}/reviews', [ProductController::class, 'storeReview'])
    ->middleware(['throttle:6,1', 'auth.optional']);
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/categories/{slug}', [CatalogController::class, 'category']);
Route::get('/brands', [CatalogController::class, 'brands']);
Route::get('/brands/{slug}', [CatalogController::class, 'brand']);
Route::get('/search', SearchController::class)->middleware('throttle:120,1');

// تنظیمات، پرداخت و کد تخفیف
Route::get('/settings/public', [SettingController::class, 'publicSettings']);
Route::get('/payments/methods', [SettingController::class, 'paymentMethods']);
Route::post('/coupons/validate', [CouponController::class, 'validateCoupon'])->middleware('throttle:30,1');

// محتوای صفحات عمومی
Route::get('/articles', [ContentController::class, 'articles']);
Route::get('/articles/{slug}', [ContentController::class, 'article']);
Route::get('/faqs', [ContentController::class, 'faqs']);
Route::get('/legal', [ContentController::class, 'legalIndex']);
Route::get('/legal/{slug}', [ContentController::class, 'legalPage']);
Route::get('/loyalty', [ContentController::class, 'loyalty']);

// تعامل با مشتری
Route::post('/contact', [EngagementController::class, 'contact'])->middleware('throttle:5,1');
Route::post('/stock-alerts', [EngagementController::class, 'stockAlert'])
    ->middleware(['throttle:10,1', 'auth.optional']);

// سفارش
Route::post('/checkout', CheckoutController::class)->middleware(['throttle:10,1', 'auth.optional']);
Route::post('/orders/track', [OrderController::class, 'track'])->middleware('throttle:20,1');

// پرداخت آنلاین (زرین‌پال)
Route::post('/payments/zarinpal/start', [PaymentController::class, 'start'])
    ->middleware(['throttle:10,1', 'auth.optional']);
Route::get('/payments/zarinpal/callback', [PaymentController::class, 'callback'])
    ->middleware('throttle:60,1');

// احراز هویت
Route::post('/auth/otp/request', [AuthController::class, 'requestOtp'])->middleware('throttle:10,1');
Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:30,1');

Route::middleware('auth.token')->group(function () {
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/account/orders', [OrderController::class, 'myOrders']);
});

// پنل مدیریت — فقط نقش admin و operator
Route::middleware(['auth.token', 'admin'])->prefix('admin')->group(function () {
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::get('/products/{product}', [AdminProductController::class, 'show']);
    Route::match(['put', 'patch'], '/products/{product}', [AdminProductController::class, 'update']);
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy']);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{order}', [AdminOrderController::class, 'show']);
    Route::match(['put', 'patch'], '/orders/{order}', [AdminOrderController::class, 'update']);

    Route::get('/coupons', [AdminCouponController::class, 'index']);
    Route::post('/coupons', [AdminCouponController::class, 'store']);
    Route::match(['put', 'patch'], '/coupons/{coupon}', [AdminCouponController::class, 'update']);
    Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy']);

    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::match(['put', 'patch'], '/reviews/{review}', [AdminReviewController::class, 'update']);
    Route::delete('/reviews/{review}', [AdminReviewController::class, 'destroy']);
});
