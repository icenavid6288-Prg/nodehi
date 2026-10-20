<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'group', 'value', 'is_secret'];

    protected $hidden = ['value'];

    protected function casts(): array
    {
        return ['is_secret' => 'boolean'];
    }
}
