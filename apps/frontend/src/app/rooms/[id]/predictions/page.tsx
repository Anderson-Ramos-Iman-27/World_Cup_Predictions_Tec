'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { MatchCard } from '@/components/match-card';
import { PrivateRoute } from '@/components/layout/private-route';
import { useAuth } from '@/features/auth/auth-context';
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
  const [dateFilter, setDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    setError('');

    Promise.all([apiRequest<Room>(`/rooms/${params.id}`), apiRequest<Match[]>('/matches?status=SCHEDULED')])
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
        setPredictions(nextPredictions.filter((prediction) => prediction.user?.id === user.id)),
      )
      .catch(() => setPredictions([]));
  }, [isAuthLoading, params.id, user]);

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter((match) => match.status === 'SCHEDULED')
        .sort((left, right) => new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime()),
    [matches],
  );

  const dateOptions = useMemo(() => {
    const uniqueDates = [...new Set(upcomingMatches.map((match) => getDateKey(match.utcDate)))];

    return uniqueDates.sort().map((value) => ({
      value,
      label: formatDateOption(value),
    }));
  }, [upcomingMatches]);

  const filteredMatches = useMemo(() => {
    if (dateFilter === 'ALL') {
      return upcomingMatches;
    }

    return upcomingMatches.filter((match) => getDateKey(match.utcDate) === dateFilter);
  }, [dateFilter, upcomingMatches]);

  const predictionProgressByMatch = useMemo(() => {
    const counts = new Map<string, number>();

    predictions.forEach((prediction) => {
      counts.set(prediction.match.id, (counts.get(prediction.match.id) ?? 0) + 1);
    });

    return counts;
  }, [predictions]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMatches = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, safeCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <PrivateRoute>
      <AppShell
        title={room ? `Predicciones de ${room.name}` : 'Predicciones de la sala'}
        subtitle="Haz tus pronosticos dentro de esta sala para que cuenten en su podio propio."
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
                  Las predicciones que hagas desde aqui quedaran asociadas a esta sala y no afectaran
                  tu ranking global.
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
                <span className="text-sm font-black text-ink">Buscar por fecha</span>
                <select
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                >
                  <option value="ALL">Todas las fechas</option>
                  {dateOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
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
          {paginatedMatches.map((match) => (
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

        {!isLoading && filteredMatches.length > 0 ? (
          <Pagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
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
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Preparando el contexto de la sala.
        </p>
      </div>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <PaginationButton
        ariaLabel="Pagina anterior"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ArrowLeftIcon />
      </PaginationButton>

      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-black text-white/70"
            key={`ellipsis-${index}`}
          >
            ...
          </span>
        ) : (
          <PaginationButton active={page === currentPage} key={page} onClick={() => onPageChange(page)}>
            {page}
          </PaginationButton>
        ),
      )}

      <PaginationButton
        ariaLabel="Pagina siguiente"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ArrowRightIcon />
      </PaginationButton>
    </div>
  );
}

function PaginationButton({
  active = false,
  ariaLabel,
  children,
  disabled = false,
  onClick,
}: {
  active?: boolean;
  ariaLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-4 text-sm font-black transition ${
        active
          ? 'bg-action text-white shadow-[0_14px_34px_rgba(15,35,66,0.22)]'
          : 'bg-[#0a1f3a] text-white hover:bg-action'
      } disabled:cursor-not-allowed disabled:opacity-40`}
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push('ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis');
  }

  pages.push(totalPages);

  return pages;
}

function ArrowLeftIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path
        d="M12.5 15 7.5 10l5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 20 20" width="18">
      <path
        d="m7.5 5 5 5-5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateOption(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
