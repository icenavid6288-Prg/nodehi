<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * کاربر فروشگاه — ورود با OTP، بدون رمز عبور.
 */
class User extends Model
{
    protected $fillable = [
        'phone', 'first_name', 'last_name', 'email', 'role', 'is_active',
        'phone_verified_at', 'loyalty_points', 'loyalty_tier', 'last_login_at',
    ];

    protected $hidden = ['email'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'loyalty_points' => 'integer',
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(AuthSession::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'operator'], true);
    }

    public function fullName(): string
    {
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? '')) ?: 'کاربر نودهی';
    }
}
