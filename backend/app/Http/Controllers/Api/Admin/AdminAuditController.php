<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('perPage', 30), 1), 100);
        $page = max((int) $request->query('page', 1), 1);

        $query = AuditLog::query()->with('actor:id,first_name,last_name,phone');

        if ($entity = trim((string) $request->query('entity', ''))) {
            $query->where('entity', $entity);
        }

        $total = (clone $query)->count();

        $items = $query->latest()
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'entity' => $log->entity,
                'entityId' => $log->entity_id,
                'actor' => $log->actor
                    ? ['name' => $log->actor->fullName(), 'phone' => $log->actor->phone]
                    : null,
                'metadata' => $log->metadata,
                'ip' => $log->ip,
                'createdAt' => $log->created_at?->toIso8601String(),
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
}
