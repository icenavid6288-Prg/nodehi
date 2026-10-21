<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /** خلاصهٔ وضعیت فروشگاه برای صفحهٔ اول پنل. */
    public function __invoke(): JsonResponse
    {
        $statusCounts = Order::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $revenue = (int) Order::query()
            ->whereIn('status', ['paid', 'processing', 'shipped', 'delivered'])
            ->sum('total');

        return response()->json([
            'ok' => true,
            'products' => [
                'total' => Product::count(),
                'active' => Product::where('is_active', true)->count(),
                'outOfStock' => Product::where('stock', '<=', 0)->count(),
            ],
            'orders' => [
                'total' => Order::count(),
                'byStatus' => $statusCounts,
                'revenue' => $revenue,
            ],
            'customers' => User::where('role', 'customer')->count(),
            'reviews' => [
                'pending' => Review::where('status', 'pending')->count(),
                'approved' => Review::where('status', 'approved')->count(),
            ],
            'recentOrders' => Order::query()
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (Order $order) => [
                    'orderNumber' => $order->order_number,
                    'customerName' => $order->customerName(),
                    'status' => $order->status,
                    'total' => $order->total,
                    'createdAt' => $order->created_at?->toIso8601String(),
                ]),
            'lowStock' => Product::query()
                ->active()
                ->orderBy('stock')
                ->limit(5)
                ->get(['slug', 'name', 'stock'])
                ->map(fn (Product $product) => [
                    'slug' => $product->slug,
                    'name' => $product->name,
                    'stock' => $product->stock,
                ]),
            'recentAudit' => AuditLog::query()
                ->with('actor:id,first_name,last_name,phone')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'entity' => $log->entity,
                    'actor' => $log->actor?->fullName() ?? 'سیستم',
                    'createdAt' => $log->created_at?->toIso8601String(),
                ]),
        ]);
    }
}
