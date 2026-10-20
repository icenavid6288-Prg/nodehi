<?php

namespace Tests\Feature;

use Database\Seeders\ContentSeeder;
use Database\Seeders\StoreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // کاتالوگ هم لازم است تا لینک‌سازی داخلی مقاله به محصول تست شود.
        $this->seed([ContentSeeder::class, StoreSeeder::class]);
    }

    public function test_articles_list_returns_categories_and_summaries(): void
    {
        $response = $this->getJson('/api/articles')->assertOk();

        $response->assertJsonPath('ok', true);

        $items = $response->json('items');
        $this->assertCount(6, $items);
        $this->assertSame(6, $response->json('total'));

        foreach ($items as $item) {
            $this->assertArrayHasKey('slug', $item);
            $this->assertArrayHasKey('categoryLabel', $item);
            $this->assertArrayNotHasKey('body', $item, 'فهرست مقالات نباید متن کامل را برگرداند.');
        }

        $categories = collect($response->json('categories'))->keyBy('slug');
        $this->assertSame('راهنمای خرید', $categories['buying-guide']['label']);
        $this->assertSame(3, $categories['buying-guide']['count']);
    }

    public function test_articles_can_be_filtered_by_category(): void
    {
        $response = $this->getJson('/api/articles?category=maintenance')->assertOk();

        $this->assertSame(1, $response->json('total'));
        $this->assertSame('increase-appliance-lifespan', $response->json('items.0.slug'));
    }

    public function test_article_detail_includes_body_and_related(): void
    {
        $response = $this->getJson('/api/articles/how-to-choose-refrigerator')->assertOk();

        $response->assertJsonPath('article.slug', 'how-to-choose-refrigerator')
            ->assertJsonPath('article.categoryLabel', 'راهنمای خرید')
            ->assertJsonPath('article.readingMinutes', 7);

        $this->assertCount(5, $response->json('article.body'));
        $this->assertNotEmpty($response->json('article.keywords'));
        $this->assertCount(3, $response->json('related'));

        foreach ($response->json('related') as $item) {
            $this->assertNotSame('how-to-choose-refrigerator', $item['slug']);
        }
    }

    public function test_article_links_to_matching_products(): void
    {
        $products = $this->getJson('/api/articles/how-to-choose-refrigerator')->json('relatedProducts');

        $this->assertNotEmpty($products);
        $this->assertLessThanOrEqual(4, count($products));

        foreach ($products as $product) {
            $this->assertArrayHasKey('slug', $product);
            $this->assertArrayHasKey('name', $product);
        }

        $this->assertStringContainsString('یخچال', $products[0]['name']);
    }

    public function test_unknown_article_returns_404(): void
    {
        $this->getJson('/api/articles/no-such-article')->assertNotFound()->assertJsonPath('ok', false);
    }

    public function test_faqs_are_grouped_by_category(): void
    {
        $response = $this->getJson('/api/faqs')->assertOk();

        $this->assertSame(8, $response->json('total'));
        $this->assertCount(8, $response->json('items'));

        $categories = collect($response->json('categories'))->keyBy('slug');
        $this->assertSame('ارسال و مرجوعی', $categories['shipping']['label']);
        $this->assertSame(3, $categories['shipping']['count']);
        $this->assertSame(2, $categories['payment']['count']);

        foreach ($response->json('items') as $item) {
            $this->assertNotEmpty($item['answer']);
            $this->assertArrayHasKey($item['category'], $categories->all());
        }
    }

    public function test_legal_index_lists_shipped_pages(): void
    {
        $response = $this->getJson('/api/legal')->assertOk();

        $slugs = collect($response->json('items'))->pluck('slug')->all();
        $this->assertContains('terms', $slugs);
        $this->assertContains('privacy', $slugs);
    }

    public function test_legal_page_returns_sections_and_bullets(): void
    {
        $terms = $this->getJson('/api/legal/terms')->assertOk();

        $terms->assertJsonPath('page.title', 'قوانین و مقررات')
            ->assertJsonPath('page.updatedAt', '2026-08-01');

        $this->assertCount(9, $terms->json('page.sections'));
        $this->assertSame('۱. کلیات', $terms->json('page.sections.0.title'));
        $this->assertSame([], $terms->json('page.sections.0.bullets'));

        $privacy = $this->getJson('/api/legal/privacy')->assertOk();
        $this->assertCount(4, $privacy->json('page.sections.0.bullets'));
    }

    public function test_unknown_legal_page_returns_404(): void
    {
        $this->getJson('/api/legal/returns-policy')->assertNotFound()->assertJsonPath('ok', false);
    }

    public function test_loyalty_returns_tiers_installments_and_steps(): void
    {
        $response = $this->getJson('/api/loyalty')->assertOk();

        $this->assertCount(4, $response->json('tiers'));
        $this->assertSame('برنزی', $response->json('tiers.0.name'));
        $this->assertSame('۳٪', $response->json('tiers.0.discount'));
        $this->assertCount(3, $response->json('tiers.0.perks'));

        $this->assertCount(4, $response->json('installments'));
        $this->assertSame([6, 12, 18, 24], array_column($response->json('installments'), 'months'));
        $this->assertTrue($response->json('installments.1.featured'));

        $this->assertCount(4, $response->json('steps'));
        $this->assertSame('انتخاب کالا', $response->json('steps.0.title'));
    }
}
