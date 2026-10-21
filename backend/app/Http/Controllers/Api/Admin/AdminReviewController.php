<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * صف بازبینی نظرات.
 *
 * تأیید یا رد نظر، امتیاز و تعداد نظرات محصول را دوباره محاسبه می‌کند؛
 * وگرنه ستاره‌های صفحهٔ محصول با نظرهای واقعی هم‌خوان نمی‌ماند.
 */
class AdminReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('perPage', 20), 1), 60);
        $status = (string) $request->query('status', 'pending');

        $query = Review::query()
            ->leftJoin('products', 'products.slug', '=', 'reviews.product_slug')
            ->select('reviews.*', 'products.name as product_name');

        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('reviews.status', $status);
        }

        $total = (clone $query)->count();
        $page = max((int) $request->query('page', 1), 1);

        $items = $query->latest('reviews.created_at')
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (Review $review) => [
                'id' => $review->id,
                'productSlug' => $review->product_slug,
                'productName' => $review->product_name ?? $review->product_slug,
                'author' => $review->author,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'status' => $review->status,
                'createdAt' => $review->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'ok' => true,
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
            'pageCount' => max((int) ceil($total / $perPage), 1),
            'items' => $items,
        ]);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected,pending'],
        ]);

        $review->update(['status' => $data['status']]);
        $this->recalculateProduct($review->product_slug);

        Audit::record($request, 'review.' . $data['status'], 'Review', $review->id, [
            'product' => $review->product_slug,
            'title' => $review->title,
        ]);

        return response()->json([
            'ok' => true,
            'review' => [
                'id' => $review->id,
                'status' => $review->status,
            ],
        ]);
    }

    private function recalculateProduct(string $slug): void
    {
        $approved = Review::where('product_slug', $slug)->where('status', 'approved');

        Product::where('slug', $slug)->update([
            'rating' => round((float) $approved->avg('rating'), 1),
            'review_count' => $approved->count(),
        ]);
    }
}
