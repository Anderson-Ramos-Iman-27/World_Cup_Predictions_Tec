import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const root = process.cwd();

function source(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assertIncludes(file, fragments) {
  const content = source(file);

  for (const fragment of fragments) {
    assert.ok(
      content.includes(fragment),
      `Expected ${file} to include: ${fragment}`,
    );
  }
}

describe('frontend auth flow smoke tests', () => {
  it('keeps login wired to auth context and password recovery', () => {
    assertIncludes('src/app/login/page.tsx', [
      'login(',
      'Correo',
      'Olvid',
      'Crear cuenta',
    ]);
  });

  it('keeps register wired to account creation and email verification', () => {
    assertIncludes('src/app/register/page.tsx', [
      'register(',
      'Crear cuenta',
      '/verify-email',
      'PasswordStrengthMeter',
    ]);
  });
});

describe('frontend room flow smoke tests', () => {
  it('keeps room creation, join and navigation feedback available', () => {
    assertIncludes('src/app/rooms/page.tsx', [
      '/rooms',
      '/rooms/join',
      'Crear sala',
      'Ingresar a sala',
      'LoadingOverlay',
    ]);
  });

  it('keeps room edit, podium and member removal confirmation available', () => {
    assertIncludes('src/app/rooms/[id]/page.tsx', [
      'Guardar cambios',
      'Sin cambios',
      'Podio de la sala',
      'Quitar integrante',
      'ConfirmDialog',
    ]);
  });
});

describe('frontend prediction flow smoke tests', () => {
  it('keeps match detail prediction modes and scoring rules visible', () => {
    assertIncludes('src/app/matches/[id]/page.tsx', [
      'EXACT_SCORE',
      'WINNER',
      'GOAL_DIFFERENCE',
      'Resultado exacto',
      'Ganador o empate correcto',
      'Diferencia de goles correcta',
      'Bonus por cada 3 aciertos consecutivos',
    ]);
  });

  it('keeps my predictions styled with score summary and match navigation', () => {
    assertIncludes('src/app/predictions/page.tsx', [
      'Prediccion registrada',
      'Puntos Base',
      'Bonus',
      'Total',
      'Ver partido',
      'getBonusDetail',
    ]);
  });
});

describe('frontend ranking transparency smoke tests', () => {
  it('keeps public user prediction history and contextual back navigation', () => {
    assertIncludes('src/app/users/[id]/predictions/page.tsx', [
      '/rankings/users/',
      'Transparencia de puntaje',
      'router.back()',
      'Detalle del',
      'getBonusDetail',
    ]);
  });
});

describe('frontend admin smoke tests', () => {
  it('keeps admin panel wired to users, teams, matches, sync and carousel', () => {
    assertIncludes('src/app/admin/page.tsx', [
      '/admin/users',
      '/admin/teams',
      '/admin/matches',
      '/admin/sync/football-data',
      '/admin/carousel-slides',
      'Panel de administrador',
    ]);
  });
});
