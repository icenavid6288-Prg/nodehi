<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * نشست ورود — فقط هش توکن ذخیره می‌شود.
 */
class AuthSession extends Model
{
    protected $fillable = ['token_hash', 'user_id', 'expires_at', 'user_agent', 'ip'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
