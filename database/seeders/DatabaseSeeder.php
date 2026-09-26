<?php

namespace Database\Seeders;

use App\Models\Abonnement;
use App\Models\Creneau;
use App\Models\Notif;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/** Salle fictive « Atlas Fitness Club » (Cotonou) : 2 coachs, 12 clients, 3 semaines de planning passé et à venir. */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(5);
        $ines = User::create(['name' => 'Inès Adjovi', 'email' => 'coach@fitslot.bj', 'password' => 'demo1234', 'role' => 'coach', 'telephone' => '+229 01 97 10 10 10']);
        $marc = User::create(['name' => 'Marc Dossou', 'email' => 'marc@fitslot.bj', 'password' => 'demo1234', 'role' => 'coach', 'telephone' => '+229 01 96 20 20 20']);
        $demo = User::create(['name' => 'Aïcha Bello', 'email' => 'client@fitslot.bj', 'password' => 'demo1234', 'role' => 'client', 'telephone' => '+229 01 95 30 30 30']);
        $clients = [$demo];
        foreach (['Serge Houngbo', 'Carine Mêdénou', 'Ibrahim Salami', 'Estelle Kiki', 'Modeste Fanou', 'Rachidath Bio', 'Fatou Dègbè', 'Rodrigue Tossou', 'Mireille Akpo', 'Pascal Gbèdo', 'Nadège Loko'] as $n) {
            $clients[] = User::create(['name' => $n, 'email' => Str::slug($n).'@fitslot.bj', 'password' => 'demo1234', 'role' => 'client', 'telephone' => '+229 01 6'.mt_rand(0, 9).' '.mt_rand(10, 99).' '.mt_rand(10, 99).' '.mt_rand(10, 99)]);
        }

        // modèle de semaine : [jour ISO, heure, minute, discipline, titre, durée, capacité, prix, coach]
        $modele = [];
        foreach ([1, 2, 3, 4, 5] as $j) {
            $modele[] = [$j, 6, 30, 'Cardio', 'Cardio matinal', 45, 14, 2000, $ines];
            $modele[] = [$j, 12, 30, 'Musculation', 'Musculation express', 45, 12, 2500, $marc];
            $modele[] = [$j, 18, 30, $j % 2 ? 'Boxe' : 'Cross-training', $j % 2 ? 'Boxe & conditioning' : 'Cross-training', 60, 12, 3000, $marc];
            $modele[] = [$j, 19, 45, $j % 2 ? 'Yoga' : 'Danse', $j % 2 ? 'Yoga vinyasa' : 'Zumba afro', 60, 16, 2500, $ines];
        }
        $modele[] = [6, 9, 0, 'Danse', 'Zumba afro du samedi', 60, 20, 2500, $ines];
        $modele[] = [6, 10, 30, 'Cross-training', 'Cross-training team', 60, 14, 3000, $marc];
        $modele[] = [7, 9, 30, 'Yoga', 'Yoga doux du dimanche', 75, 14, 2500, $ines];

        $tous = [];
        for ($s = -3; $s <= 3; $s++) {
            $lundi = now()->startOfWeek()->addWeeks($s);
            foreach ($modele as [$j, $h, $m, $disc, $titre, $duree, $cap, $prix, $coach]) {
                $tous[] = Creneau::create(['coach_id' => $coach->id, 'discipline' => $disc, 'titre' => $titre, 'debut' => $lundi->copy()->addDays($j - 1)->setTime($h, $m), 'duree' => $duree, 'capacite' => $cap, 'prix' => $prix, 'salle' => $disc === 'Yoga' || $disc === 'Danse' ? 'Studio' : 'Salle principale']);
            }
        }

        // abonnements : la cliente démo a un pack 10 entamé ; quelques clients ont un mensuel
        $abo = Abonnement::create(['client_id' => $demo->id, 'offre' => 'pack10', 'libelle' => 'Pack 10 séances', 'seances_total' => 10, 'seances_restantes' => 10, 'expire_le' => now()->addDays(70)->toDateString(), 'prix' => 27000, 'paiement_mode' => 'momo', 'paiement_ref' => 'MOMO-DEMO0001']);
        $mensuels = [];
        foreach (array_slice($clients, 1, 4) as $c) {
            $mensuels[$c->id] = Abonnement::create(['client_id' => $c->id, 'offre' => 'mensuel', 'libelle' => 'Mensuel illimité', 'seances_total' => null, 'seances_restantes' => null, 'expire_le' => now()->addDays(mt_rand(5, 25))->toDateString(), 'prix' => 30000, 'paiement_mode' => 'moov', 'paiement_ref' => 'MOOV-'.strtoupper(Str::random(8))]);
        }

        foreach ($tous as $c) {
            $passe = $c->debut->isPast();
            $taux = $passe ? mt_rand(35, 95) / 100 : mt_rand(10, 90) / 100;
            $n = (int) round($c->capacite * $taux);
            $ids = array_rand($clients, min($n, count($clients)) ?: 1);
            foreach ((array) $ids as $k) {
                $cl = $clients[$k];
                if ($cl->id === $demo->id && ! $passe && mt_rand(0, 100) > 30) {
                    continue;
                }
                $ab = $mensuels[$cl->id] ?? null;
                $mode = $ab ? 'abonnement' : ['sur_place', 'momo', 'moov'][mt_rand(0, 2)];
                Reservation::create(['creneau_id' => $c->id, 'client_id' => $cl->id, 'statut' => 'confirmee', 'paiement' => $mode, 'paye' => $mode !== 'sur_place', 'paiement_ref' => in_array($mode, ['momo', 'moov'], true) ? strtoupper(($mode === 'momo' ? 'MOMO-' : 'MOOV-').Str::random(8)) : null, 'abonnement_id' => $ab?->id, 'present' => $passe ? mt_rand(0, 100) > 12 : null]);
            }
        }

        // la cliente démo : 3 séances à venir via son pack 10 (7 restantes) + une séance passée
        $abo->update(['seances_restantes' => 7]);
        $futurs = collect($tous)->filter(fn ($c) => $c->debut->gt(now()->addDay()))->values();
        foreach ([2, 9, 15] as $i) {
            Reservation::updateOrCreate(['creneau_id' => $futurs[$i]->id, 'client_id' => $demo->id], ['statut' => 'confirmee', 'paiement' => 'abonnement', 'paye' => true, 'abonnement_id' => $abo->id]);
        }
        Notif::create(['user_id' => $demo->id, 'sujet' => 'Bienvenue chez Atlas Fitness Club', 'contenu' => 'Votre Pack 10 séances est actif. Réservez vos créneaux depuis le planning !', 'type' => 'succes']);
    }
}
