<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\PaymentGateway;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * بخش‌های تازهٔ پنل: مجوز دانه‌ای، تنظیمات سایت، یکپارچه‌سازی/سئو،
 * درگاه‌های پرداخت و سرویس پیامک.
 */
class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(StoreSeeder::class);

        $this->admin = User::create([
            'phone' => '09123333333',
            'first_name' => 'مدیر',
            'last_name' => 'اصلی',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->operator = User::create([
            'phone' => '09124444444',
            'first_name' => 'اپراتور',
            'last_name' => 'آزمایشی',
            'role' => 'operator',
            'is_active' => true,
        ]);
    }

    public function test_operator_without_permission_is_blocked_from_new_sections(): void
    {
        $token = $this->token($this->operator);

        $this->withToken($token)->getJson('/api/admin/settings')->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/integrations')->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/payment-gateways')->assertForbidden();
        $this->withToken($token)->getJson('/api/admin/sms')->assertForbidden();
    }

    public function test_granted_permission_opens_only_that_section(): void
    {
        $this->admin->adminPermissions()->create(['permission' => 'users']);
        $this->operator->adminPermissions()->create(['permission' => 'users']);

        $token = $this->token($this->operator);

        $this->withToken($token)->getJson('/api/admin/users')->assertOk();
        $this->withToken($token)->getJson('/api/admin/settings')->assertForbidden();
    }

    public function test_only_super_admin_can_change_users(): void
    {
        $this->operator->adminPermissions()->create(['permission' => 'users']);

        $this->withToken($this->token($this->operator))
            ->patchJson("/api/admin/users/{$this->admin->id}", ['role' => 'customer'])
            ->assertForbidden();
    }

    public function test_admin_changes_role_and_permissions_and_session_reflects_them(): void
    {
        $this->withToken($this->token($this->admin))
            ->patchJson("/api/admin/users/{$this->operator->id}", [
                'role' => 'operator',
                'permissions' => ['orders', 'settings'],
            ])
            ->assertOk()
            ->assertJsonPath('user.role', 'operator');

        $this->assertSame(
            ['orders', 'settings'],
            $this->operator->fresh()->effectivePermissions(),
        );

        $this->withToken($this->token($this->operator))
            ->getJson('/api/auth/session')
            ->assertOk()
            ->assertJsonPath('user.permissions', ['orders', 'settings']);
    }

    public function test_admin_cannot_demote_self(): void
    {
        $this->withToken($this->token($this->admin))
            ->patchJson("/api/admin/users/{$this->admin->id}", ['role' => 'customer'])
            ->assertStatus(422);
    }

    public function test_site_settings_are_saved_and_exposed_publicly(): void
    {
        $this->withToken($this->token($this->admin))
            ->patchJson('/api/admin/settings', [
                'settings' => [
                    'site.name' => 'نودهی آزمایشی',
                    'shipping.cost' => 550000,
                ],
            ])
            ->assertOk();

        $this->assertSame('نودهی آزمایشی', Setting::read('site.name'));

        // کلیدها نقطه دارند، پس با assertJsonPath (که نقطه را تودرتو می‌بیند)
        // سنجیده نمی‌شوند.
        $public = $this->getJson('/api/settings/public')->assertOk()->json('settings');

        $this->assertSame('نودهی آزمایشی', $public['site.name']);
        $this->assertSame('550000', $public['shipping.cost']);
    }

    public function test_unknown_setting_key_is_rejected(): void
    {
        $this->withToken($this->token($this->admin))
            ->patchJson('/api/admin/settings', ['settings' => ['sms.apiKey' => 'leak']])
            ->assertStatus(422);
    }

    public function test_seo_ids_are_validated_and_public(): void
    {
        $token = $this->token($this->admin);

        $this->withToken($token)
            ->patchJson('/api/admin/integrations', ['items' => ['seo.ga4' => 'not-a-tag']])
            ->assertStatus(422);

        $this->withToken($token)
            ->patchJson('/api/admin/integrations', ['items' => [
                'seo.ga4' => 'G-ABC12345',
                'seo.gsc' => 'verify-token',
            ]])
            ->assertOk();

        $public = $this->getJson('/api/settings/public')->assertOk()->json('settings');

        $this->assertSame('G-ABC12345', $public['seo.ga4']);
        $this->assertSame('verify-token', $public['seo.gsc']);
    }

    public function test_gateway_secrets_are_encrypted_and_masked(): void
    {
        $gateway = PaymentGateway::query()->where('key', 'online')->firstOrFail();

        $response = $this->withToken($this->token($this->admin))
            ->patchJson("/api/admin/payment-gateways/{$gateway->id}", [
                'merchantId' => 'merchant-1234-abcd',
                'apiKey' => 'secret-key-9999',
                'isActive' => true,
                'isSandbox' => false,
            ])
            ->assertOk();

        $this->assertSame('••••abcd', $response->json('gateway.merchantId'));
        $this->assertSame('••••9999', $response->json('gateway.apiKey'));

        $raw = DB::table('payment_gateways')->where('id', $gateway->id)->first();

        $this->assertStringStartsWith('enc:v1:', (string) $raw->merchant_id);
        $this->assertStringStartsWith('enc:v1:', (string) $raw->api_key);
        $this->assertSame('merchant-1234-abcd', $gateway->fresh()->merchant_id);
    }

    public function test_sending_the_mask_keeps_the_stored_secret(): void
    {
        $gateway = PaymentGateway::query()->where('key', 'online')->firstOrFail();
        $gateway->merchant_id = 'merchant-keep-me';
        $gateway->save();

        $this->withToken($this->token($this->admin))
            ->patchJson("/api/admin/payment-gateways/{$gateway->id}", [
                'merchantId' => '••••e-me',
                'label' => 'پرداخت آنلاین زرین‌پال',
            ])
            ->assertOk();

        $this->assertSame('merchant-keep-me', $gateway->fresh()->merchant_id);
        $this->assertSame('پرداخت آنلاین زرین‌پال', $gateway->fresh()->label);
    }

    public function test_sms_key_is_encrypted_and_shown_masked(): void
    {
        $token = $this->token($this->admin);

        $this->withToken($token)
            ->patchJson('/api/admin/sms', [
                'apiKey' => 'kavenegar-key-4321',
                'sender' => '10008663',
                'otpTemplate' => 'nodehi-otp',
            ])
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/admin/sms')
            ->assertOk()
            ->assertJsonPath('settings.apiKey', '••••4321')
            ->assertJsonPath('settings.source', 'panel')
            ->assertJsonPath('configured', true);

        $raw = DB::table('settings')->where('key', 'sms.apiKey')->first();

        $this->assertStringStartsWith('enc:v1:', (string) $raw->value);
        $this->assertSame('kavenegar-key-4321', Setting::read('sms.apiKey'));
    }

    public function test_sms_test_endpoint_reports_missing_key(): void
    {
        Setting::put('sms.apiKey', 'sms', null, true);

        $this->withToken($this->token($this->admin))
            ->postJson('/api/admin/sms/test', ['phone' => '09120000000'])
            ->assertStatus(422)
            ->assertJsonPath('error', 'کلید کاوه‌نگار ثبت نشده است.');
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
}
