<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\StockAlert;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * مدیریت کاتالوگ از پنل.
 *
 * - نامک پس از ساخت تغییر نمی‌کند: نظرها و سابقهٔ سفارش با همین نامک
 *   ارجاع دارند و تغییر آن، داده را بی‌صدا یتیم می‌کند.
 * - PATCH فقط فیلدهای فرستاده‌شده را عوض می‌کند؛ فرم ویرایش لازم نیست کل
 *   کالا را دوباره بفرستد و خطر پاک‌شدن ناخواستهٔ تصاویر/مشخصات از بین می‌رود.
 * - کالایی که سابقهٔ سفارش دارد حذف قطعی نمی‌شود (۴۰۹) و باید غیرفعال شود.
 */
class AdminProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('perPage', 20), 1), 60);
        $query = Product::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($inner) use ($q) {
                $inner->where('name', 'like', "%{$q}%")
                    ->orWhere('slug', 'like', "%{$q}%");
            });
        }

        $status = (string) $request->query('status', 'all');
        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }

        $total = (clone $query)->count();
        $page = max((int) $request->query('page', 1), 1);

        $items = $query->orderByDesc('updated_at')
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (Product $product) => $this->serialize($product));

        return response()->json([
            'ok' => true,
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
            'pageCount' => max((int) ceil($total / $perPage), 1),
            'items' => $items,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->first();

        if (! $product) {
            return response()->json(['ok' => false, 'error' => 'محصول یافت نشد.'], 404);
        }

        return response()->json(['ok' => true, 'product' => $this->serialize($product)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        $product = Product::create($this->attributes($data) + [
            'rating' => 0,
            'review_count' => 0,
            'published_at' => $data['publishedAt'] ?? now(),
            'is_active' => $data['isActive'] ?? true,
        ]);

        Audit::record($request, 'product.created', 'Product', $product->slug, [
            'name' => $product->name,
            'price' => $product->price,
        ]);

        return response()->json(['ok' => true, 'product' => $this->serialize($product)], 201);
    }

    public function update(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->first();

        if (! $product) {
            return response()->json(['ok' => false, 'error' => 'محصول یافت نشد.'], 404);
        }

        if ($request->filled('slug') && $request->input('slug') !== $product->slug) {
            return response()->json([
                'ok' => false,
                'error' => 'نامک محصول قابل تغییر نیست؛ برای نامک تازه، کالای جدید بسازید.',
            ], 422);
        }

        $data = $request->validate($this->rules(partial: true));
        $attributes = $this->attributes($data, partial: true);

        $before = $product->only(array_keys($attributes));
        $product->fill($attributes)->save();

        Audit::record($request, 'product.updated', 'Product', $product->slug, [
            'name' => $product->name,
            'changed' => $this->changedKeys($before, $attributes),
        ]);

        return response()->json(['ok' => true, 'product' => $this->serialize($product)]);
    }

    public function destroy(Request $request, string $slug): JsonResponse
    {
        $product = Product::where('slug', $slug)->first();

        if (! $product) {
            return response()->json(['ok' => false, 'error' => 'محصول یافت نشد.'], 404);
        }

        if (OrderItem::where('product_slug', $slug)->exists()) {
            return response()->json([
                'ok' => false,
                'error' => 'این کالا سابقهٔ سفارش دارد و حذف نمی‌شود؛ آن را غیرفعال کنید.',
            ], 409);
        }

        $name = $product->name;
        Review::where('product_slug', $slug)->delete();
        StockAlert::where('product_slug', $slug)->delete();
        $product->delete();

        Audit::record($request, 'product.deleted', 'Product', $slug, ['name' => $name]);

        return response()->json(['ok' => true, 'message' => 'محصول حذف شد.']);
    }

    /** قواعد مشترک ساخت و ویرایش؛ در ویرایش همه اختیاری‌اند. */
    private function rules(bool $partial = false): array
    {
        $presence = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$presence, 'string', 'max:200'],
            'slug' => [
                $partial ? 'sometimes' : 'required',
                'string',
                'max:120',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('products', 'slug')->ignore($partial ? request()->route('slug') : null, 'slug'),
            ],
            'category' => [$presence, 'string', 'exists:categories,slug'],
            'brand' => [$presence, 'string', 'exists:brands,slug'],
            'price' => [$presence, 'integer', 'min:0', 'max:4000000000'],
            'compareAtPrice' => ['nullable', 'integer', 'min:0', 'max:4000000000'],
            'stock' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'shortDescription' => [$presence, 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:20000'],
            'highlights' => ['sometimes', 'array', 'max:12'],
            'highlights.*' => ['string', 'max:200'],
            'specs' => ['sometimes', 'array', 'max:40'],
            'specs.*.label' => ['required_with:specs', 'string', 'max:100'],
            'specs.*.value' => ['required_with:specs', 'string', 'max:200'],
            'specs.*.group' => ['nullable', 'string', 'max:60'],
            'attributes' => ['sometimes', 'array'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['string', 'max:500'],
            'tags' => ['sometimes', 'array', 'max:20'],
            'tags.*' => ['string', 'max:60'],
            'relatedSlugs' => ['sometimes', 'array', 'max:8'],
            'relatedSlugs.*' => ['string', 'max:120'],
            'videoUrl' => ['nullable', 'string', 'max:500'],
            'isActive' => ['sometimes', 'boolean'],
            'publishedAt' => ['nullable', 'date'],
        ];
    }

    /** نگاشت ورودی API (camelCase) به ستون‌های دیتابیس. */
    private function attributes(array $data, bool $partial = false): array
    {
        $map = [
            'name' => 'name',
            'slug' => 'slug',
            'category' => 'category_slug',
            'brand' => 'brand_slug',
            'price' => 'price',
            'compareAtPrice' => 'compare_at_price',
            'stock' => 'stock',
            'shortDescription' => 'short_description',
            'description' => 'description',
            'highlights' => 'highlights',
            'specs' => 'specs',
            'attributes' => 'attributes',
            'images' => 'images',
            'tags' => 'tags',
            'relatedSlugs' => 'related_slugs',
            'videoUrl' => 'video_url',
            'isActive' => 'is_active',
            'publishedAt' => 'published_at',
        ];

        $attributes = [];

        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $attributes[$column] = $data[$input];
            } elseif (! $partial && in_array($input, ['description', 'compareAtPrice', 'videoUrl'], true)) {
                // فیلدهای nullable در ساخت: خالی به null تبدیل می‌شود.
                $attributes[$column] = null;
            }
        }

        if (! $partial) {
            $attributes += [
                'highlights' => $data['highlights'] ?? [],
                'specs' => $data['specs'] ?? [],
                'attributes' => $data['attributes'] ?? [],
                'images' => $data['images'] ?? [],
                'tags' => $data['tags'] ?? [],
                'related_slugs' => $data['relatedSlugs'] ?? [],
            ];
        }

        // ستون description در دیتابیس NOT NULL است (پیش‌فرض رشتهٔ خالی)؛
        // فرستادن null از فرم باعث خطای ۵۰۰ می‌شد.
        if (array_key_exists('description', $attributes)) {
            $attributes['description'] = $attributes['description'] ?? '';
        }

        return $attributes;
    }

    private function changedKeys(array $before, array $after): array
    {
        $changed = [];

        foreach ($after as $key => $value) {
            $old = $before[$key] ?? null;
            if (json_encode($old) !== json_encode($value)) {
                $changed[] = $key;
            }
        }

        return $changed;
    }

    private function serialize(Product $product): array
    {
        return [
            'slug' => $product->slug,
            'name' => $product->name,
            'category' => $product->category_slug,
            'brand' => $product->brand_slug,
            'price' => $product->price,
            'compareAtPrice' => $product->compare_at_price,
            'discountPercent' => $product->discountPercent(),
            'stock' => $product->stock,
            'rating' => $product->rating,
            'reviewCount' => $product->review_count,
            'shortDescription' => $product->short_description,
            'description' => $product->description,
            'highlights' => $product->highlights,
            'specs' => $product->specs,
            'attributes' => $product->attributes,
            'images' => $product->images,
            'tags' => $product->tags,
            'relatedSlugs' => $product->related_slugs,
            'videoUrl' => $product->video_url,
            'isActive' => $product->is_active,
            'publishedAt' => $product->published_at?->toDateString(),
            'updatedAt' => $product->updated_at?->toIso8601String(),
        ];
    }
}
