<?php

namespace Tests\Feature;

use App\Models\AuditLog;
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

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(StoreSeeder::class);
    }

    /** ورود با OTP و گرفتن توکن. */
    private function login(string $phone): string
    {
        $code = $this->postJson('/api/auth/otp/request', ['phone' => $phone])->json('devCode');

        return $this->postJson('/api/auth/otp/verify', ['phone' => $phone, 'code' => $code])->json('token');
    }

    private function adminToken(): string
    {
        return $this->login('09120000000');
    }

    private function productPayload(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'یخچال آزمون ۱۲ فوت',
            'slug' => 'test-fridge-12',
            'category' => 'refrigerator',
            'brand' => 'samsung',
            'price' => 25000000,
            'compareAtPrice' => 28000000,
            'stock' => 4,
            'shortDescription' => 'کالای آزمون برای بررسی پنل مدیریت.',
            'description' => 'توضیح کامل کالای آزمون.',
            'highlights' => ['کم‌مصرف', 'گارانتی رسمی'],
            'specs' => [['label' => 'ظرفیت', 'value' => '۱۲ فوت']],
            'images' => [],
            'tags' => ['یخچال'],
            'relatedSlugs' => [],
            'attributes' => ['energy' => 'A++'],
        ];
    }

    private function checkoutPayload(string $phone = '09121234567', int $quantity = 2): array
    {
        return [
            'items' => [['slug' => 'pars-khazar-tea-maker-3l', 'quantity' => $quantity]],
            'firstName' => 'مینا',
            'lastName' => 'احمدی',
            'phone' => $phone,
            'province' => 'تهران',
            'city' => 'تهران',
            'line' => 'خیابان ولیعصر، پلاک ۱۲',
            'paymentMethod' => 'cod',
        ];
    }

    public function test_admin_routes_require_admin_role(): void
    {
        $this->getJson('/api/admin/stats')->assertStatus(401);

        $customer = $this->login('09121234567');
        $this->withHeader('Authorization', 'Bearer ' . $customer)
            ->getJson('/api/admin/stats')
            ->assertStatus(403);

        $this->withHeader('Authorization', 'Bearer ' . $this->adminToken())
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('products.total', 23);
    }

    public function test_admin_can_create_and_partially_update_product(): void
    {
        $token = $this->adminToken();

        $created = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/products', $this->productPayload())
            ->assertCreated()
            ->assertJsonPath('product.slug', 'test-fridge-12');

        $price = $created->json('product.price');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson('/api/admin/products/test-fridge-12', ['name' => 'یخچال آزمون ویرایش‌شده'])
            ->assertOk()
            ->assertJsonPath('product.name', 'یخچال آزمون ویرایش‌شده')
            ->assertJsonPath('product.price', $price)
            ->assertJsonPath('product.stock', 4);

        $this->assertDatabaseHas('audit_logs', ['action' => 'product.created', 'entity_id' => 'test-fridge-12']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'product.updated', 'entity_id' => 'test-fridge-12']);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson('/api/admin/products/test-fridge-12', ['slug' => 'renamed-slug'])
            ->assertStatus(422);
    }

    public function test_product_can_be_created_without_description(): void
    {
        $token = $this->adminToken();
        $payload = $this->productPayload([
            'slug' => 'no-description-product',
            'name' => 'کالای بدون توضیح',
        ]);
        $payload['description'] = null;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/products', $payload)
            ->assertCreated()
            ->assertJsonPath('product.description', '');
    }

    public function test_product_with_order_history_cannot_be_deleted(): void
    {
        $token = $this->adminToken();
        $this->postJson('/api/checkout', $this->checkoutPayload())->assertCreated();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/admin/products/pars-khazar-tea-maker-3l')
            ->assertStatus(409);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/products', $this->productPayload())
            ->assertCreated();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/admin/products/test-fridge-12')
            ->assertOk();

        $this->assertDatabaseMissing('products', ['slug' => 'test-fridge-12']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'product.deleted', 'entity_id' => 'test-fridge-12']);
    }

    public function test_order_status_transitions_and_restock_on_cancel(): void
    {
        $token = $this->adminToken();
        $this->postJson('/api/checkout', $this->checkoutPayload(quantity: 2))->assertCreated();

        $order = Order::firstOrFail();
        $stockBefore = Product::where('slug', 'pars-khazar-tea-maker-3l')->value('stock');
        $number = $order->order_number;

        // انتقال غیرمجاز: pending → delivered
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/admin/orders/{$number}", ['status' => 'delivered'])
            ->assertStatus(422);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/admin/orders/{$number}", [
                'status' => 'processing',
                'trackingCode' => 'TRK-12345',
            ])
            ->assertOk()
            ->assertJsonPath('order.status', 'processing')
            ->assertJsonPath('order.trackingCode', 'TRK-12345');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/admin/orders/{$number}", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('order.status', 'cancelled');

        $this->assertSame($stockBefore + 2, Product::where('slug', 'pars-khazar-tea-maker-3l')->value('stock'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'order.updated', 'entity_id' => $number]);
    }

    public function test_review_approval_updates_product_rating(): void
    {
        $token = $this->adminToken();

        $reviewId = $this->postJson('/api/products/pars-khazar-tea-maker-3l/reviews', [
            'rating' => 4,
            'title' => 'نظر آزمون',
            'body' => 'متن نظر برای بررسی صف بازبینی.',
        ])->assertCreated()->json('review.id');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/admin/reviews?status=pending')
            ->assertOk()
            ->assertJsonPath('items.0.id', $reviewId);

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/admin/reviews/{$reviewId}", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('review.status', 'approved');

        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();
        $this->assertSame(1, $product->review_count);
        $this->assertSame(4.0, (float) $product->rating);
        $this->assertSame('approved', Review::find($reviewId)->status);
    }

    public function test_audit_log_lists_actions_with_metadata(): void
    {
        $token = $this->adminToken();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/admin/products', $this->productPayload())
            ->assertCreated();

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/admin/audit')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertGreaterThanOrEqual(1, $response->json('total'));
        $this->assertSame('product.created', $response->json('items.0.action'));
        $this->assertSame('test-fridge-12', $response->json('items.0.entityId'));
        $this->assertSame('یخچال آزمون ۱۲ فوت', $response->json('items.0.metadata.name'));
        $this->assertSame(User::where('phone', '09120000000')->value('id'), AuditLog::first()->actor_id);
    }
}
