'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { MatchCard } from '@/components/match-card';
import { PrivateRoute } from '@/components/layout/private-route';
import { useAuth } from '@/features/auth/auth-context';
import { getStatusLabel } from '@/features/user-panel/formatters';
import type { Match, Prediction, Room } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function RoomPredictionsPage() {
  const params = useParams<{ id: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMessage, setNavigationMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');

    Promise.all([
      apiRequest<Room>(`/rooms/${params.id}`),
      apiRequest<Match[]>('/matches?status=SCHEDULED'),
    ])
      .then(([nextRoom, nextMatches]) => {
        setRoom(nextRoom);
        setMatches(nextMatches);
      })
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar la sala'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setPredictions([]);
      return;
    }

    apiRequest<Prediction[]>(`/predictions/room/${params.id}`)
      .then((nextPredictions) =>
        setPredictions(
          nextPredictions.filter((prediction) => prediction.user?.id === user.id),
        ),
      )
      .catch(() => setPredictions([]));
  }, [isAuthLoading, params.id, user]);

  const upcomingMatches = useMemo(
    () => matches.filter((match) => match.status === 'SCHEDULED'),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const orderedMatches = [...upcomingMatches].sort(
      (left, right) => new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime(),
    );

    if (!normalizedSearch) {
      return orderedMatches;
    }

    return orderedMatches.filter((match) =>
      [
        match.homeTeam.name,
        match.homeTeam.shortName ?? '',
        match.awayTeam.name,
        match.awayTeam.shortName ?? '',
        getStatusLabel(match.status),
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [searchTerm, upcomingMatches]);

  const predictionProgressByMatch = useMemo(() => {
    const counts = new Map<string, number>();

    predictions.forEach((prediction) => {
      counts.set(prediction.match.id, (counts.get(prediction.match.id) ?? 0) + 1);
    });

    return counts;
  }, [predictions]);

  return (
    <PrivateRoute>
      <AppShell
        title={room ? `Predicciones de ${room.name}` : 'Predicciones de la sala'}
        subtitle="Haz tus pronósticos dentro de esta sala para que cuenten en su podio propio."
      >
        {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {room ? (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,35,66,0.10)] sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-action">
                  Predicciones de sala
                </p>
                <h2 className="mt-2 text-2xl font-black text-ink">{room.name}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Las predicciones que hagas desde aquí quedarán asociadas a esta sala y no
                  afectarán tu ranking global.
                </p>
              </div>
              <Link
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-black text-ink transition hover:border-action hover:text-action md:w-auto"
                href={`/rooms/${room.id}`}
                onClick={() => setNavigationMessage('Volviendo al detalle de la sala...')}
              >
                Volver a la sala
              </Link>
            </div>
          </section>
        ) : null}

        {room ? (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="block w-full max-w-xl">
                <span className="text-sm font-black text-ink">Buscar partido</span>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <SearchIcon />
                  </span>
                  <input
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                    placeholder="Filtra por equipos o estado"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </label>
              <div className="rounded-xl bg-slate-50 px-4 py-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Resultados
                </p>
                <p className="text-sm font-black text-ink">{filteredMatches.length}</p>
              </div>
            </div>
          </section>
        ) : null}

        {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}

        {!isLoading && upcomingMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No hay partidos programados para hacer predicciones en este momento.
          </div>
        ) : null}

        {!isLoading && upcomingMatches.length > 0 && filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            No se encontraron partidos que coincidan con el filtro.
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {filteredMatches.map((match) => (
            <MatchCard
              href={`/matches/${match.id}?roomId=${params.id}&returnTo=${encodeURIComponent(
                `/rooms/${params.id}/predictions`,
              )}`}
              key={match.id}
              match={match}
              predictionProgress={{
                current: predictionProgressByMatch.get(match.id) ?? 0,
                total: 3,
              }}
              onNavigate={() => setNavigationMessage('Abriendo partido para predecir en esta sala...')}
            />
          ))}
        </div>
      </AppShell>
    </PrivateRoute>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-action" />
        <p className="mt-4 text-base font-black text-ink">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Preparando el contexto de la sala.
        </p>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path
        d="M9.167 15.833A6.667 6.667 0 1 0 9.167 2.5a6.667 6.667 0 0 0 0 13.333Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path
        d="m14.167 14.167 3.333 3.333"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
