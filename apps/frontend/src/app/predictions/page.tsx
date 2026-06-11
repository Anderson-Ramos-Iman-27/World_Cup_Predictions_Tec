'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import { TeamBadge } from '@/components/team-badge';
import {
  calculateCurrentStreak,
  formatDateTime,
  getStatusLabel,
} from '@/features/user-panel/formatters';
import type { Prediction } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [navigationMessage, setNavigationMessage] = useState('');
  const currentStreak = calculateCurrentStreak(predictions);

  useEffect(() => {
    apiRequest<Prediction[]>('/predictions/my')
      .then(setPredictions)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar predicciones'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <PrivateRoute>
      <AppShell
        title="Mis predicciones"
        subtitle="Consulta tus marcadores registrados y puntajes. Las predicciones guardadas no se pueden editar."
      >
        {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-action">
              Racha actual
            </p>
            <p className="mt-2 text-3xl font-black text-ink">
              {currentStreak} aciertos consecutivos
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Cada 3 aciertos consecutivos de ganador o mejor suman 2 puntos extra.
            </p>
          </div>

          {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
          {!isLoading && predictions.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Aun no tienes predicciones. Revisa los partidos disponibles para registrar una.
            </div>
          ) : null}

          {predictions.map((prediction) => (
            <PredictionCard
              prediction={prediction}
              key={prediction.id}
              onNavigate={() => setNavigationMessage('Abriendo detalle del partido...')}
            />
          ))}
        </div>
      </AppShell>
    </PrivateRoute>
  );
}

function PredictionCard({
  onNavigate,
  prediction,
}: {
  onNavigate: () => void;
  prediction: Prediction;
}) {
  const statusClasses = getPredictionStatusClasses(prediction);

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
              {getPredictionStatusLabel(prediction)}
            </span>
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
            Predicción registrada
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
        <p className="font-black text-ink">Detalle del calculo</p>
        <p className="mt-1">
          {prediction.score?.reason
            ? normalizeReason(prediction.score.reason)
            : 'Pendiente de calculo. El puntaje se calculara cuando el partido finalice y tenga resultado oficial.'}
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

function getPredictionStatusClasses(prediction: Prediction) {
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

function getPredictionStatusLabel(prediction: Prediction) {
  if (!prediction.score) {
    return 'En progreso';
  }

  return (prediction.score.basePoints ?? 0) > 0 ? 'Acerto' : 'No acerto';
}

function getBonusDetail(prediction: Prediction) {
  if (!prediction.score) {
    return 'El bonus se calculara cuando el partido finalice y exista resultado oficial.';
  }

  const bonusPoints = prediction.score.bonusPoints ?? 0;

  if (bonusPoints <= 0) {
    return 'Esta predicción no obtuvo bonus. Puede ganar bonus por registrarse con mas de 24 horas de anticipacion o por racha de aciertos.';
  }

  const reason = (prediction.score.reason ?? '').toLowerCase();
  const details: string[] = [];

  if (reason.includes('anticipada')) {
    details.push('Predicción anticipada: +1 punto por registrarla con mas de 24 horas de anticipacion.');
  }

  if (reason.includes('racha')) {
    details.push('Bonus por racha: +2 puntos por cada 3 aciertos consecutivos.');
  }

  if (details.length === 0) {
    details.push('Bonus aplicado segun las reglas de puntuacion.');
  }

  return details.join(' ');
}

function normalizeReason(reason: string) {
  return reason
    .replace('predicción anticipada', 'predicción anticipada')
    .replace('bonus por racha', 'bonus por racha')
    .replace('resultado exacto', 'resultado exacto')
    .replace('ganador correcto', 'ganador correcto')
    .replace('diferencia de goles correcta', 'diferencia de goles correcta');
}
