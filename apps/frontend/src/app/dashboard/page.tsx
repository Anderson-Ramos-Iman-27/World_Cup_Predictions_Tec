'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { HomeCarousel } from '@/components/home-carousel';
import { MatchCard } from '@/components/match-card';
import { RankingPodium } from '@/components/ranking-podium';
import { useAuth } from '@/features/auth/auth-context';
import { calculateCurrentStreak } from '@/features/user-panel/formatters';
import { apiRequest } from '@/lib/http-client';
import type {
  CarouselSlide,
  Match,
  Prediction,
  RankingEntry,
  Room,
} from '@/features/user-panel/types';

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMessage, setNavigationMessage] = useState('');

  useEffect(() => {
    Promise.all([
      apiRequest<CarouselSlide[]>('/carousel-slides').catch(() => []),
      apiRequest<Match[]>('/matches?status=SCHEDULED').catch(() => []),
      apiRequest<RankingEntry[]>('/rankings/global').catch(() => []),
    ]).then(([nextSlides, nextMatches, nextRanking]) => {
      setSlides(nextSlides);
      setMatches(nextMatches);
      setRanking(nextRanking);
    });
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setRooms([]);
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      apiRequest<Room[]>('/rooms/my'),
      apiRequest<Prediction[]>('/predictions/my'),
    ])
      .then(([nextRooms, nextPredictions]) => {
        setRooms(nextRooms);
        setPredictions(nextPredictions);
      })
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar el panel'),
      )
      .finally(() => setIsLoading(false));
  }, [isAuthLoading, user]);

  const myRank = useMemo(
    () => ranking.find((entry) => entry.userId === user?.id),
    [ranking, user?.id],
  );
  const currentStreak = useMemo(
    () => calculateCurrentStreak(predictions),
    [predictions],
  );

  return (
    <AppShell
      title={user ? `Hola, ${user.name}` : 'Panel del participante'}
      subtitle={
        user
          ? 'Consulta tus próximos partidos, predicciones, salas y posicion en el ranking.'
          : 'Explora la plataforma e inicia sesion para gestionar tus salas y predicciones.'
      }
      heroContent={<HomeCarousel slides={slides} />}
    >
        {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {user ? (
          <section className="mb-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
            <div className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-action">
                  Bienvenido de vuelta
                </p>
                <h2 className="mt-2 text-2xl font-black text-ink">
                  Hola, {user.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Revisa los partidos abiertos, registra nuevas predicciones y sigue tu avance en el ranking global y en tus salas.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-action px-5 text-sm font-black text-white transition hover:bg-blue-700"
                  href="/matches"
                >
                  Ver partidos
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-black text-ink transition hover:border-action hover:text-action"
                  href="/predictions"
                >
                  Mis predicciones
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Partidos abiertos" value={matches.length} href="/matches" />
          <SummaryCard
            label={user ? 'Mis salas' : 'Salas'}
            value={user ? rooms.length : 'Disponible con cuenta'}
            href={user ? '/rooms' : '/register'}
          />
          <SummaryCard
            label={user ? 'Predicciones' : 'Predicciones'}
            value={user ? predictions.length : 'Registra una cuenta'}
            href={user ? '/predictions' : '/register'}
          />
          <SummaryCard
            label="Racha actual"
            value={user ? `${currentStreak} aciertos` : 'Disponible con cuenta'}
            href={user ? '/predictions' : '/register'}
          />
          <SummaryCard
            label="Ranking global"
            value={user && myRank ? `#${myRank.position}` : `${ranking.length} jugadores`}
            href="/ranking"
          />
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-ink">Podio global</h2>
            <Link className="text-sm font-bold text-action" href="/ranking">
              Ver clasificación
            </Link>
          </div>
          <RankingPodium entries={ranking.slice(0, 3)} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-ink">Próximos partidos</h2>
              <Link className="text-sm font-bold text-action" href="/matches">
                Ver todos
              </Link>
            </div>
            <div className="mt-4 grid gap-4">
              {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
              {!isLoading && matches.length === 0 ? (
                <p className="text-sm text-slate-500">No hay partidos abiertos.</p>
              ) : null}
              {matches.slice(0, 3).map((match) => (
                <MatchCard
                  href={`/matches/${match.id}`}
                  key={match.id}
                  match={match}
                  onNavigate={() => setNavigationMessage('Abriendo detalle del partido...')}
                />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-ink">
                {user ? 'Mis salas' : 'Ranking global'}
              </h2>
              <Link className="text-sm font-bold text-action" href={user ? '/rooms' : '/ranking'}>
                Ver todos
              </Link>
            </div>

            {user ? (
              <div className="mt-4 space-y-3">
                {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
                {!isLoading && rooms.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Aun no perteneces a ninguna sala.
                  </p>
                ) : null}
                {rooms.slice(0, 5).map((room) => (
                  <div className="flex items-center gap-3" key={room.id}>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: room.color }}
                    />
                    <div>
                      <p className="text-sm font-bold text-ink">{room.name}</p>
                      <p className="text-xs text-slate-500">
                        {room._count?.members ?? 0} integrantes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {ranking.length === 0 ? (
                  <p className="text-sm text-slate-500">Ranking sin datos.</p>
                ) : null}
                {ranking.slice(0, 5).map((entry) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3"
                    key={entry.userId}
                  >
                    <div>
                      <p className="text-sm font-black text-ink">
                        #{entry.position} {entry.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.predictionsCount} predicciones
                      </p>
                    </div>
                    <span className="text-sm font-black text-action">
                      {entry.totalPoints} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
    </AppShell>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-action" />
        <p className="mt-4 text-base font-black text-ink">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Preparando la informacion.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)] transition hover:-translate-y-0.5 hover:border-action"
      href={href}
    >
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-ink">{value}</p>
    </Link>
  );
}
