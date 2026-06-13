'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import { RankingPodium } from '@/components/ranking-podium';
import type { RankingEntry, Room } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

const PAGE_SIZE = 15;

export default function RoomRankingPage() {
  const params = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [navigationMessage, setNavigationMessage] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setError('');

    Promise.all([
      apiRequest<Room>(`/rooms/${params.id}`),
      apiRequest<RankingEntry[]>(`/rankings/rooms/${params.id}`),
    ])
      .then(([nextRoom, nextRanking]) => {
        setRoom(nextRoom);
        setRanking(nextRanking);
      })
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar el podio de la sala'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const filteredRanking = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return ranking;
    }

    return ranking.filter((entry) =>
      [entry.name, entry.email].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [ranking, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRanking.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageEntries = filteredRanking.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <PrivateRoute>
      <AppShell
        title={room ? `Podio completo de ${room.name}` : 'Podio completo de la sala'}
        subtitle="Revisa el ranking completo de esta sala con busqueda, paginacion y acceso al historial de cada participante."
      >
        {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {!isLoading && ranking.length > 0 ? (
          <div className="mb-6">
            <RankingPodium entries={ranking.slice(0, 3)} />
          </div>
        ) : null}

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="block w-full max-w-xl">
              <span className="text-sm font-black text-ink">Buscar participante</span>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                  placeholder="Filtra por nombre o correo"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </label>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-black text-ink transition hover:border-action hover:text-action"
                href={`/rooms/${params.id}`}
                onClick={() => setNavigationMessage('Volviendo al detalle de la sala...')}
              >
                Volver a la sala
              </Link>
              <div className="rounded-xl bg-slate-50 px-4 py-2">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Resultados
                </p>
                <p className="text-sm font-black text-ink">{filteredRanking.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
          <div className="hidden lg:grid grid-cols-[72px_minmax(0,2.2fr)_110px_112px_160px] gap-6 border-b border-white/10 bg-[#082442] px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-blue-200">
            <span>Pos.</span>
            <span>Participante</span>
            <span className="text-center">Pred.</span>
            <span className="text-center">Puntos</span>
            <span className="text-center">Detalle</span>
          </div>

          {!isLoading && filteredRanking.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">No se encontraron resultados.</p>
          ) : null}

          <div className="lg:hidden divide-y divide-slate-100">
            {pageEntries.map((entry) => (
              <article
                className="bg-white px-5 py-4"
                id={`ranking-row-${entry.userId}`}
                key={entry.userId}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Pos. #{entry.position}
                    </p>
                    <Link
                      className="mt-1 block min-w-0 rounded-lg py-1 transition hover:text-action"
                      href={`/rooms/${params.id}/users/${entry.userId}/predictions`}
                      onClick={() => setNavigationMessage('Abriendo historial del participante...')}
                    >
                      <strong className="block break-words text-base font-black text-ink">
                        {entry.name}
                      </strong>
                      <span className="block break-words text-xs text-slate-500">
                        {entry.email}
                      </span>
                    </Link>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      Puntos
                    </p>
                    <p className="mt-1 text-lg font-black text-action">{entry.totalPoints}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricBox label="Predicciones" value={entry.predictionsCount} />
                  <Link
                    className="inline-flex items-center justify-center rounded-xl bg-blue-50 px-3 py-3 text-sm font-black text-action transition hover:bg-blue-100"
                    href={`/rooms/${params.id}/users/${entry.userId}/predictions`}
                    onClick={() => setNavigationMessage('Abriendo historial del participante...')}
                  >
                    Ver predicciones
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden lg:block">
            {pageEntries.map((entry) => (
              <div
                className="grid grid-cols-[72px_minmax(0,2.2fr)_110px_112px_160px] items-center gap-6 px-5 py-5 text-sm"
                id={`ranking-row-${entry.userId}`}
                key={entry.userId}
              >
                <span className="font-black text-ink">#{entry.position}</span>
                <Link
                  className="block min-w-0 rounded-lg px-2 py-1 transition hover:bg-blue-50"
                  href={`/rooms/${params.id}/users/${entry.userId}/predictions`}
                  onClick={() => setNavigationMessage('Abriendo historial del participante...')}
                >
                  <strong className="block truncate text-ink">{entry.name}</strong>
                  <span className="block truncate text-xs text-slate-500">{entry.email}</span>
                </Link>
                <span className="text-center font-semibold text-slate-600">
                  {entry.predictionsCount}
                </span>
                <span className="text-center font-black text-action">
                  {entry.totalPoints}
                </span>
                <Link
                  className="text-center text-sm font-black text-action hover:text-[#0b4cc4]"
                  href={`/rooms/${params.id}/users/${entry.userId}/predictions`}
                  onClick={() => setNavigationMessage('Abriendo historial del participante...')}
                >
                  Ver predicciones
                </Link>
              </div>
            ))}
          </div>
        </section>

        {totalPages > 1 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Pagina {safePage} de {totalPages}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-ink transition hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-50"
                disabled={safePage <= 1}
                type="button"
                onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-ink transition hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-50"
                disabled={safePage >= totalPages}
                type="button"
                onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
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
        <p className="mt-2 text-sm leading-6 text-slate-500">Preparando la informacion.</p>
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

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-ink">{value}</p>
    </div>
  );
}
