<?php

use Illuminate\Support\Facades\Route;

// L'interface React (frontend/) est compilée dans public/spa et servie par cette vue.
Route::get('/{any?}', fn () => view('spa'))->where('any', '^(?!api/).*$');
