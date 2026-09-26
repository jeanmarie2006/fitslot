<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notif extends Model
{
    protected $table = 'notifications_app';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['lu' => 'boolean'];
    }

    /** Crée la notification dans l'application et écrit l'e-mail simulé dans les journaux (mailer « log »). */
    public static function envoyer(User $user, string $sujet, string $contenu, string $type = 'info'): self
    {
        \Illuminate\Support\Facades\Mail::raw($contenu, fn ($m) => $m->to($user->email)->subject($sujet));

        return self::create(['user_id' => $user->id, 'sujet' => $sujet, 'contenu' => $contenu, 'type' => $type]);
    }
}
