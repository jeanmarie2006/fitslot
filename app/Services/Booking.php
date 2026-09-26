<?php

namespace App\Services;

use App\Models\Abonnement;
use App\Models\Creneau;
use App\Models\Notif;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Règles de réservation : capacité, doublons, abonnement, paiement simulé, annulation (2 h avant) et report. */
class Booking
{
    public const DELAI_ANNULATION_H = 2;

    public static function abonnementValable(User $client, Creneau $c): ?Abonnement
    {
        return Abonnement::where('client_id', $client->id)
            ->whereDate('expire_le', '>=', $c->debut->toDateString())
            ->where(fn ($q) => $q->whereNull('seances_total')->orWhere('seances_restantes', '>', 0))
            ->orderBy('expire_le')->first();
    }

    public static function reserver(Creneau $creneau, User $client, string $paiement, ?string $numero = null): Reservation
    {
        return DB::transaction(function () use ($creneau, $client, $paiement, $numero) {
            $c = Creneau::whereKey($creneau->id)->lockForUpdate()->firstOrFail();
            abort_unless($c->statut === 'ouvert' && $c->debut->isFuture(), 422, 'Ce créneau n’est plus disponible.');
            abort_if($c->confirmees()->count() >= $c->capacite, 422, 'Ce créneau est complet.');
            $existante = Reservation::where('creneau_id', $c->id)->where('client_id', $client->id)->first();
            abort_if($existante && $existante->statut === 'confirmee', 422, 'Vous êtes déjà inscrit à cette séance.');

            $data = ['statut' => 'confirmee', 'paiement' => $paiement, 'paye' => false, 'paiement_ref' => null, 'abonnement_id' => null, 'present' => null];
            if ($paiement === 'abonnement') {
                $ab = self::abonnementValable($client, $c);
                abort_unless($ab, 422, 'Aucun abonnement valable pour cette date. Achetez un pack ou payez la séance.');
                if ($ab->seances_total !== null) {
                    $ab->decrement('seances_restantes');
                }
                $data = [...$data, 'paye' => true, 'abonnement_id' => $ab->id];
            } elseif (in_array($paiement, ['momo', 'moov'], true)) {
                abort_unless(preg_match('/^\+?[0-9 .\-]{8,20}$/', (string) $numero), 422, 'Numéro Mobile Money invalide.');
                $data = [...$data, 'paye' => true, 'paiement_ref' => strtoupper(($paiement === 'momo' ? 'MOMO-' : 'MOOV-').Str::random(8))];
            }
            $r = $existante ? tap($existante)->update($data) : Reservation::create(['creneau_id' => $c->id, 'client_id' => $client->id, ...$data]);

            Notif::envoyer($client, 'Réservation confirmée', "Votre séance « {$c->titre} » est confirmée le {$c->debut->locale('fr')->translatedFormat('l j F à H\hi')} ({$c->salle}). Annulation gratuite jusqu’à ".self::DELAI_ANNULATION_H.' h avant.', 'succes');

            return $r->fresh('creneau');
        });
    }

    public static function peutAnnuler(Reservation $r): bool
    {
        return $r->statut === 'confirmee' && $r->creneau->debut->gt(now()->addHours(self::DELAI_ANNULATION_H));
    }

    public static function rendreSeance(Reservation $r): void
    {
        if ($r->abonnement_id && $r->abonnement && $r->abonnement->seances_total !== null) {
            $r->abonnement->increment('seances_restantes');
        }
    }

    public static function annuler(Reservation $r, bool $parCoach = false): Reservation
    {
        return DB::transaction(function () use ($r, $parCoach) {
            self::rendreSeance($r);
            $r->update(['statut' => 'annulee']);
            if ($parCoach) {
                Notif::envoyer($r->client, 'Séance annulée', "La séance « {$r->creneau->titre} » du {$r->creneau->debut->locale('fr')->translatedFormat('l j F à H\hi')} a été annulée par la salle."
                    .($r->abonnement_id ? ' Votre séance d’abonnement vous a été rendue.' : ($r->paye ? ' Un remboursement vous sera adressé (simulation).' : '')), 'alerte');
            }

            return $r;
        });
    }

    public static function reporter(Reservation $r, Creneau $nouveau): Reservation
    {
        abort_unless(self::peutAnnuler($r), 422, 'Report impossible moins de '.self::DELAI_ANNULATION_H.' h avant la séance.');

        return DB::transaction(function () use ($r, $nouveau) {
            $c = Creneau::whereKey($nouveau->id)->lockForUpdate()->firstOrFail();
            abort_if($c->id === $r->creneau_id, 422, 'Choisissez un autre créneau.');
            abort_unless($c->statut === 'ouvert' && $c->debut->isFuture(), 422, 'Ce créneau n’est plus disponible.');
            abort_if($c->confirmees()->count() >= $c->capacite, 422, 'Ce créneau est complet.');
            abort_if(Reservation::where('creneau_id', $c->id)->where('client_id', $r->client_id)->exists(), 422, 'Vous avez déjà une réservation sur ce créneau.');
            if ($r->abonnement_id) {
                abort_if($r->abonnement->expire_le->lt($c->debut->copy()->startOfDay()), 422, 'Votre abonnement expire avant ce créneau.');
            }
            $r->update(['creneau_id' => $c->id]);
            Notif::envoyer($r->client, 'Séance reportée', "Votre séance a été reportée au {$c->debut->locale('fr')->translatedFormat('l j F à H\hi')} : « {$c->titre} ».", 'succes');

            return $r->fresh('creneau');
        });
    }
}
