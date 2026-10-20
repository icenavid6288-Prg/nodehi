<?php

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
Route::post('/products/{slug}/reviews', [ProductController::class, 'storeReview']);
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
Route::post('/contact', [EngagementController::class, 'contact']);
Route::post('/stock-alerts', [EngagementController::class, 'stockAlert']);

// سفارش
Route::post('/checkout', CheckoutController::class);
Route::post('/orders/track', [OrderController::class, 'track']);

// احراز هویت
Route::post('/auth/otp/request', [AuthController::class, 'requestOtp']);
Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp']);

Route::middleware('auth.token')->group(function () {
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/account/orders', [OrderController::class, 'myOrders']);
});
