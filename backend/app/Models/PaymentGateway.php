<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentGateway extends Model
{
    protected $fillable = [
        'key', 'label', 'description', 'is_active', 'is_sandbox', 'merchant_id', 'api_key', 'sort_order',
    ];

    protected $hidden = ['api_key'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_sandbox' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
