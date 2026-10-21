<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Support\Audit;
use App\Support\Phone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * مدیریت سفارش‌ها از پنل.
 *
 * تغییر وضعیت «آخرین سد» پیش از نوشتن روی فاکتور است: انتقال‌های غیرمجاز
 * رد می‌شوند و لغو سفارش، موجودی اقلام را برمی‌گرداند — فقط یک‌بار.
 */
class AdminOrderController extends Controller
{
    /** وضعیت‌های مجاز بعدی برای هر وضعیت فعلی (خودِ وضعیت هم مجاز است). */
    private const TRANSITIONS = [
        'pending' => ['pending', 'paid', 'processing', 'cancelled'],
        'paid' => ['paid', 'processing', 'cancelled'],
        'processing' => ['processing', 'shipped', 'cancelled'],
        'shipped' => ['shipped', 'delivered'],
        'delivered' => ['delivered'],
        'cancelled' => ['cancelled'],
    ];

    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('perPage', 20), 1), 60);
        $query = Order::query()->withCount('items');

        if ($status = trim((string) $request->query('status', ''))) {
            $query->where('status', $status);
        }

        if ($q = trim((string) $request->query('q', ''))) {
            $normalizedPhone = Phone::normalize($q);
            $query->where(function ($inner) use ($q, $normalizedPhone) {
                $inner->where('order_number', 'like', "%{$q}%")
                    ->orWhere('customer_first_name', 'like', "%{$q}%")
                    ->orWhere('customer_last_name', 'like', "%{$q}%")
                    ->orWhere('customer_phone', 'like', "%{$normalizedPhone}%");
            });
        }

        $total = (clone $query)->count();
        $page = max((int) $request->query('page', 1), 1);

        $items = $query->latest()
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (Order $order) => [
                'orderNumber' => $order->order_number,
                'status' => $order->status,
                'paymentMethod' => $order->payment_method,
                'customerName' => $order->customerName(),
                'customerPhone' => $order->customer_phone,
                'total' => $order->total,
                'itemCount' => $order->items_count,
                'trackingCode' => $order->tracking_code,
                'createdAt' => $order->created_at?->toIso8601String(),
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

    public function show(string $orderNumber): JsonResponse
    {
        $order = Order::with('items')->where('order_number', $orderNumber)->first();

        if (! $order) {
            return response()->json(['ok' => false, 'error' => 'سفارش یافت نشد.'], 404);
        }

        return response()->json(['ok' => true, 'order' => $this->payload($order)]);
    }

    public function update(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::with('items')->where('order_number', $orderNumber)->first();

        if (! $order) {
            return response()->json(['ok' => false, 'error' => 'سفارش یافت نشد.'], 404);
        }

        $data = $request->validate([
            'status' => ['sometimes', 'string', 'in:pending,paid,processing,shipped,delivered,cancelled'],
            'trackingCode' => ['sometimes', 'nullable', 'string', 'max:40'],
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $changes = [];

        return DB::transaction(function () use ($request, $order, $data, &$changes) {
            if (array_key_exists('status', $data) && $data['status'] !== $order->status) {
                $allowed = self::TRANSITIONS[$order->status] ?? [];
                if (! in_array($data['status'], $allowed, true)) {
                    return response()->json([
                        'ok' => false,
                        'error' => "تغییر وضعیت از «{$order->status}» به «{$data['status']}» مجاز نیست.",
                    ], 422);
                }

                if ($data['status'] === 'cancelled' && $order->cancelled_at === null) {
                    foreach ($order->items as $item) {
                        Product::where('slug', $item->product_slug)->increment('stock', $item->quantity);
                    }
                    $order->cancelled_at = now();
                }

                $order->status = $data['status'];
                $order->paid_at ??= in_array($data['status'], ['paid', 'processing', 'shipped', 'delivered'], true) ? now() : null;
                $order->shipped_at ??= in_array($data['status'], ['shipped', 'delivered'], true) ? now() : null;
                $order->delivered_at ??= $data['status'] === 'delivered' ? now() : null;
                $changes['status'] = $data['status'];
            }

            if (array_key_exists('trackingCode', $data)) {
                $raw = preg_replace('/\s+/', '', Phone::latinDigits((string) $data['trackingCode'])) ?? '';
                if ($raw !== '' && ! preg_match('/^[A-Za-z0-9-]{4,40}$/', $raw)) {
                    return response()->json([
                        'ok' => false,
                        'error' => 'کد رهگیری باید ۴ تا ۴۰ نویسهٔ لاتین، رقم یا خط تیره باشد.',
                    ], 422);
                }
                $order->tracking_code = $raw !== '' ? $raw : null;
                $changes['trackingCode'] = $order->tracking_code;
            }

            if (array_key_exists('note', $data)) {
                $order->note = $data['note'] !== null && trim((string) $data['note']) !== ''
                    ? trim((string) $data['note'])
                    : null;
                $changes['note'] = $order->note;
            }

            if ($changes !== []) {
                $order->save();
                Audit::record($request, 'order.updated', 'Order', $order->order_number, [
                    'changes' => $changes,
                ]);
            }

            return response()->json(['ok' => true, 'order' => $this->payload($order->fresh('items'))]);
        });
    }

    private function payload(Order $order): array
    {
        return [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'status' => $order->status,
            'paymentMethod' => $order->payment_method,
            'shippingMethod' => $order->shipping_method,
            'subtotal' => $order->subtotal,
            'discount' => $order->discount,
            'shipping' => $order->shipping,
            'total' => $order->total,
            'couponCode' => $order->coupon_code,
            'trackingCode' => $order->tracking_code,
            'note' => $order->note,
            'customer' => [
                'firstName' => $order->customer_first_name,
                'lastName' => $order->customer_last_name,
                'phone' => $order->customer_phone,
                'email' => $order->customer_email,
            ],
            'address' => [
                'province' => $order->shipping_province,
                'city' => $order->shipping_city,
                'line' => $order->shipping_line,
                'postalCode' => $order->shipping_postal_code,
            ],
            'createdAt' => $order->created_at?->toIso8601String(),
            'paidAt' => $order->paid_at?->toIso8601String(),
            'shippedAt' => $order->shipped_at?->toIso8601String(),
            'deliveredAt' => $order->delivered_at?->toIso8601String(),
            'cancelledAt' => $order->cancelled_at?->toIso8601String(),
            'items' => $order->items->map(fn ($item) => [
                'slug' => $item->product_slug,
                'name' => $item->product_name,
                'unitPrice' => $item->unit_price,
                'quantity' => $item->quantity,
                'lineTotal' => $item->line_total,
            ]),
        ];
    }
}
