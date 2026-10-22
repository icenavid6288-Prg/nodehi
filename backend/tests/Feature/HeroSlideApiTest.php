<?php

namespace Tests\Feature;

use App\Models\AuthSession;
use App\Models\HeroSlide;
use App\Models\User;
use Database\Seeders\HeroSlideSeeder;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * اسلایدهای هیرو: API عمومی برای فروشگاه و API ادمین برای ویرایش از پنل.
 */
class HeroSlideApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(StoreSeeder::class);
        $this->seed(HeroSlideSeeder::class);

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

    public function test_public_endpoint_returns_slides_in_display_order(): void
    {
        $response = $this->getJson('/api/hero-slides')->assertOk();

        $response->assertJsonPath('ok', true);
        $titles = array_column($response->json('items'), 'title');

        $this->assertCount(3, $titles);
        $this->assertSame('لوازم خانگی مطمئن،', $titles[0]);
        $this->assertSame('تخفیف پایان فصل،', $titles[1]);
        $this->assertSame('خرید اقساطی بدون دغدغه،', $titles[2]);
        $this->assertSame('/hero/promise.jpg', $response->json('items.0.image'));
    }

    public function test_inactive_slides_are_hidden_from_the_store(): void
    {
        HeroSlide::query()->where('sort_order', 2)->update(['is_active' => false]);

        $response = $this->getJson('/api/hero-slides')->assertOk();

        $this->assertCount(2, $response->json('items'));
        $this->assertNotContains('تخفیف پایان فصل،', array_column($response->json('items'), 'title'));
    }

    public function test_guests_cannot_manage_slides(): void
    {
        $this->getJson('/api/admin/hero-slides')->assertUnauthorized();
        $this->postJson('/api/admin/hero-slides', [])->assertUnauthorized();
    }

    public function test_customers_cannot_manage_slides(): void
    {
        $this->withToken($this->token($this->customer))
            ->getJson('/api/admin/hero-slides')
            ->assertForbidden();
    }

    public function test_admin_sees_all_slides_even_inactive_ones(): void
    {
        HeroSlide::query()->where('sort_order', 1)->update(['is_active' => false]);

        $response = $this->asAdmin()->getJson('/api/admin/hero-slides')->assertOk();

        $this->assertCount(3, $response->json('items'));
        $this->assertFalse($response->json('items.0.isActive'));
        $this->assertArrayHasKey('sortOrder', $response->json('items.0'));
    }

    public function test_admin_can_create_a_slide_and_it_shows_up_publicly(): void
    {
        $response = $this->asAdmin()->postJson('/api/admin/hero-slides', [
            'title' => 'ارسال فوری،',
            'titleAccent' => 'همان روز در تهران',
            'badge' => 'تازه',
            'text' => 'سفارش تا ساعت ۱۲ همان روز ارسال می‌شود.',
            'primaryLabel' => 'شروع خرید',
            'primaryUrl' => '/shop',
            'features' => ['ارسال روز', 'بسته‌بندی ایمن'],
            'theme' => 'accent',
            'isActive' => true,
        ])->assertCreated();

        $response->assertJsonPath('slide.title', 'ارسال فوری،');
        $response->assertJsonPath('slide.sortOrder', 4);
        $this->assertSame(['ارسال روز', 'بسته‌بندی ایمن'], $response->json('slide.features'));

        $public = $this->getJson('/api/hero-slides')->assertOk();
        $this->assertCount(4, $public->json('items'));
    }

    public function test_partial_update_keeps_other_fields_intact(): void
    {
        $slide = HeroSlide::query()->ordered()->firstOrFail();

        $this->asAdmin()
            ->patchJson("/api/admin/hero-slides/{$slide->id}", ['title' => 'تیتر تازه'])
            ->assertOk()
            ->assertJsonPath('slide.title', 'تیتر تازه');

        $fresh = $slide->fresh();
        $this->assertSame('تیتر تازه', $fresh->title);
        $this->assertSame('با ارسال سریع و نصب رایگان', $fresh->title_accent);
        $this->assertSame('/shop', $fresh->primary_url);
    }

    public function test_validation_rejects_bad_links_and_extra_features(): void
    {
        $this->asAdmin()->postJson('/api/admin/hero-slides', [
            'title' => 'تیتر',
            'text' => 'متن',
            'primaryLabel' => 'دکمه',
            'primaryUrl' => 'shop',
        ])->assertStatus(422)->assertJsonValidationErrors('primaryUrl');

        $this->asAdmin()->postJson('/api/admin/hero-slides', [
            'title' => 'تیتر',
            'text' => 'متن',
            'primaryLabel' => 'دکمه',
            'primaryUrl' => '/shop',
            'features' => ['یک', 'دو', 'سه', 'چهار'],
        ])->assertStatus(422)->assertJsonValidationErrors('features');

        $this->asAdmin()->postJson('/api/admin/hero-slides', [
            'title' => 'تیتر',
            'text' => 'متن',
            'primaryLabel' => 'دکمه',
            'primaryUrl' => '/shop',
            'secondaryLabel' => 'دکمهٔ دوم',
        ])->assertStatus(422)->assertJsonValidationErrors('secondaryUrl');
    }

    public function test_admin_can_reorder_slides_in_one_request(): void
    {
        $ids = HeroSlide::query()->ordered()->pluck('id')->all();
        $reversed = array_reverse($ids);

        $response = $this->asAdmin()
            ->postJson('/api/admin/hero-slides/reorder', ['ids' => $reversed])
            ->assertOk();

        $this->assertSame($reversed, array_column($response->json('items'), 'id'));

        $public = $this->getJson('/api/hero-slides')->assertOk();
        $this->assertSame($reversed, array_column($public->json('items'), 'id'));
    }

    public function test_admin_can_delete_a_slide(): void
    {
        $slide = HeroSlide::query()->ordered()->get()->last();

        $this->asAdmin()->deleteJson("/api/admin/hero-slides/{$slide->id}")->assertOk();

        $this->assertDatabaseMissing('hero_slides', ['id' => $slide->id]);
        $this->assertCount(2, $this->getJson('/api/hero-slides')->json('items'));
    }

    public function test_admin_can_upload_a_slide_image(): void
    {
        Storage::fake('uploads');

        $response = $this->asAdmin()->withHeaders(['Accept' => 'application/json'])->post('/api/admin/hero-slides/image', [
            'image' => $this->pngUpload('hero.png'),
        ])->assertOk();

        $url = $response->json('url');
        $this->assertStringStartsWith('/uploads/hero/', $url);
        Storage::disk('uploads')->assertExists(str_replace('/uploads/', '', $url));
    }

    public function test_upload_rejects_non_image_files(): void
    {
        Storage::fake('uploads');

        $this->asAdmin()->withHeaders(['Accept' => 'application/json'])->post('/api/admin/hero-slides/image', [
            'image' => UploadedFile::fake()->create('notes.pdf', 40, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    /** پیکسل‌های PNG واقعی تا قاعدهٔ image بدون نیاز به افزونهٔ GD هم کار کند. */
    private function pngUpload(string $name): UploadedFile
    {
        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            true,
        );

        return UploadedFile::fake()->createWithContent($name, $png);
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
}
