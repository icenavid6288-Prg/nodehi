<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(StoreSeeder::class);

        $this->admin = User::create([
            'phone' => '09121111111',
            'first_name' => 'مدیر',
            'last_name' => 'آزمایشی',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->customer = User::create([
            'phone' => '09122222222',
            'first_name' => 'مشتری',
            'last_name' => 'آزمایشی',
            'role' => 'customer',
            'is_active' => true,
        ]);
    }

    public function test_guests_cannot_access_admin_endpoints(): void
    {
        $this->getJson('/api/admin/products')->assertUnauthorized();
        $this->getJson('/api/admin/orders')->assertUnauthorized();
        $this->getJson('/api/admin/coupons')->assertUnauthorized();
        $this->getJson('/api/admin/reviews')->assertUnauthorized();
    }

    public function test_customers_cannot_access_admin_endpoints(): void
    {
        $this->withToken($this->token($this->customer))
            ->getJson('/api/admin/products')
            ->assertForbidden();
    }

    public function test_admin_lists_products_including_inactive_and_can_search(): void
    {
        $this->makeProduct([
            'slug' => 'hidden-inactive-product',
            'name' => 'محصول غیرفعال ویژه',
            'isActive' => false,
        ]);

        $this->asAdmin()->getJson('/api/admin/products?q=غیرفعال')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('items.0.slug', 'hidden-inactive-product')
            ->assertJsonPath('items.0.isActive', false);
    }

    public function test_admin_can_create_update_and_deactivate_a_product(): void
    {
        $response = $this->asAdmin()->postJson('/api/admin/products', [
            'slug' => 'admin-test-kettle',
            'name' => 'کتری آزمایشی',
            'categorySlug' => 'small-appliance',
            'brandSlug' => 'pars-khazar',
            'price' => 1500000,
            'compareAtPrice' => 1800000,
            'stock' => 7,
            'shortDescription' => 'کتری برقی آزمایشی برای پنل مدیریت.',
            'highlights' => ['جوش سریع'],
            'images' => ['/images/test.jpg'],
            'tags' => ['آزمایشی'],
            'isActive' => true,
        ])->assertCreated();

        $id = $response->json('product.id');
        $this->assertDatabaseHas('products', ['slug' => 'admin-test-kettle', 'stock' => 7]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'product.created', 'entity' => 'product']);

        $this->asAdmin()->patchJson("/api/admin/products/{$id}", [
            'name' => 'کتری آزمایشی ویرایش‌شده',
            'isActive' => false,
        ])->assertOk()
            ->assertJsonPath('product.name', 'کتری آزمایشی ویرایش‌شده')
            ->assertJsonPath('product.isActive', false);

        $this->getJson('/api/products/admin-test-kettle')->assertNotFound();

        // نامک پس از ایجاد قابل تغییر نیست چون سفارش‌ها و نظرها به آن ارجاع دارند.
        $this->asAdmin()->patchJson("/api/admin/products/{$id}", ['slug' => 'new-slug'])
            ->assertStatus(422);

        $this->assertSame('admin-test-kettle', Product::find($id)?->slug);
    }

    public function test_product_creation_validates_category_and_slug(): void
    {
        $this->asAdmin()->postJson('/api/admin/products', $this->productPayload([
            'slug' => 'Invalid Slug',
            'categorySlug' => 'missing-category',
        ]))->assertStatus(422)
            ->assertJsonValidationErrors(['slug', 'categorySlug']);

        $this->asAdmin()->postJson('/api/admin/products', $this->productPayload([
            'slug' => 'pars-khazar-tea-maker-3l',
        ]))->assertStatus(422)->assertJsonValidationErrors(['slug']);
    }

    public function test_product_used_in_orders_cannot_be_deleted(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();
        $this->checkout('cod', 1);

        $this->asAdmin()->deleteJson("/api/admin/products/{$product->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_unused_product_and_its_reviews_are_deleted(): void
    {
        $product = $this->makeProduct([
            'slug' => 'deletable-product',
            'name' => 'محصول قابل حذف',
        ]);

        Review::create([
            'product_slug' => $product->slug,
            'author' => 'مهمان',
            'rating' => 5,
            'title' => 'عالی',
            'body' => 'خیلی خوب بود.',
            'status' => 'approved',
        ]);

        $this->asAdmin()->deleteJson("/api/admin/products/{$product->id}")->assertOk();

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        $this->assertDatabaseMissing('reviews', ['product_slug' => 'deletable-product']);
    }

    public function test_admin_can_list_and_filter_orders(): void
    {
        $this->checkout('cod', 1);

        $this->asAdmin()->getJson('/api/admin/orders?status=processing')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('items.0.status', 'processing')
            ->assertJsonPath('items.0.itemCount', 1);

        $this->asAdmin()->getJson('/api/admin/orders?q=09121234567')
            ->assertOk()
            ->assertJsonPath('total', 1);

        $this->asAdmin()->getJson('/api/admin/orders?status=pending')
            ->assertOk()
            ->assertJsonPath('total', 0);
    }

    public function test_order_status_moves_forward_with_tracking_and_delivery(): void
    {
        $order = $this->checkout('cod', 1);
        $id = $order->id;

        $this->asAdmin()->patchJson("/api/admin/orders/{$id}", [
            'status' => 'shipped',
            'trackingCode' => 'TRK-12345',
        ])->assertOk()
            ->assertJsonPath('order.status', 'shipped')
            ->assertJsonPath('order.trackingCode', 'TRK-12345');

        $this->assertNotNull($order->fresh()->shipped_at);

        $this->asAdmin()->patchJson("/api/admin/orders/{$id}", ['status' => 'delivered'])
            ->assertOk()
            ->assertJsonPath('order.status', 'delivered');

        $fresh = $order->fresh();
        $this->assertNotNull($fresh->delivered_at);
        $this->assertNotNull($fresh->paid_at);

        $this->asAdmin()->patchJson("/api/admin/orders/{$id}", ['status' => 'cancelled'])
            ->assertStatus(422);
    }

    public function test_invalid_order_transition_is_rejected(): void
    {
        $order = $this->checkout('online', 1);
        $this->assertSame('pending', $order->status);

        $this->asAdmin()->patchJson("/api/admin/orders/{$order->id}", ['status' => 'delivered'])
            ->assertStatus(422);

        $this->assertSame('pending', $order->fresh()->status);
    }

    public function test_cancelling_cash_order_restocks_only_once(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();
        $stockBefore = $product->stock;

        $order = $this->checkout('cod', 2);
        $this->assertSame($stockBefore - 2, $product->fresh()->stock);

        $this->asAdmin()->patchJson("/api/admin/orders/{$order->id}", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('order.status', 'cancelled');

        $this->assertSame($stockBefore, $product->fresh()->stock);

        // درخواست تکراری وضعیت را عوض نمی‌کند و موجودی دوباره اضافه نمی‌شود.
        $this->asAdmin()->patchJson("/api/admin/orders/{$order->id}", ['status' => 'cancelled'])
            ->assertOk();

        $this->assertSame($stockBefore, $product->fresh()->stock);
    }

    public function test_order_details_include_customer_and_items(): void
    {
        $order = $this->checkout('cod', 1);

        $this->asAdmin()->getJson("/api/admin/orders/{$order->id}")
            ->assertOk()
            ->assertJsonPath('order.orderNumber', $order->order_number)
            ->assertJsonPath('order.shippingAddress.city', 'تهران')
            ->assertJsonPath('order.items.0.slug', 'pars-khazar-tea-maker-3l');
    }

    public function test_admin_can_create_update_and_delete_coupons(): void
    {
        $response = $this->asAdmin()->postJson('/api/admin/coupons', [
            'code' => 'welcome15',
            'label' => 'تخفیف آزمایشی',
            'percent' => 15,
            'minSubtotal' => 1000000,
            'maxUses' => 100,
            'startsAt' => '2026-01-01',
            'expiresAt' => '2026-12-31',
            'isActive' => true,
        ])->assertCreated();

        $id = $response->json('coupon.id');
        $this->assertSame('WELCOME15', $response->json('coupon.code'));
        $this->assertSame('2026-12-31', $response->json('coupon.expiresAt'));

        $this->asAdmin()->postJson('/api/admin/coupons', [
            'code' => 'WELCOME15',
            'label' => 'تکراری',
            'percent' => 5,
        ])->assertStatus(422)->assertJsonValidationErrors(['code']);

        $this->asAdmin()->patchJson("/api/admin/coupons/{$id}", [
            'percent' => 20,
            'isActive' => false,
        ])->assertOk()
            ->assertJsonPath('coupon.percent', 20)
            ->assertJsonPath('coupon.isActive', false);

        $this->asAdmin()->deleteJson("/api/admin/coupons/{$id}")->assertOk();
        $this->assertDatabaseMissing('coupons', ['id' => $id]);
    }

    public function test_coupon_cannot_lower_usage_cap_below_used_count(): void
    {
        $coupon = Coupon::create([
            'code' => 'USEDCAP',
            'label' => 'سقف استفاده',
            'percent' => 10,
            'max_uses' => 50,
            'used_count' => 12,
            'is_active' => true,
        ]);

        $this->asAdmin()->patchJson("/api/admin/coupons/{$coupon->id}", ['maxUses' => 10])
            ->assertStatus(422);

        $this->asAdmin()->postJson('/api/admin/coupons', [
            'code' => 'BADPERCENT',
            'label' => 'نامعتبر',
            'percent' => 0,
        ])->assertStatus(422);
    }

    public function test_admin_moderates_reviews_and_product_stats_follow(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();

        $reviewId = $this->postJson("/api/products/{$product->slug}/reviews", [
            'rating' => 5,
            'title' => 'کیفیت عالی',
            'body' => 'بعد از دو ماه استفاده هنوز بی‌نقص کار می‌کند.',
            'author' => 'مشتری آزمایشی',
        ])->assertCreated()->json('review.id');

        $this->asAdmin()->getJson('/api/admin/reviews?status=pending')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('items.0.productSlug', $product->slug);

        $this->asAdmin()->patchJson("/api/admin/reviews/{$reviewId}", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('review.status', 'approved');

        $product->refresh();
        $this->assertSame(1, $product->review_count);
        $this->assertEquals(5, $product->rating);

        $this->asAdmin()->patchJson("/api/admin/reviews/{$reviewId}", ['status' => 'rejected'])
            ->assertOk();

        $product->refresh();
        $this->assertSame(0, $product->review_count);
        $this->assertEquals(0, $product->rating);

        $this->asAdmin()->deleteJson("/api/admin/reviews/{$reviewId}")->assertOk();
        $this->assertDatabaseMissing('reviews', ['id' => $reviewId]);
    }

    public function test_review_moderation_is_validated(): void
    {
        $review = Review::create([
            'product_slug' => 'pars-khazar-tea-maker-3l',
            'author' => 'مهمان',
            'rating' => 4,
            'title' => 'خوب',
            'body' => 'مناسب بود.',
            'status' => 'pending',
        ]);

        $this->asAdmin()->patchJson("/api/admin/reviews/{$review->id}", ['status' => 'published'])
            ->assertStatus(422);
    }

    private function token(User $user): string
    {
        $plain = bin2hex(random_bytes(16));

        AuthSession::create([
            'token_hash' => hash('sha256', $plain),
            'user_id' => $user->id,
            'expires_at' => now()->addDay(),
            'user_agent' => 'phpunit',
            'ip' => '127.0.0.1',
        ]);

        return $plain;
    }

    private function asAdmin(): static
    {
        return $this->withToken($this->token($this->admin));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function productPayload(array $overrides = []): array
    {
        return array_merge([
            'slug' => 'admin-created-product',
            'name' => 'محصول آزمایشی',
            'categorySlug' => 'small-appliance',
            'brandSlug' => 'pars-khazar',
            'price' => 2500000,
            'stock' => 10,
            'shortDescription' => 'توضیح کوتاه محصول آزمایشی.',
            'isActive' => true,
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function makeProduct(array $overrides = []): Product
    {
        $data = $this->productPayload($overrides);

        return Product::create([
            'slug' => $data['slug'],
            'name' => $data['name'],
            'category_slug' => $data['categorySlug'],
            'brand_slug' => $data['brandSlug'],
            'price' => $data['price'],
            'stock' => $data['stock'],
            'short_description' => $data['shortDescription'],
            'is_active' => $data['isActive'],
        ]);
    }

    private function checkout(string $paymentMethod = 'cod', int $quantity = 1): Order
    {
        $payload = [
            'items' => [['slug' => 'pars-khazar-tea-maker-3l', 'quantity' => $quantity]],
            'firstName' => 'نوید',
            'lastName' => 'احمدی',
            'phone' => '09121234567',
            'province' => 'تهران',
            'city' => 'تهران',
            'line' => 'خیابان ولیعصر',
            'paymentMethod' => $paymentMethod,
        ];

        if ($paymentMethod === 'installment') {
            $payload['items'][0]['quantity'] = 8;
        }

        return Order::where('order_number', $this->postJson('/api/checkout', $payload)
            ->assertCreated()
            ->json('order.orderNumber'))->firstOrFail();
    }
}
