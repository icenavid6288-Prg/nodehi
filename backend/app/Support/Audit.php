<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Http\Request;

/**
 * ثبت لاگ حسابرسی برای هر تغییر مدیریتی.
 *
 * فقط «چه چیزی عوض شد» ثبت می‌شود، نه مقادیر حساس. متادیتا به JSON تبدیل
 * می‌شود (cast مدل) تا در پنل به شکل خوانا نمایش داده شود.
 */
final class Audit
{
    public static function record(
        Request $request,
        string $action,
        string $entity,
        string|int|null $entityId = null,
        array $metadata = [],
    ): AuditLog {
        return AuditLog::create([
            'actor_id' => $request->user()?->id,
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId !== null ? (string) $entityId : null,
            'metadata' => $metadata,
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255) ?: null,
        ]);
    }
}
