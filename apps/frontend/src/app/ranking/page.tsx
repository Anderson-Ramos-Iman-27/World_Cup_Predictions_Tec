'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { RankingPodium } from '@/components/ranking-podium';
import { useAuth } from '@/features/auth/auth-context';
import type { RankingEntry } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

const PAGE_SIZE = 15;

export default function RankingPage() {
  const { user } = useAuth();
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    apiRequest<RankingEntry[]>('/rankings/global')
      .then(setRanking)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar ranking'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const filteredRanking = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return ranking;
    }

    return ranking.filter((entry) =>
      [entry.name, entry.email].some((value) =>
        value.toLowerCase().includes(normalizedSearch),
      ),
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

  const myEntry = ranking.find((entry) => entry.userId === user?.id);

  function handleGoToMyRanking() {
    if (!myEntry) {
      return;
    }

    setSearchTerm('');
    const nextPage = Math.max(1, Math.ceil(myEntry.position / PAGE_SIZE));
    setCurrentPage(nextPage);

    window.setTimeout(() => {
      document.getElementById(`ranking-row-${myEntry.userId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 50);
  }

  return (
    <AppShell
      title="Ranking global"
      subtitle="Compara el rendimiento acumulado de todos los participantes."
    >
      {isLoading ? <LoadingOverlay message="Cargando clasificación..." /> : null}
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
            <button
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-black text-ink transition hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!myEntry}
              type="button"
              onClick={handleGoToMyRanking}
            >
              Ver mi posición
            </button>
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
        <div className="grid grid-cols-[70px_1fr_90px_100px_130px] gap-3 border-b border-white/10 bg-[#082442] px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-blue-200">
          <span>Pos.</span>
          <span>Participante</span>
          <span className="text-right">Pred.</span>
          <span className="text-right">Puntos</span>
          <span className="text-right">Detalle</span>
        </div>
        {!isLoading && filteredRanking.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No se encontraron resultados.</p>
        ) : null}
        {pageEntries.map((entry) => (
          <div
            className={`grid grid-cols-[70px_1fr_90px_100px_130px] gap-3 px-5 py-4 text-sm ${
              entry.userId === user?.id ? 'bg-blue-50' : 'bg-white'
            }`}
            id={`ranking-row-${entry.userId}`}
            key={entry.userId}
          >
            <span className="font-black text-ink">#{entry.position}</span>
            <Link
              className="block rounded-lg px-2 py-1 transition hover:bg-blue-50"
              href={`/users/${entry.userId}/predictions`}
            >
              <strong className="block text-ink">{entry.name}</strong>
              <span className="text-xs text-slate-500">{entry.email}</span>
            </Link>
            <span className="text-right font-semibold text-slate-600">
              {entry.predictionsCount}
            </span>
            <span className="text-right font-black text-action">
              {entry.totalPoints}
            </span>
            <Link
              className="text-right text-sm font-black text-action hover:text-[#0b4cc4]"
              href={`/users/${entry.userId}/predictions`}
            >
              Ver predicciones
            </Link>
          </div>
        ))}
      </section>

      {totalPages > 1 ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Página {safePage} de {totalPages}
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
