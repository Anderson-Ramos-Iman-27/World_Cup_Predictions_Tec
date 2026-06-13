'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import { TeamBadge } from '@/components/team-badge';
import {
  formatDateTime,
  getStatusLabel,
} from '@/features/user-panel/formatters';
import type { Prediction } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

type UserPredictionHistory = {
  user: {
    id: string;
    name: string;
    email: string;
  };
  predictions: Prediction[];
};

export default function UserPredictionsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [history, setHistory] = useState<UserPredictionHistory | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMessage, setNavigationMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    apiRequest<UserPredictionHistory>(`/rankings/users/${params.id}/history`)
      .then(setHistory)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar el historial'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const totals = useMemo(() => {
    const predictions = history?.predictions ?? [];

    return {
      count: predictions.length,
      scored: predictions.filter((prediction) => prediction.score).length,
      points: predictions.reduce(
        (total, prediction) => total + (prediction.score?.totalPoints ?? 0),
        0,
      ),
      bonus: predictions.reduce(
        (total, prediction) => total + (prediction.score?.bonusPoints ?? 0),
        0,
      ),
    };
  }, [history]);

  const orderedPredictions = useMemo(() => {
    const predictions = history?.predictions ?? [];

    return [...predictions].sort((left, right) => {
      const matchDiff =
        new Date(left.match.utcDate).getTime() - new Date(right.match.utcDate).getTime();

      if (matchDiff !== 0) {
        return matchDiff;
      }

      return (
        new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime()
      );
    });
  }, [history]);

  const filteredPredictions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const predictions = orderedPredictions;

    if (!normalizedSearch) {
      return predictions;
    }

    return predictions.filter((prediction) =>
      [
        prediction.match.homeTeam.name,
        prediction.match.homeTeam.shortName ?? '',
        prediction.match.awayTeam.name,
        prediction.match.awayTeam.shortName ?? '',
        prediction.room?.name ?? '',
        getPredictionTypeLabel(prediction),
        getStatusLabel(prediction.match.status),
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [orderedPredictions, searchTerm]);

  return (
    <PrivateRoute>
      <AppShell
        title={history ? `Predicciones de ${history.user.name}` : 'Predicciones del participante'}
        subtitle="Consulta sus predicciones y el detalle de puntos como mecanismo de transparencia."
      >
        {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {isLoading ? <p className="text-sm text-slate-500">Cargando historial...</p> : null}

        {history ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-action">
                    Transparencia de puntaje
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-ink">{history.user.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{history.user.email}</p>
                  <button
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-ink transition hover:border-action hover:text-action"
                    type="button"
                    onClick={() => {
                      setNavigationMessage('Volviendo a la pantalla anterior...');
                      router.back();
                    }}
                  >
                    Volver
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Predicciones" value={totals.count} />
                  <Metric label="Calculadas" value={totals.scored} />
                  <Metric label="Bonus" value={totals.bonus} />
                  <Metric label="Puntos" value={totals.points} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <label className="block w-full max-w-xl">
                  <span className="text-sm font-black text-ink">Buscar prediccion</span>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                      <SearchIcon />
                    </span>
                    <input
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                      placeholder="Filtra por partido, sala o estado"
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
                  <p className="text-sm font-black text-ink">{filteredPredictions.length}</p>
                </div>
              </div>
            </section>

            {!isLoading && orderedPredictions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                Este participante aun no tiene predicciones registradas.
              </div>
            ) : null}

            {!isLoading && orderedPredictions.length > 0 && filteredPredictions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                No se encontraron predicciones que coincidan con el filtro.
              </div>
            ) : null}

            <section className="grid gap-4">
              {filteredPredictions.map((prediction) => (
                <PredictionAuditCard
                  prediction={prediction}
                  key={prediction.id}
                  onNavigate={() => setNavigationMessage('Abriendo detalle del partido...')}
                />
              ))}
            </section>
          </div>
        ) : null}
      </AppShell>
    </PrivateRoute>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
    </div>
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

function PredictionAuditCard({
  onNavigate,
  prediction,
}: {
  onNavigate: () => void;
  prediction: Prediction;
}) {
  const statusClasses = getPredictionAuditClasses(prediction);

  return (
    <article className={`rounded-2xl border p-5 shadow-[0_14px_34px_rgba(15,35,66,0.08)] ${statusClasses.card}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-action">
              {getPredictionTypeLabel(prediction)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {getStatusLabel(prediction.match.status)}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses.badge}`}>
              {getPredictionAuditLabel(prediction)}
            </span>
            {prediction.room ? (
              <span
                className="rounded-full px-3 py-1 text-xs font-black text-white"
                style={{ backgroundColor: prediction.room.color }}
              >
                {prediction.room.name}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <TeamBadge
              name={prediction.match.homeTeam.name}
              crestUrl={prediction.match.homeTeam.crestUrl}
            />
            <div className="rounded-lg bg-slate-50 px-4 py-2 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                {prediction.match.status === 'FINISHED' ? 'Resultado final' : 'VS'}
              </p>
              <p className="mt-1 text-sm font-black text-ink">
                {prediction.match.homeScore !== null || prediction.match.awayScore !== null
                  ? `${prediction.match.homeScore ?? '-'} - ${prediction.match.awayScore ?? '-'}`
                  : 'Pendiente'}
              </p>
            </div>
            <TeamBadge
              align="right"
              name={prediction.match.awayTeam.name}
              crestUrl={prediction.match.awayTeam.crestUrl}
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-500">
            Partido: {formatDateTime(prediction.match.utcDate)}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Registrada: {formatDateTime(prediction.submittedAt)}
          </p>
        </div>

        <div className={`rounded-xl border p-4 lg:min-w-80 ${statusClasses.summary}`}>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            PredicciÃ³n registrada
          </p>
          <p className="mt-2 text-2xl font-black text-ink">
            {formatPredictionValue(prediction)}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <PointBox label="Puntos Base" value={prediction.score?.basePoints ?? 0} />
            <PointBox
              label="Bonus"
              value={prediction.score?.bonusPoints ?? 0}
              tooltip={getBonusDetail(prediction)}
            />
            <PointBox label="Total" value={prediction.score?.totalPoints ?? 0} highlight />
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-6 text-slate-700 ${statusClasses.detail}`}>
        <p className="font-black text-ink">Detalle del cÃ¡lculo</p>
        <p className="mt-1">
          {prediction.score?.reason
            ? normalizeReason(prediction.score.reason)
            : 'Pendiente de cÃ¡lculo. El puntaje se calcularÃ¡ cuando el partido finalice y tenga resultado oficial.'}
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          className="text-sm font-bold text-action hover:text-[#0b4cc4]"
          href={`/matches/${prediction.match.id}`}
          onClick={onNavigate}
        >
          Ver partido
        </Link>
      </div>
    </article>
  );
}

function PointBox({
  highlight = false,
  label,
  tooltip,
  value,
}: {
  highlight?: boolean;
  label: string;
  tooltip?: string;
  value: number;
}) {
  return (
    <div
      className={`group relative rounded-lg px-3 py-2 ${highlight ? 'bg-action text-white' : 'bg-white text-ink'}`}
      tabIndex={tooltip ? 0 : undefined}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
      {tooltip ? (
        <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-64 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold leading-5 text-slate-600 opacity-0 shadow-[0_16px_40px_rgba(15,35,66,0.18)] transition group-hover:opacity-100 group-focus:opacity-100">
          <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white" />
          {tooltip}
        </div>
      ) : null}
    </div>
  );
}

function getBonusDetail(prediction: Prediction) {
  if (!prediction.score) {
    return 'El bonus se calculara cuando el partido finalice y exista resultado oficial.';
  }

  const bonusPoints = prediction.score.bonusPoints ?? 0;

  if (bonusPoints <= 0) {
    return 'Esta prediccion no obtuvo bonus. El bonus de 24 horas solo aplica si la prediccion acierta, y el bonus por racha aplica al tercer acierto consecutivo.';
  }

  const reason = (prediction.score.reason ?? '').toLowerCase();
  const details: string[] = [];

  if (reason.includes('anticipada')) {
    details.push('Prediccion anticipada correcta: +1 punto por registrarla con mas de 24 horas de anticipacion y acertar.');
  }

  if (reason.includes('racha')) {
    details.push('Bonus por racha: +2 puntos por cada 3 aciertos consecutivos.');
  }

  if (details.length === 0) {
    details.push('Bonus aplicado segun las reglas de puntuacion.');
  }

  return details.join(' ');
}

function getPredictionTypeLabel(prediction: Prediction) {
  const labels: Record<Prediction['predictionType'], string> = {
    EXACT_SCORE: 'Resultado exacto',
    WINNER: 'Ganador o empate',
    GOAL_DIFFERENCE: 'Diferencia de goles',
  };

  return labels[prediction.predictionType];
}

function formatPredictionValue(prediction: Prediction) {
  if (prediction.predictionType === 'EXACT_SCORE') {
    return `${prediction.homeScore ?? '-'} - ${prediction.awayScore ?? '-'}`;
  }

  const outcome = getOutcomeLabel(prediction.predictedWinner, prediction);

  if (prediction.predictionType === 'WINNER') {
    return outcome;
  }

  return `${outcome} por ${prediction.goalDifference ?? '-'} gol${prediction.goalDifference === 1 ? '' : 'es'}`;
}

function getOutcomeLabel(outcome: Prediction['predictedWinner'], prediction: Prediction) {
  if (outcome === 'HOME') {
    return `Gana ${prediction.match.homeTeam.shortName ?? prediction.match.homeTeam.name}`;
  }

  if (outcome === 'AWAY') {
    return `Gana ${prediction.match.awayTeam.shortName ?? prediction.match.awayTeam.name}`;
  }

  return 'Empate';
}

function getPredictionAuditClasses(prediction: Prediction) {
  if (!prediction.score) {
    return {
      card: 'border-slate-200 bg-white',
      summary: 'border-slate-200 bg-slate-50',
      detail: 'bg-blue-50',
      badge: 'bg-slate-100 text-slate-600',
    };
  }

  if ((prediction.score.basePoints ?? 0) > 0) {
    return {
      card: 'border-emerald-200 bg-emerald-50/45',
      summary: 'border-emerald-200 bg-white',
      detail: 'bg-emerald-50',
      badge: 'bg-emerald-600 text-white',
    };
  }

  return {
    card: 'border-red-200 bg-red-50/45',
    summary: 'border-red-200 bg-white',
    detail: 'bg-red-50',
    badge: 'bg-red-600 text-white',
  };
}

function getPredictionAuditLabel(prediction: Prediction) {
  if (!prediction.score) {
    return 'En progreso';
  }

  return (prediction.score.basePoints ?? 0) > 0 ? 'AcertÃ³' : 'No acertÃ³';
}

function normalizeReason(reason: string) {
  return reason
    .replace('prediccion anticipada', 'prediccion anticipada')
    .replace('bonus por racha', 'bonus por racha')
    .replace('resultado exacto', 'resultado exacto')
    .replace('ganador correcto', 'ganador correcto')
    .replace('diferencia de goles correcta', 'diferencia de goles correcta');
}



