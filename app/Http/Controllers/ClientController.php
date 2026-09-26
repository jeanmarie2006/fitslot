<?php

namespace App\Http\Controllers;

use App\Models\Abonnement;
use App\Models\Creneau;
use App\Models\Notif;
use App\Models\Reservation;
use App\Services\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Espace du client : réservations, report, annulation, abonnements et notifications. */
class ClientController extends Controller
{
    public function offres(): JsonResponse
    {
        return response()->json(collect(Abonnement::OFFRES)->map(fn ($o, $k) => ['code' => $k, ...$o])->values());
    }

    public function reserver(Request $request, Creneau $creneau): JsonResponse
    {
        abort_unless($request->user()->role === 'client', 403, 'Réservé aux clients.');
        $d = $request->validate(['paiement' => ['required', 'in:abonnement,momo,moov,sur_place'], 'numero' => ['nullable', 'string', 'max:20']]);
        $r = Booking::reserver($creneau, $request->user(), $d['paiement'], $d['numero'] ?? null);

        return response()->json($r, 201);
    }

    public function mine(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'client', 403);
        $liste = Reservation::with('creneau.coach:id,name')->where('client_id', $request->user()->id)->latest('id')->limit(80)->get();

        return response()->json($liste->map(fn ($r) => [
            'id' => $r->id, 'statut' => $r->statut, 'paiement' => $r->paiement, 'paye' => $r->paye, 'paiement_ref' => $r->paiement_ref, 'present' => $r->present,
            'peut_annuler' => Booking::peutAnnuler($r), 'a_venir' => $r->creneau->debut->isFuture(),
            'creneau' => ['id' => $r->creneau->id, 'titre' => $r->creneau->titre, 'discipline' => $r->creneau->discipline, 'debut' => $r->creneau->debut->toIso8601String(), 'duree' => $r->creneau->duree, 'salle' => $r->creneau->salle, 'prix' => $r->creneau->prix, 'statut' => $r->creneau->statut, 'coach' => $r->creneau->coach->name],
        ]));
    }

    public function annuler(Request $request, Reservation $reservation): JsonResponse
    {
        abort_unless($reservation->client_id === $request->user()->id, 403);
        abort_unless(Booking::peutAnnuler($reservation), 422, 'Annulation impossible moins de '.Booking::DELAI_ANNULATION_H.' h avant la séance.');
        Booking::annuler($reservation);

        return response()->json($reservation->fresh());
    }

    public function reporter(Request $request, Reservation $reservation): JsonResponse
    {
        abort_unless($reservation->client_id === $request->user()->id, 403);
        $c = Creneau::findOrFail($request->validate(['creneau_id' => ['required', 'integer', 'exists:creneaux,id']])['creneau_id']);

        return response()->json(Booking::reporter($reservation, $c));
    }

    public function abonnements(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'client', 403);

        return response()->json(Abonnement::where('client_id', $request->user()->id)->latest('id')->get());
    }

    /** Achat d'un abonnement (paiement Mobile Money simulé). */
    public function acheter(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'client', 403);
        $d = $request->validate(['offre' => ['required', 'in:'.implode(',', array_keys(Abonnement::OFFRES))], 'mode' => ['required', 'in:momo,moov'], 'numero' => ['required', 'regex:/^\+?[0-9 .\-]{8,20}$/']], ['numero.regex' => 'Numéro Mobile Money invalide.']);
        $o = Abonnement::OFFRES[$d['offre']];
        $a = Abonnement::create([
            'client_id' => $request->user()->id, 'offre' => $d['offre'], 'libelle' => $o['libelle'], 'seances_total' => $o['seances'], 'seances_restantes' => $o['seances'],
            'expire_le' => now()->addDays($o['jours'])->toDateString(), 'prix' => $o['prix'], 'paiement_mode' => $d['mode'], 'paiement_ref' => strtoupper(($d['mode'] === 'momo' ? 'MOMO-' : 'MOOV-').Str::random(8)),
        ]);
        Notif::envoyer($request->user(), 'Abonnement activé', "Votre {$o['libelle']} est actif jusqu’au ".now()->addDays($o['jours'])->locale('fr')->translatedFormat('j F Y').'. Bonnes séances !', 'succes');

        return response()->json($a, 201);
    }

    public function notifications(Request $request): JsonResponse
    {
        return response()->json(Notif::where('user_id', $request->user()->id)->latest('id')->limit(40)->get());
    }

    public function lues(Request $request): JsonResponse
    {
        Notif::where('user_id', $request->user()->id)->update(['lu' => true]);

        return response()->json(['ok' => true]);
    }
}
