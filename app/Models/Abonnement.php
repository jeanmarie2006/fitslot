<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Abonnement extends Model
{
    protected $table = 'abonnements';

    protected $guarded = [];

    protected $appends = ['actif'];

    protected function casts(): array
    {
        return ['expire_le' => 'date:Y-m-d'];
    }

    public const OFFRES = [
        'pack5' => ['libelle' => 'Pack 5 séances', 'seances' => 5, 'jours' => 60, 'prix' => 15000, 'detail' => 'Valable 2 mois'],
        'pack10' => ['libelle' => 'Pack 10 séances', 'seances' => 10, 'jours' => 90, 'prix' => 27000, 'detail' => 'Valable 3 mois — économisez 3 000 F'],
        'mensuel' => ['libelle' => 'Mensuel illimité', 'seances' => null, 'jours' => 30, 'prix' => 30000, 'detail' => 'Séances illimitées pendant 30 jours'],
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function getActifAttribute(): bool
    {
        return $this->expire_le->endOfDay()->isFuture() && ($this->seances_total === null || $this->seances_restantes > 0);
    }
}
