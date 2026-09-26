<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Creneau extends Model
{
    protected $table = 'creneaux';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['debut' => 'datetime'];
    }

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function confirmees(): HasMany
    {
        return $this->reservations()->where('statut', 'confirmee');
    }

    public function getFinAttribute()
    {
        return $this->debut->copy()->addMinutes($this->duree);
    }
}
