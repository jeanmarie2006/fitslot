<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Rappels de la veille : à planifier avec le cron du serveur (`php artisan schedule:run`) ; sur l'hébergement gratuit,
// le coach peut aussi les déclencher depuis son espace.
Artisan::command('fitslot:rappels', function () {
    $this->info(\App\Http\Controllers\CreneauController::envoyerRappels().' rappel(s) envoyé(s).');
})->purpose('Envoie les rappels des séances de demain');

\Illuminate\Support\Facades\Schedule::command('fitslot:rappels')->dailyAt('18:00');
