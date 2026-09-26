<?php

namespace Tests\Feature;

use App\Models\Abonnement;
use App\Models\Creneau;
use App\Models\Notif;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FitSlotTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, string $email = null): User
    {
        return User::create(['name' => ucfirst($role), 'email' => $email ?? "$role@test.bj", 'password' => 'motdepasse', 'role' => $role]);
    }

    private function creneau(User $coach, string $quand = '+1 day', int $cap = 2): Creneau
    {
        return Creneau::create(['coach_id' => $coach->id, 'discipline' => 'Yoga', 'titre' => 'Yoga test', 'debut' => now()->modify($quand), 'duree' => 60, 'capacite' => $cap, 'prix' => 2500]);
    }

    private function abo(User $c, ?int $seances = 5): Abonnement
    {
        return Abonnement::create(['client_id' => $c->id, 'offre' => 'pack5', 'libelle' => 'Pack 5', 'seances_total' => $seances, 'seances_restantes' => $seances, 'expire_le' => now()->addMonth()->toDateString(), 'prix' => 15000]);
    }

    public function test_inscription_cree_uniquement_des_clients(): void
    {
        $r = $this->postJson('/api/auth/register', ['name' => 'Awa', 'email' => 'awa@test.bj', 'password' => 'motdepasse', 'role' => 'coach'])->assertCreated();
        $this->assertSame('client', $r->json('user.role'));
    }

    public function test_reservation_sur_place_et_capacite(): void
    {
        $coach = $this->user('coach');
        $c = $this->creneau($coach, '+1 day', 1);
        $a = $this->user('client', 'a@test.bj');
        $b = $this->user('client', 'b@test.bj');

        $this->actingAs($a, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'sur_place'])->assertCreated();
        $this->actingAs($a, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'sur_place'])->assertStatus(422); // doublon
        $this->actingAs($b, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'sur_place'])->assertStatus(422)->assertJsonPath('message', 'Ce créneau est complet.');
        $this->assertSame(1, Notif::where('user_id', $a->id)->count(), 'notification de confirmation');
    }

    public function test_seul_un_client_reserve_et_seul_un_coach_cree(): void
    {
        $coach = $this->user('coach');
        $c = $this->creneau($coach);
        $this->actingAs($coach, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'sur_place'])->assertForbidden();
        $client = $this->user('client');
        $this->actingAs($client, 'sanctum')->postJson('/api/creneaux', ['discipline' => 'Yoga', 'titre' => 'X', 'debut' => now()->addDay()->toDateTimeString(), 'duree' => 60, 'capacite' => 10, 'prix' => 2500])->assertForbidden();
    }

    public function test_abonnement_consomme_puis_rend_une_seance(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $ab = $this->abo($client, 5);
        $c = $this->creneau($coach, '+2 days');

        $r = $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'abonnement'])->assertCreated()->json('id');
        $this->assertSame(4, $ab->fresh()->seances_restantes);
        $this->actingAs($client, 'sanctum')->postJson("/api/reservations/{$r}/annuler")->assertOk();
        $this->assertSame(5, $ab->fresh()->seances_restantes);
    }

    public function test_pas_d_abonnement_valable_ou_epuise(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $c = $this->creneau($coach);
        $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'abonnement'])->assertStatus(422);
        $ab = $this->abo($client, 5);
        $ab->update(['seances_restantes' => 0]);
        $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'abonnement'])->assertStatus(422);
    }

    public function test_paiement_mobile_money_simule_et_numero_invalide(): void
    {
        $c = $this->creneau($this->user('coach'));
        $client = $this->user('client');
        $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'momo', 'numero' => 'abc'])->assertStatus(422);
        $r = $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'momo', 'numero' => '+229 01 96 00 00 00'])->assertCreated();
        $this->assertTrue($r->json('paye'));
        $this->assertStringStartsWith('MOMO-', $r->json('paiement_ref'));
    }

    public function test_annulation_impossible_moins_de_deux_heures_avant(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $c = $this->creneau($coach, '+1 hour');
        $r = Reservation::create(['creneau_id' => $c->id, 'client_id' => $client->id]);
        $this->actingAs($client, 'sanctum')->postJson("/api/reservations/{$r->id}/annuler")->assertStatus(422);
        $this->actingAs($this->user('client', 'autre@test.bj'), 'sanctum')->postJson("/api/reservations/{$r->id}/annuler")->assertForbidden();
    }

    public function test_report_vers_un_autre_creneau(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $a = $this->creneau($coach, '+1 day');
        $b = $this->creneau($coach, '+2 days');
        $r = Reservation::create(['creneau_id' => $a->id, 'client_id' => $client->id]);

        $this->actingAs($client, 'sanctum')->postJson("/api/reservations/{$r->id}/reporter", ['creneau_id' => $a->id])->assertStatus(422);
        $this->actingAs($client, 'sanctum')->postJson("/api/reservations/{$r->id}/reporter", ['creneau_id' => $b->id])->assertOk();
        $this->assertSame($b->id, $r->fresh()->creneau_id);
    }

    public function test_le_coach_annule_une_seance_et_les_inscrits_sont_prevenus_et_rembourses_en_seance(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $ab = $this->abo($client, 5);
        $c = $this->creneau($coach);
        $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/reserver", ['paiement' => 'abonnement'])->assertCreated();
        $this->assertSame(4, $ab->fresh()->seances_restantes);

        $this->actingAs($client, 'sanctum')->postJson("/api/creneaux/{$c->id}/annuler")->assertForbidden();
        $this->actingAs($coach, 'sanctum')->postJson("/api/creneaux/{$c->id}/annuler")->assertOk();
        $this->assertSame('annule', $c->fresh()->statut);
        $this->assertSame(5, $ab->fresh()->seances_restantes);
        $this->assertTrue(Notif::where('user_id', $client->id)->where('sujet', 'Séance annulée')->exists());
    }

    public function test_creation_de_seances_recurrentes(): void
    {
        $coach = $this->user('coach');
        $debut = now()->addDay()->setTime(18, 30)->toDateTimeString();
        $r = $this->actingAs($coach, 'sanctum')->postJson('/api/creneaux', ['discipline' => 'Boxe', 'titre' => 'Boxe', 'debut' => $debut, 'duree' => 60, 'capacite' => 12, 'prix' => 3000, 'jours' => [1, 3], 'semaines' => 3])->assertCreated();
        $this->assertGreaterThanOrEqual(3, $r->json('created'));
        $this->assertSame($r->json('created'), Creneau::whereNotNull('serie')->count());
        $this->actingAs($coach, 'sanctum')->postJson('/api/creneaux', ['discipline' => 'Inconnue', 'titre' => 'X', 'debut' => $debut, 'duree' => 60, 'capacite' => 12, 'prix' => 3000])->assertStatus(422);
    }

    public function test_rappels_de_la_veille_sans_doublon(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $c = $this->creneau($coach, 'tomorrow 10:00');
        Reservation::create(['creneau_id' => $c->id, 'client_id' => $client->id]);
        $this->actingAs($coach, 'sanctum')->postJson('/api/coach/rappels')->assertOk()->assertJsonPath('envoyes', 1);
        $this->actingAs($coach, 'sanctum')->postJson('/api/coach/rappels')->assertOk()->assertJsonPath('envoyes', 0);
    }

    public function test_planning_public_indique_ma_reservation(): void
    {
        $coach = $this->user('coach');
        $client = $this->user('client');
        $c = $this->creneau($coach);
        Reservation::create(['creneau_id' => $c->id, 'client_id' => $client->id]);
        $this->getJson('/api/creneaux')->assertOk()->assertJsonPath('0.ma_reservation', null)->assertJsonPath('0.inscrits', 1);
        $this->actingAs($client, 'sanctum')->getJson('/api/creneaux')->assertJsonPath('0.ma_reservation.statut', 'confirmee');
    }
}
