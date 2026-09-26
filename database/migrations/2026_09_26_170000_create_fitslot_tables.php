<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('telephone', 30)->nullable();
        });

        Schema::create('creneaux', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coach_id')->constrained('users')->cascadeOnDelete();
            $table->string('discipline', 40)->index();       // Musculation, Yoga, Cardio…
            $table->string('titre', 80);
            $table->dateTime('debut')->index();
            $table->unsignedSmallInteger('duree')->default(60);   // minutes
            $table->unsignedSmallInteger('capacite')->default(10);
            $table->unsignedInteger('prix')->default(2500);       // FCFA la séance
            $table->string('salle', 40)->default('Salle principale');
            $table->string('statut', 10)->default('ouvert');      // ouvert | annule
            $table->string('serie', 36)->nullable();
            $table->timestamps();
        });

        Schema::create('abonnements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->string('offre', 20);                          // pack5 | pack10 | mensuel
            $table->string('libelle', 60);
            $table->unsignedSmallInteger('seances_total')->nullable();     // null = illimité
            $table->unsignedSmallInteger('seances_restantes')->nullable();
            $table->date('expire_le');
            $table->unsignedInteger('prix');
            $table->string('paiement_mode', 10)->nullable();
            $table->string('paiement_ref', 24)->nullable();
            $table->timestamps();
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('creneau_id')->constrained('creneaux')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('users')->cascadeOnDelete();
            $table->string('statut', 10)->default('confirmee');        // confirmee | annulee
            $table->string('paiement', 12)->default('sur_place');       // sur_place | abonnement | momo | moov
            $table->string('paiement_ref', 24)->nullable();
            $table->boolean('paye')->default(false);
            $table->foreignId('abonnement_id')->nullable()->constrained('abonnements')->nullOnDelete();
            $table->boolean('present')->nullable();
            $table->timestamps();
            $table->unique(['creneau_id', 'client_id']);
        });

        // « Boîte d'envoi » : notifications affichées dans l'application et e-mails simulés (l'hébergement gratuit n'envoie pas d'e-mails)
        Schema::create('notifications_app', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('sujet', 120);
            $table->text('contenu');
            $table->string('type', 20)->default('info');
            $table->boolean('lu')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['notifications_app', 'reservations', 'abonnements', 'creneaux'] as $t) {
            Schema::dropIfExists($t);
        }
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('telephone'));
    }
};
