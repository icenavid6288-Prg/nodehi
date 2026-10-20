<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(StoreSeeder::class);
    }

    public function test_health_reports_catalog_size(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('catalogSize', 23);
    }

    public function test_products_can_be_filtered_by_category(): void
    {
        $response = $this->getJson('/api/products?category=refrigerator')->assertOk();

        $items = $response->json('items');
        $this->assertNotEmpty($items);
        foreach ($items as $item) {
            $this->assertSame('refrigerator', $item['category']);
        }
    }

    public function test_product_detail_returns_404_for_unknown_slug(): void
    {
        $this->getJson('/api/products/does-not-exist')->assertNotFound();
    }

    public function test_products_by_slugs_preserve_requested_order(): void
    {
        $slugs = 'pars-khazar-tea-maker-3l,does-not-exist,another-missing';

        // فقط کالای موجود برمی‌گردد و نامک نامعتبر بی‌صدا حذف می‌شود.
        $response = $this->getJson('/api/products/by-slugs?slugs=' . urlencode($slugs))->assertOk();

        $response->assertJsonPath('ok', true);

        $items = $response->json('items');
        $this->assertCount(1, $items);
        $this->assertSame('pars-khazar-tea-maker-3l', $items[0]['slug']);
        $this->assertArrayHasKey('specs', $items[0], 'جزئیات باید برای جدول مقایسه مشخصات را هم داشته باشد.');
        $this->assertArrayHasKey('attributes', $items[0]);
    }

    public function test_products_by_slugs_returns_empty_for_blank_query(): void
    {
        $this->getJson('/api/products/by-slugs')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('items', []);
    }

    public function test_checkout_applies_coupon_and_decrements_stock(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();
        $stockBefore = $product->stock;

        $response = $this->postJson('/api/checkout', [
            'items' => [['slug' => $product->slug, 'quantity' => 2]],
            'firstName' => 'نوید',
            'lastName' => 'احمدی',
            'phone' => '09121234567',
            'province' => 'تهران',
            'city' => 'تهران',
            'line' => 'خیابان ولیعصر',
            'paymentMethod' => 'cod',
            'couponCode' => 'NODEHI10',
        ])->assertCreated();

        $subtotal = $product->price * 2;
        $discount = (int) floor($subtotal * 10 / 100);
        $expectedTotal = $subtotal - $discount + ($subtotal >= 20_000_000 ? 0 : 450_000);

        $response->assertJsonPath('order.subtotal', $subtotal)
            ->assertJsonPath('order.discount', $discount)
            ->assertJsonPath('order.total', $expectedTotal);

        $this->assertSame($stockBefore - 2, $product->fresh()->stock);
        $this->assertSame(1, Order::count());
    }

    public function test_checkout_rejects_quantity_above_stock(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();

        $this->postJson('/api/checkout', [
            'items' => [['slug' => $product->slug, 'quantity' => $product->stock + 10]],
            'firstName' => 'نوید',
            'lastName' => 'احمدی',
            'phone' => '09121234567',
            'province' => 'تهران',
            'city' => 'تهران',
            'line' => 'خیابان ولیعصر',
            'paymentMethod' => 'cod',
        ])->assertStatus(422);

        $this->assertSame(0, Order::count());
    }

    public function test_otp_login_creates_session_token(): void
    {
        $request = $this->postJson('/api/auth/otp/request', ['phone' => '09121234567'])
            ->assertOk()
            ->json();

        $this->assertArrayHasKey('devCode', $request);

        $verify = $this->postJson('/api/auth/otp/verify', [
            'phone' => '09121234567',
            'code' => $request['devCode'],
        ])->assertOk()->json();

        $this->assertNotEmpty($verify['token']);

        $this->withHeader('Authorization', 'Bearer ' . $verify['token'])
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('user.phone', '09121234567');
    }

    public function test_order_can_be_tracked_with_number_and_phone(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();

        $orderNumber = $this->postJson('/api/checkout', [
            'items' => [['slug' => $product->slug, 'quantity' => 1]],
            'firstName' => 'نوید',
            'lastName' => 'احمدی',
            'phone' => '09121234567',
            'province' => 'تهران',
            'city' => 'تهران',
            'line' => 'خیابان ولیعصر',
            'paymentMethod' => 'cod',
        ])->assertCreated()->json('order.orderNumber');

        $this->postJson('/api/orders/track', [
            'orderNumber' => $orderNumber,
            'phone' => '09121234567',
        ])->assertOk()->assertJsonPath('order.orderNumber', $orderNumber);

        $this->postJson('/api/orders/track', [
            'orderNumber' => $orderNumber,
            'phone' => '09120000000',
        ])->assertNotFound();
    }
}
