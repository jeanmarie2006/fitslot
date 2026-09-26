<?php

namespace App\Http\Controllers;

use App\Models\Abonnement;
use App\Models\Creneau;
use App\Models\Notif;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreneauController extends Controller
{
    public const DISCIPLINES = ['Musculation', 'Cardio', 'Yoga', 'Boxe', 'Cross-training', 'Danse'];

    private function coach(Request $request): User
    {
        abort_unless($request->user()?->role === 'coach', 403, 'Réservé aux coachs.');

        return $request->user();
    }

    private function fmt(Creneau $c, ?User $me, $mesRes): array
    {
        $inscrits = $c->confirmees_count ?? $c->confirmees()->count();
        $mine = $mesRes[$c->id] ?? null;

        return [
            'id' => $c->id, 'titre' => $c->titre, 'discipline' => $c->discipline, 'debut' => $c->debut->toIso8601String(), 'fin' => $c->fin->toIso8601String(),
            'duree' => $c->duree, 'capacite' => $c->capacite, 'inscrits' => $inscrits, 'restantes' => max(0, $c->capacite - $inscrits), 'prix' => $c->prix,
            'salle' => $c->salle, 'statut' => $c->statut, 'coach' => ['id' => $c->coach_id, 'name' => $c->coach->name ?? null],
            'ma_reservation' => $mine ? ['id' => $mine->id, 'statut' => $mine->statut] : null,
        ];
    }

    /** Planning public (avec, si connecté, l'état de mes réservations). */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $from = Carbon::parse($request->query('from', now()->startOfWeek()))->startOfDay();
        $to = Carbon::parse($request->query('to', now()->addWeeks(2)))->endOfDay();
        $liste = Creneau::with('coach:id,name')->withCount('confirmees')->whereBetween('debut', [$from, $to])->orderBy('debut')->limit(400)->get();
        $me = $request->user('sanctum');
        $mes = $me ? Reservation::where('client_id', $me->id)->whereIn('creneau_id', $liste->pluck('id'))->where('statut', 'confirmee')->get()->keyBy('creneau_id') : collect();

        return response()->json($liste->map(fn ($c) => $this->fmt($c, $me, $mes)));
    }

    public function store(Request $request): JsonResponse
    {
        $coach = $this->coach($request);
        $data = $request->validate([
            'discipline' => ['required', 'in:'.implode(',', self::DISCIPLINES)],
            'titre' => ['required', 'string', 'max:80'],
            'debut' => ['required', 'date', 'after:now'],
            'duree' => ['required', 'integer', 'between:20,180'],
            'capacite' => ['required', 'integer', 'between:1,60'],
            'prix' => ['required', 'integer', 'between:0,50000'],
            'salle' => ['nullable', 'string', 'max:40'],
            'jours' => ['nullable', 'array', 'max:7'], 'jours.*' => ['integer', 'between:1,7'],
            'semaines' => ['nullable', 'integer', 'between:1,12'],
        ]);
        $debut = Carbon::parse($data['debut']);
        $dates = [$debut];
        $serie = null;
        if (! empty($data['jours']) && ! empty($data['semaines'])) {
            $serie = (string) Str::uuid();
            $dates = [];
            for ($d = $debut->copy()->startOfWeek(); $d->lt($debut->copy()->addWeeks($data['semaines'])->endOfWeek()); $d->addDay()) {
                if (in_array($d->dayOfWeekIso, $data['jours'], true)) {
                    $x = $d->copy()->setTimeFrom($debut);
                    if ($x->gte($debut)) {
                        $dates[] = $x;
                    }
                }
            }
            abort_if(count($dates) === 0, 422, 'Aucune date à créer avec ces jours.');
        }
        foreach ($dates as $x) {
            Creneau::create(['coach_id' => $coach->id, 'discipline' => $data['discipline'], 'titre' => strip_tags($data['titre']), 'debut' => $x, 'duree' => $data['duree'], 'capacite' => $data['capacite'], 'prix' => $data['prix'], 'salle' => ($data['salle'] ?? null) ?: 'Salle principale', 'serie' => $serie]);
        }

        return response()->json(['created' => count($dates)], 201);
    }

    public function inscrits(Request $request, Creneau $creneau): JsonResponse
    {
        $this->coach($request);

        return response()->json([
            'creneau' => $creneau->load('coach:id,name'),
            'inscrits' => $creneau->confirmees()->with('client:id,name,email,telephone')->get()->map(fn ($r) => ['id' => $r->id, 'client' => $r->client, 'paiement' => $r->paiement, 'paye' => $r->paye, 'present' => $r->present]),
        ]);
    }

    public function annuler(Request $request, Creneau $creneau): JsonResponse
    {
        $this->coach($request);
        abort_unless($creneau->statut === 'ouvert', 422, 'Ce créneau est déjà annulé.');
        DB::transaction(function () use ($creneau) {
            $creneau->update(['statut' => 'annule']);
            foreach ($creneau->confirmees()->with('client', 'abonnement', 'creneau')->get() as $r) {
                Booking::annuler($r, true);
            }
        });

        return response()->json(['message' => 'Séance annulée ; les inscrits ont été prévenus.']);
    }

    public function presence(Request $request, Reservation $reservation): JsonResponse
    {
        $this->coach($request);
        $reservation->update(['present' => $request->validate(['present' => ['required', 'boolean']])['present']]);

        return response()->json($reservation);
    }

    /** Statistiques de fréquentation et de revenus (30 derniers jours). */
    public function stats(Request $request): JsonResponse
    {
        $this->coach($request);
        $from = now()->subDays(30);
        $passes = Creneau::where('statut', 'ouvert')->whereBetween('debut', [$from, now()])->withCount('confirmees')->get();
        $places = $passes->sum('capacite');
        $inscr = $passes->sum('confirmees_count');
        $parJour = collect(range(1, 7))->map(function ($i) use ($passes) {
            $j = $passes->filter(fn ($c) => $c->debut->dayOfWeekIso === $i);

            return ['jour' => ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][$i - 1], 'inscrits' => (int) $j->sum('confirmees_count'), 'capacite' => (int) $j->sum('capacite')];
        });
        $parDiscipline = $passes->groupBy('discipline')->map(fn ($g, $d) => ['discipline' => $d, 'inscrits' => (int) $g->sum('confirmees_count'), 'seances' => $g->count()])->values();
        $revSeances = Reservation::where('reservations.statut', 'confirmee')->whereIn('paiement', ['momo', 'moov'])->join('creneaux', 'creneaux.id', '=', 'reservations.creneau_id')->whereBetween('creneaux.debut', [$from, now()])->sum('creneaux.prix');
        $revAbos = Abonnement::where('created_at', '>=', $from)->sum('prix');
        $top = Reservation::where('reservations.statut', 'confirmee')->join('creneaux', 'creneaux.id', '=', 'reservations.creneau_id')->whereBetween('creneaux.debut', [$from, now()])
            ->select('client_id', DB::raw('count(*) as seances'))->groupBy('client_id')->orderByDesc('seances')->limit(5)->with('client:id,name')->get()
            ->map(fn ($r) => ['name' => $r->client->name ?? '—', 'seances' => (int) $r->seances]);
        $prochaines = Creneau::where('statut', 'ouvert')->where('debut', '>', now())->withCount('confirmees')->orderBy('debut')->limit(80)->get()
            ->filter(fn ($c) => $c->confirmees_count >= $c->capacite * 0.8)->take(5)->map(fn ($c) => ['id' => $c->id, 'titre' => $c->titre, 'debut' => $c->debut->toIso8601String(), 'inscrits' => $c->confirmees_count, 'capacite' => $c->capacite])->values();

        return response()->json([
            'seances' => $passes->count(), 'inscriptions' => (int) $inscr, 'taux_remplissage' => $places ? round($inscr / $places * 100) : 0,
            'revenus' => (int) ($revSeances + $revAbos), 'revenus_seances' => (int) $revSeances, 'ventes_abonnements' => (int) $revAbos, 'clients' => User::where('role', 'client')->count(),
            'par_jour' => $parJour, 'par_discipline' => $parDiscipline, 'top_clients' => $top, 'presque_pleines' => $prochaines,
        ]);
    }

    /** Rappels de la veille (l'hébergement gratuit n'a pas de tâche planifiée : le coach peut aussi les déclencher ici). */
    public function rappels(Request $request): JsonResponse
    {
        $this->coach($request);

        return response()->json(['envoyes' => self::envoyerRappels()]);
    }

    public static function envoyerRappels(): int
    {
        $n = 0;
        $demain = Creneau::where('statut', 'ouvert')->whereBetween('debut', [now()->addDay()->startOfDay(), now()->addDay()->endOfDay()])->get();
        foreach ($demain as $c) {
            foreach ($c->confirmees()->with('client')->get() as $r) {
                if (Notif::where('user_id', $r->client_id)->where('type', 'rappel')->where('contenu', 'like', "%#{$c->id}%")->doesntExist()) {
                    Notif::envoyer($r->client, 'Rappel : séance demain', "Rappel : « {$c->titre} » demain à {$c->debut->format('H\hi')} ({$c->salle}). #{$c->id}", 'rappel');
                    $n++;
                }
            }
        }

        return $n;
    }
}
