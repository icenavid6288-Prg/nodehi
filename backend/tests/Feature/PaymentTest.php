<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PaymentGateway;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * پرداخت آنلاین زرین‌پال.
 *
 * شبکه با `Http::fake` شبیه‌سازی می‌شود؛ این آزمون‌ها به درگاه واقعی وصل
 * نمی‌شوند و فقط قرارداد پاسخ زرین‌پال را بازتولید می‌کنند.
 */
class PaymentTest extends TestCase
{
    use RefreshDatabase;

    private const MERCHANT = '11111111-2222-3333-4444-555555555555';

    private const AUTHORITY = 'A00000000000000000000000000000001234';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(StoreSeeder::class);

        config([
            'services.zarinpal.merchant_id' => self::MERCHANT,
            'services.zarinpal.sandbox' => true,
            'services.zarinpal.callback_url' => 'https://nodehi.test/api/payments/zarinpal/callback',
        ]);
    }

    /** @param  array<string, mixed>  $overrides */
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
            'paymentMethod' => 'online',
        ], $overrides);
    }

    private function fakeRequest(): void
    {
        Http::fake([
            '*/request.json' => Http::response([
                'data' => [
                    'code' => 100,
                    'message' => 'Success',
                    'authority' => self::AUTHORITY,
                    'fee_type' => 'Merchant',
                    'fee' => 100,
                ],
                'errors' => [],
            ]),
        ]);
    }

    /** @param  array<string, mixed>  $data */
    private function fakeVerify(array $data): void
    {
        Http::fake(['*/verify.json' => Http::response(['data' => $data, 'errors' => []])]);
    }

    private function makeOrder(array $overrides = []): Order
    {
        return Order::create(array_merge([
            'order_number' => 'ND-261021-TEST01',
            'status' => 'pending',
            'payment_method' => 'online',
            'shipping_method' => 'standard',
            'subtotal' => 4_200_000,
            'discount' => 0,
            'shipping' => 450_000,
            'total' => 4_650_000,
            'customer_first_name' => 'نوید',
            'customer_last_name' => 'احمدی',
            'customer_phone' => '09121234567',
            'shipping_province' => 'تهران',
            'shipping_city' => 'تهران',
            'shipping_line' => 'خیابان ولیعصر',
            'payment_authority' => self::AUTHORITY,
        ], $overrides));
    }

    // ─────────────────────────  شروع پرداخت  ─────────────────────────

    public function test_checkout_starts_online_payment_and_returns_gateway_url(): void
    {
        $this->fakeRequest();

        $response = $this->postJson('/api/checkout', $this->orderPayload())->assertCreated();

        $response->assertJsonPath('payment.type', 'online')
            ->assertJsonPath('payment.gateway', 'zarinpal')
            ->assertJsonPath('payment.sandbox', true)
            ->assertJsonPath('payment.message', null);

        $redirectUrl = $response->json('payment.redirectUrl');
        $this->assertSame('https://sandbox.zarinpal.com/pg/StartPay/'.self::AUTHORITY, $redirectUrl);

        $order = Order::firstOrFail();
        $this->assertSame(self::AUTHORITY, $order->payment_authority);
        $this->assertSame($redirectUrl, $order->payment_redirect_url);

        // مبلغ ارسالی ریالی است و پارامتر currency عمداً فرستاده نمی‌شود.
        Http::assertSent(function ($request) use ($order) {
            return str_ends_with($request->url(), '/request.json')
                && $request['merchant_id'] === self::MERCHANT
                && $request['amount'] === $order->total * 10
                && $request['callback_url'] === 'https://nodehi.test/api/payments/zarinpal/callback'
                && ! isset($request['currency']);
        });
    }

    public function test_repeated_checkout_reuses_the_existing_authority(): void
    {
        $this->fakeRequest();

        $payload = $this->orderPayload(['idempotencyKey' => 'pay-once']);

        $this->postJson('/api/checkout', $payload)->assertCreated();
        $second = $this->postJson('/api/checkout', $payload)->assertOk();

        $second->assertJsonPath('duplicate', true)
            ->assertJsonPath('payment.redirectUrl', 'https://sandbox.zarinpal.com/pg/StartPay/'.self::AUTHORITY);

        // فقط یک تراکنش در درگاه ساخته می‌شود، نه یکی در ازای هر کلیک.
        Http::assertSentCount(1);
    }

    public function test_checkout_keeps_the_order_when_gateway_is_not_configured(): void
    {
        config(['services.zarinpal.merchant_id' => null]);

        $this->postJson('/api/checkout', $this->orderPayload())
            ->assertCreated()
            ->assertJsonPath('payment.redirectUrl', null)
            ->assertJsonPath('order.status', 'pending');

        $this->assertStringContainsString('شناسه پذیرنده', (string) $this->postJson('/api/checkout', $this->orderPayload())->json('payment.message'));
    }

    public function test_start_endpoint_requires_order_ownership(): void
    {
        $this->fakeRequest();
        $this->makeOrder();

        $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => 'ND-261021-TEST01',
            'phone' => '09999999999',
        ])->assertNotFound();

        $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => 'ND-261021-TEST01',
        ])->assertNotFound();
    }

    public function test_start_endpoint_returns_the_same_authority_for_retry(): void
    {
        $this->fakeRequest();
        $order = $this->makeOrder(['payment_authority' => null]);

        $first = $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => $order->order_number,
            'phone' => '09121234567',
        ])->assertOk();

        $first->assertJsonPath('redirectUrl', 'https://sandbox.zarinpal.com/pg/StartPay/'.self::AUTHORITY)
            ->assertJsonPath('reused', false);

        $second = $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => $order->order_number,
            'phone' => '09121234567',
        ])->assertOk();

        $second->assertJsonPath('authority', self::AUTHORITY)->assertJsonPath('reused', true);
        Http::assertSentCount(1);
    }

    public function test_start_endpoint_reports_paid_and_cancelled_orders(): void
    {
        $this->makeOrder(['status' => 'paid']);
        $this->makeOrder(['order_number' => 'ND-261021-TEST02', 'status' => 'cancelled', 'payment_authority' => null]);

        $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => 'ND-261021-TEST01',
            'phone' => '09121234567',
        ])->assertStatus(409)->assertJsonPath('state', 'already_paid');

        $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => 'ND-261021-TEST02',
            'phone' => '09121234567',
        ])->assertStatus(409)->assertJsonPath('state', 'cancelled');
    }

    public function test_disabled_gateway_blocks_new_payments_but_not_verification(): void
    {
        PaymentGateway::where('key', 'online')->update(['is_active' => false]);

        $this->postJson('/api/payments/zarinpal/start', [
            'orderNumber' => $this->makeOrder()->order_number,
            'phone' => '09121234567',
        ])->assertStatus(503)->assertJsonPath('state', 'gateway_unavailable');

        $this->fakeVerify(['code' => 100, 'ref_id' => '555', 'card_pan' => '6037991111112222']);

        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK')
            ->assertOk()
            ->assertJsonPath('state', 'paid');
    }

    // ─────────────────────────  بازگشت و verify  ─────────────────────────

    public function test_callback_verifies_and_marks_order_paid(): void
    {
        $order = $this->makeOrder();
        $this->fakeVerify(['code' => 100, 'ref_id' => '987654321', 'card_pan' => '6037991234567890']);

        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('state', 'paid')
            ->assertJsonPath('orderNumber', $order->order_number)
            ->assertJsonPath('refId', '987654321');

        $fresh = $order->fresh();
        $this->assertSame('paid', $fresh->status);
        $this->assertNotNull($fresh->paid_at);
        $this->assertSame('987654321', $fresh->payment_ref_id);
        $this->assertSame('****7890', $fresh->payment_card_pan);

        $this->assertDatabaseHas('audit_logs', ['action' => 'order.paid', 'entity_id' => (string) $order->id]);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/verify.json')
            && $request['amount'] === $order->total * 10
            && $request['authority'] === self::AUTHORITY);
    }

    public function test_repeated_callback_is_idempotent_and_skips_the_network(): void
    {
        $order = $this->makeOrder();
        $this->fakeVerify(['code' => 100, 'ref_id' => '123', 'card_pan' => '6037991234567890']);

        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK')
            ->assertOk()
            ->assertJsonPath('state', 'paid');

        $second = $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK');

        $second->assertOk()
            ->assertJsonPath('state', 'already_paid')
            ->assertJsonPath('refId', '123');

        // سفارش تسویه‌شده دوباره وریفای نمی‌شود.
        Http::assertSentCount(1);
        $this->assertSame(1, AuditLog::where('action', 'order.paid')->count());
    }

    public function test_already_verified_code_101_counts_as_success(): void
    {
        $order = $this->makeOrder();
        $this->fakeVerify(['code' => 101, 'ref_id' => '101010', 'card_pan' => '6037990000001111']);

        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK')
            ->assertOk()
            ->assertJsonPath('state', 'paid');

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame('****1111', $order->fresh()->payment_card_pan);
    }

    public function test_failed_verification_keeps_order_pending_and_frees_the_authority(): void
    {
        $order = $this->makeOrder();
        $this->fakeVerify(['code' => -51, 'message' => 'Session is not valid']);

        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=NOK')
            ->assertOk()
            ->assertJsonPath('state', 'failed')
            ->assertJsonPath('code', -51);

        $fresh = $order->fresh();
        $this->assertSame('pending', $fresh->status);
        $this->assertNull($fresh->payment_authority);
        $this->assertDatabaseHas('audit_logs', ['action' => 'payment.failed']);
    }

    public function test_network_failure_keeps_the_authority_for_a_retry(): void
    {
        $order = $this->makeOrder();

        Http::fake(fn () => throw new ConnectionException('timeout'));

        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK')
            ->assertOk()
            ->assertJsonPath('state', 'unverifiable');

        $fresh = $order->fresh();
        $this->assertSame('pending', $fresh->status);
        // ممکن است پول رسیده باشد؛ پاک‌کردن authority یعنی گم‌کردن رد پول.
        $this->assertSame(self::AUTHORITY, $fresh->payment_authority);
    }

    public function test_verify_result_overrides_a_failed_gateway_status(): void
    {
        $order = $this->makeOrder();
        $this->fakeVerify(['code' => 100, 'ref_id' => '777']);

        // به Status=NOK تکیه نمی‌کنیم؛ تنها منبع حقیقت پاسخ verify است.
        $this->getJson('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=NOK')
            ->assertOk()
            ->assertJsonPath('state', 'paid');

        $this->assertSame('paid', $order->fresh()->status);
    }

    public function test_unknown_authority_is_reported_without_a_network_call(): void
    {
        Http::fake();

        $this->getJson('/api/payments/zarinpal/callback?Authority=UNKNOWN-AUTHORITY&Status=OK')
            ->assertOk()
            ->assertJsonPath('state', 'unknown');

        Http::assertNothingSent();
    }

    public function test_callback_redirects_the_browser_to_the_result_page(): void
    {
        $this->makeOrder();
        $this->fakeVerify(['code' => 100, 'ref_id' => '42']);

        $this->get('/api/payments/zarinpal/callback?Authority='.self::AUTHORITY.'&Status=OK')
            ->assertStatus(303)
            ->assertRedirectContains('/checkout/result?state=paid');
    }
}
