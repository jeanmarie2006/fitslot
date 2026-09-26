<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CreneauController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Public (la connexion est facultative : elle ajoute « ma réservation »)
Route::get('/creneaux', [CreneauController::class, 'index']);
Route::get('/offres', [ClientController::class, 'offres']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Client
    Route::post('/creneaux/{creneau}/reserver', [ClientController::class, 'reserver'])->middleware('throttle:20,1');
    Route::get('/mes-reservations', [ClientController::class, 'mine']);
    Route::post('/reservations/{reservation}/annuler', [ClientController::class, 'annuler']);
    Route::post('/reservations/{reservation}/reporter', [ClientController::class, 'reporter']);
    Route::get('/mes-abonnements', [ClientController::class, 'abonnements']);
    Route::post('/abonnements', [ClientController::class, 'acheter']);
    Route::get('/notifications', [ClientController::class, 'notifications']);
    Route::post('/notifications/lues', [ClientController::class, 'lues']);

    // Coach
    Route::post('/creneaux', [CreneauController::class, 'store']);
    Route::get('/creneaux/{creneau}/inscrits', [CreneauController::class, 'inscrits']);
    Route::post('/creneaux/{creneau}/annuler', [CreneauController::class, 'annuler']);
    Route::post('/reservations/{reservation}/presence', [CreneauController::class, 'presence']);
    Route::get('/coach/stats', [CreneauController::class, 'stats']);
    Route::post('/coach/rappels', [CreneauController::class, 'rappels']);
});
