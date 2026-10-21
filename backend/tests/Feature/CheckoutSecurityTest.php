<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(StoreSeeder::class);
    }

    /** @return array<string, mixed> */
    private function orderPayload(array $overrides = []): array
    {
        return array_merge([
            'items' => [['slug' => 'pars-khazar-tea-maker-3l', 'quantity' => 1]],
            'firstName' => 'نوید',
            'lastName' => 'احمدی',
            'phone' => '09121234567',
            'province' => 'تهران',
            'city' => 'تهران',
            'line' => 'خیابان ولیعصر، پلاک ۱۲',
            'paymentMethod' => 'cod',
        ], $overrides);
    }

    public function test_otp_requests_are_limited_per_phone(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/auth/otp/request', ['phone' => '09121234567'])->assertOk();
        }

        $this->postJson('/api/auth/otp/request', ['phone' => '09121234567'])
            ->assertStatus(429);
    }

    public function test_new_otp_invalidates_the_previous_code(): void
    {
        $first = $this->postJson('/api/auth/otp/request', ['phone' => '09121234567'])
            ->assertOk()
            ->json('devCode');

        $second = $this->postJson('/api/auth/otp/request', ['phone' => '09121234567'])
            ->assertOk()
            ->json('devCode');

        $this->postJson('/api/auth/otp/verify', [
            'phone' => '09121234567',
            'code' => $first,
        ])->assertStatus(422);

        $this->postJson('/api/auth/otp/verify', [
            'phone' => '09121234567',
            'code' => $second,
        ])->assertOk();
    }

    public function test_idempotency_key_does_not_expose_another_guests_order(): void
    {
        $payload = $this->orderPayload(['idempotencyKey' => 'shared-key']);

        $this->postJson('/api/checkout', $payload)->assertCreated();

        // همان کلید با شمارهٔ دیگر نه سفارش قبلی را می‌بیند و نه سفارش تازه می‌سازد
        $this->postJson('/api/checkout', array_merge($payload, ['phone' => '09129999999']))
            ->assertStatus(409);

        $this->assertSame(1, Order::count());

        // همان شماره و همان کلید: پاسخ تکراری، بدون ساخت سفارش تازه
        $this->postJson('/api/checkout', $payload)
            ->assertOk()
            ->assertJsonPath('duplicate', true);

        $this->assertSame(1, Order::count());
    }

    public function test_online_order_does_not_reserve_stock_before_payment(): void
    {
        $product = Product::where('slug', 'pars-khazar-tea-maker-3l')->firstOrFail();
        $stockBefore = $product->stock;

        $this->postJson('/api/checkout', $this->orderPayload(['paymentMethod' => 'online']))
            ->assertCreated()
            ->assertJsonPath('order.status', 'pending');

        $this->assertSame($stockBefore, $product->fresh()->stock);
    }

    public function test_installment_requires_a_minimum_total(): void
    {
        $this->postJson('/api/checkout', $this->orderPayload(['paymentMethod' => 'installment']))
            ->assertStatus(422);

        $this->assertSame(0, Order::count());
    }
}
