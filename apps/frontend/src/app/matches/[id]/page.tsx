'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { TeamBadge } from '@/components/team-badge';
import { useAuth } from '@/features/auth/auth-context';
import {
  canPredict,
  formatDateTime,
  getStatusLabel,
} from '@/features/user-panel/formatters';
import type { Match, Prediction } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

type PredictionMode = 'EXACT_SCORE' | 'WINNER' | 'GOAL_DIFFERENCE';
type PredictionOutcome = 'HOME' | 'DRAW' | 'AWAY';

const predictionModes: PredictionMode[] = ['EXACT_SCORE', 'WINNER', 'GOAL_DIFFERENCE'];

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const roomId = searchParams.get('roomId');
  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [predictionMode, setPredictionMode] = useState<PredictionMode>('EXACT_SCORE');
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [winnerChoice, setWinnerChoice] = useState<PredictionOutcome>('HOME');
  const [differenceChoice, setDifferenceChoice] = useState<PredictionOutcome>('HOME');
  const [goalDifference, setGoalDifference] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [navigationMessage, setNavigationMessage] = useState('');

  useEffect(() => {
    apiRequest<Match>(`/matches/${params.id}`)
      .then(setMatch)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar el partido'),
      )
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (isAuthLoading || !user) {
      setPredictions([]);
      return;
    }

    const endpoint = roomId ? `/predictions/room/${roomId}` : '/predictions/my';

    apiRequest<Prediction[]>(endpoint)
      .then((nextPredictions) =>
        setPredictions(
          roomId
            ? nextPredictions.filter((prediction) => prediction.user?.id === user.id)
            : nextPredictions,
        ),
      )
      .catch(() => null);
  }, [isAuthLoading, roomId, user]);

  const matchPredictions = useMemo(
    () => predictions.filter((prediction) => prediction.match.id === params.id),
    [params.id, predictions],
  );
  const submittedModes = useMemo(
    () => new Set(matchPredictions.map((prediction) => prediction.predictionType)),
    [matchPredictions],
  );
  const activeModeAlreadySubmitted = submittedModes.has(predictionMode);
  const allModesSubmitted = submittedModes.size >= 3;
  const predictionAllowed = match ? canPredict(match.status, match.utcDate) : false;

  useEffect(() => {
    if (!submittedModes.has(predictionMode)) {
      return;
    }

    const nextAvailableMode = predictionModes.find((mode) => !submittedModes.has(mode));

    if (nextAvailableMode) {
      setPredictionMode(nextAvailableMode);
    }
  }, [predictionMode, submittedModes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Debes iniciar sesión para guardar una predicción.');
      return;
    }

    if (!match) {
      setError('No se pudo cargar el partido.');
      return;
    }

    if (!predictionAllowed) {
      setError('Este partido ya no permite predicciones.');
      return;
    }

    if (activeModeAlreadySubmitted) {
      setError('Ya registraste una predicción de esta modalidad para este partido.');
      return;
    }

    const payload = buildPredictionPayload(match.id, {
      predictionMode,
      homeScore,
      awayScore,
      winnerChoice,
      differenceChoice,
      goalDifference,
      roomId,
    });

    if (!payload) {
      setError('Completa correctamente la modalidad seleccionada.');
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await apiRequest<Prediction>('/predictions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setPredictions((current) => [
        saved,
        ...current.filter((prediction) => prediction.id !== saved.id),
      ]);
      setSuccess(
        roomId
          ? 'Predicción guardada correctamente. Podrás verla dentro de esta sala.'
          : 'Predicción guardada correctamente. Podrás verla en el apartado de Predicciones.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo guardar la predicción');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Detalle de partido"
      subtitle={
        roomId
          ? 'Consulta la informacion del encuentro y guarda una prediccion que solo contara para esta sala.'
          : 'Consulta la informacion del encuentro. Para guardar una prediccion debes iniciar sesion.'
      }
    >
      {isSubmitting ? <LoadingOverlay message="Guardando tu predicción..." /> : null}
      {navigationMessage ? <LoadingOverlay message={navigationMessage} /> : null}
      {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {match ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-action">
                  {getStatusLabel(match.status)}
                </p>
                <h2 className="mt-3 text-2xl font-black text-ink">
                  {match.homeTeam.name} vs {match.awayTeam.name}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDateTime(match.utcDate)}
                </p>
              </div>
              <Link
                className="text-sm font-bold text-action"
                href="/matches"
                onClick={() => setNavigationMessage('Volviendo a partidos...')}
              >
                Volver
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <TeamBadge
                name={match.homeTeam.name}
                crestUrl={match.homeTeam.crestUrl}
              />
              <div className="rounded-lg bg-slate-100 px-5 py-3 text-center text-ink">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {match.status === 'FINISHED' ? 'Resultado final' : 'VS'}
                </p>
                <p className="mt-1 text-xl font-black sm:text-2xl">
                  {match.status === 'FINISHED'
                    ? `${match.homeScore ?? '-'} - ${match.awayScore ?? '-'}`
                    : 'Pendiente'}
                </p>
              </div>
              <TeamBadge
                align="right"
                name={match.awayTeam.name}
                crestUrl={match.awayTeam.crestUrl}
              />
            </div>

            {user ? (
              <form className="mt-8 border-t border-slate-100 pt-6" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-ink">Opciones de predicción</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {roomId
                        ? 'Elige una sola modalidad. Esta prediccion contara solo para el podio de la sala.'
                        : 'Elige una sola modalidad. Cuenta para tu ranking global y para todas tus salas.'}
                    </p>
                  </div>
                  {matchPredictions.length > 0 ? (
                    <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-action">
                      {matchPredictions.length} de 3 registradas
                    </span>
                  ) : null}
                </div>

                {matchPredictions.length > 0 ? (
                  <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-action">
                    Las predicciones guardadas no se pueden editar. Puedes registrar las modalidades que aún estén disponibles.
                  </p>
                ) : null}

                <div className="mt-5 grid gap-4">
                  <PredictionModeCard
                    active={predictionMode === 'EXACT_SCORE'}
                    disabled={submittedModes.has('EXACT_SCORE')}
                    isSubmitted={submittedModes.has('EXACT_SCORE')}
                    points="5 pts"
                    title="Resultado exacto"
                    description="Predice el marcador final completo."
                    onSelect={() => setPredictionMode('EXACT_SCORE')}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <ScoreInput
                        label={match.homeTeam.shortName ?? match.homeTeam.name}
                        value={homeScore}
                        onChange={setHomeScore}
                      />
                      <ScoreInput
                        label={match.awayTeam.shortName ?? match.awayTeam.name}
                        value={awayScore}
                        onChange={setAwayScore}
                      />
                    </div>
                  </PredictionModeCard>

                  <PredictionModeCard
                    active={predictionMode === 'WINNER'}
                    disabled={submittedModes.has('WINNER')}
                    isSubmitted={submittedModes.has('WINNER')}
                    points="3 pts"
                    title="Ganador o empate correcto"
                    description="Elige quién gana o si el partido termina empatado."
                    onSelect={() => setPredictionMode('WINNER')}
                  >
                    <OutcomePicker
                      awayLabel={`Gana ${match.awayTeam.shortName ?? match.awayTeam.name}`}
                      homeLabel={`Gana ${match.homeTeam.shortName ?? match.homeTeam.name}`}
                      value={winnerChoice}
                      onChange={setWinnerChoice}
                    />
                  </PredictionModeCard>

                  <PredictionModeCard
                    active={predictionMode === 'GOAL_DIFFERENCE'}
                    disabled={submittedModes.has('GOAL_DIFFERENCE')}
                    isSubmitted={submittedModes.has('GOAL_DIFFERENCE')}
                    points="2 pts"
                    title="Diferencia de goles correcta"
                    description="Elige el ganador y por cuántos goles gana. El empate no aplica en esta modalidad."
                    onSelect={() => setPredictionMode('GOAL_DIFFERENCE')}
                  >
                    <div className="grid gap-3">
                      <OutcomePicker
                        awayLabel={`Gana ${match.awayTeam.shortName ?? match.awayTeam.name}`}
                        homeLabel={`Gana ${match.homeTeam.shortName ?? match.homeTeam.name}`}
                        includeDraw={false}
                        value={differenceChoice}
                        onChange={setDifferenceChoice}
                      />
                      <ScoreInput
                        label="Diferencia de goles"
                        min={1}
                        value={goalDifference}
                        onChange={setGoalDifference}
                      />
                    </div>
                  </PredictionModeCard>
                </div>

                <button
                  className="mt-5 h-11 w-full rounded-lg bg-action px-4 text-sm font-bold text-white hover:bg-[#0b4cc4] disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="submit"
                  disabled={!predictionAllowed || isSubmitting || activeModeAlreadySubmitted || allModesSubmitted}
                >
                  {allModesSubmitted
                    ? 'Ya registraste todas las modalidades'
                    : activeModeAlreadySubmitted
                      ? 'Modalidad ya registrada'
                      : isSubmitting
                        ? 'Guardando...'
                        : 'Guardar predicción'}
                </button>

                {success ? (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {success}{' '}
                    <Link
                      className="font-black underline"
                      href={
                        roomId && user
                          ? `/rooms/${roomId}/users/${user.id}/predictions`
                          : '/predictions'
                      }
                    >
                      {roomId ? 'Ver predicciones de esta sala' : 'Ver mis predicciones'}
                    </Link>
                  </div>
                ) : null}
              </form>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-ink">Reglas de puntuación</h2>
            {!user ? (
              <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-4">
                <p className="text-sm font-semibold text-action">
                  Inicia sesión o crea una cuenta para guardar tu predicción.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-action px-4 text-sm font-bold text-white"
                    href="/login"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-ink"
                    href="/register"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            ) : !predictionAllowed ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Este partido ya no permite predicciones.
              </p>
            ) : null}

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
              <p className="font-black text-ink">Puntos que puedes sumar</p>
              <div className="mt-3 grid gap-2">
                <PointRule label="Resultado exacto" value="5 pts" />
                <PointRule label="Ganador o empate correcto" value="3 pts" />
                <PointRule label="Diferencia de goles correcta" value="2 pts" />
                <PointRule label="Bonus por cada 3 aciertos consecutivos" value="+2 pts" />
                <PointRule label="Predicción con más de 24 h" value="+1 pt" />
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Las predicciones de último minuto, dentro de los 10 minutos previos al partido, solo reciben puntos base.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function buildPredictionPayload(
  matchId: string,
  values: {
    predictionMode: PredictionMode;
    homeScore: number;
    awayScore: number;
    winnerChoice: PredictionOutcome;
    differenceChoice: PredictionOutcome;
    goalDifference: number;
    roomId: string | null;
  },
) {
  if (values.predictionMode === 'EXACT_SCORE') {
    if (values.homeScore < 0 || values.awayScore < 0) {
      return null;
    }

    return {
      matchId,
      ...(values.roomId ? { roomId: values.roomId } : {}),
      predictionType: values.predictionMode,
      homeScore: values.homeScore,
      awayScore: values.awayScore,
    };
  }

  if (values.predictionMode === 'WINNER') {
    return {
      matchId,
      ...(values.roomId ? { roomId: values.roomId } : {}),
      predictionType: values.predictionMode,
      predictedWinner: values.winnerChoice,
    };
  }

  if (values.differenceChoice === 'DRAW' || values.goalDifference < 1) {
    return null;
  }

  return {
    matchId,
    ...(values.roomId ? { roomId: values.roomId } : {}),
    predictionType: values.predictionMode,
    predictedWinner: values.differenceChoice,
    goalDifference: values.goalDifference,
  };
}

function PointRule({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
      <span className="font-semibold">{label}</span>
      <span className="font-black text-action">{value}</span>
    </div>
  );
}

function PredictionModeCard({
  active,
  children,
  description,
  disabled,
  isSubmitted,
  onSelect,
  points,
  title,
}: {
  active: boolean;
  children: ReactNode;
  description: string;
  disabled: boolean;
  isSubmitted: boolean;
  onSelect: () => void;
  points: string;
  title: string;
}) {
  const cardStateClass = isSubmitted
    ? 'border-emerald-200 bg-emerald-50/70'
    : active
      ? 'border-action bg-blue-50'
      : 'border-slate-200 bg-white';

  return (
    <section
      className={`rounded-2xl border p-4 transition ${cardStateClass}`}
    >
      <button
        className="flex w-full items-start justify-between gap-4 text-left disabled:cursor-default"
        disabled={disabled}
        type="button"
        onClick={onSelect}
      >
        <span className="flex min-w-0 gap-3">
          <span
            className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
              isSubmitted
                ? 'border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_4px_white]'
                : active
                  ? 'border-action bg-action shadow-[inset_0_0_0_4px_white]'
                  : 'border-slate-300 bg-white'
            }`}
          />
          <span>
            <span className="block text-sm font-black text-ink">{title}</span>
            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>
            {isSubmitted ? (
              <span className="mt-2 block text-xs font-black text-emerald-700">
                Esta modalidad ya fue registrada y no se puede editar.
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm ${
              isSubmitted ? 'text-emerald-700' : 'text-action'
            }`}
          >
            {points}
          </span>
          {isSubmitted ? (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white">
              Registrada
            </span>
          ) : null}
        </span>
      </button>
      {active ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function OutcomePicker({
  awayLabel,
  homeLabel,
  includeDraw = true,
  onChange,
  value,
}: {
  awayLabel: string;
  homeLabel: string;
  includeDraw?: boolean;
  onChange: (value: PredictionOutcome) => void;
  value: PredictionOutcome;
}) {
  return (
    <div className={`grid gap-3 ${includeDraw ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      <OutcomeButton active={value === 'HOME'} label={homeLabel} onClick={() => onChange('HOME')} />
      {includeDraw ? (
        <OutcomeButton active={value === 'DRAW'} label="Empate" onClick={() => onChange('DRAW')} />
      ) : null}
      <OutcomeButton active={value === 'AWAY'} label={awayLabel} onClick={() => onChange('AWAY')} />
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
          Al terminar, podrás revisar el registro en el apartado de Predicciones.
        </p>
      </div>
    </div>
  );
}

function OutcomeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-xl border px-4 py-3 text-center text-sm font-black transition ${
        active
          ? 'border-action bg-white text-action shadow-sm'
          : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-action hover:text-action'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ScoreInput({
  label,
  min = 0,
  value,
  onChange,
}: {
  label: string;
  min?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-action"
        min={min}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
