<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = [
        'slug', 'name', 'name_en', 'description', 'seo_intro', 'icon',
        'featured', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'featured' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
