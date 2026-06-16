import Link from 'next/link';
import { TeamBadge } from '@/components/team-badge';
import {
  canPredict,
  formatDateTime,
  getStatusLabel,
} from '@/features/user-panel/formatters';
import type { Match } from '@/features/user-panel/types';

type MatchCardProps = {
  match: Match;
  href?: string;
  predictionProgress?: {
    current: number;
    total: number;
  };
  onNavigate?: () => void;
};

export function MatchCard({ match, href, onNavigate, predictionProgress }: MatchCardProps) {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const open = canPredict(match.status, match.utcDate);
  const card = (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,35,66,0.16)]">
      {predictionProgress ? (
        <div className="absolute right-4 top-[3.2rem] z-10 rounded-full border border-blue-100 bg-white/95 px-2.5 py-1 text-[11px] font-black tracking-[0.12em] text-action shadow-sm">
          {predictionProgress.current}/{predictionProgress.total}
        </div>
      ) : null}
      <div
        className={`flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wide text-white ${
          isLive ? 'bg-rose-500' : isFinished ? 'bg-[#082442]' : 'bg-action'
        }`}
      >
        <span>{isLive ? '● Live' : getStatusLabel(match.status)}</span>
        <span>{open ? 'Predicciones abiertas' : isFinished ? 'Full time' : 'Fixture'}</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-4">
          <TeamBadge name={match.homeTeam.name} crestUrl={match.homeTeam.crestUrl} />
          <div className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 text-center md:min-w-20">
            {isFinished || isLive ? (
              <>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {isFinished ? 'Resultado final' : 'Marcador parcial'}
                </p>
                <p className="mt-1 text-xl font-black text-ink sm:text-2xl">
                  {match.homeScore ?? '-'} - {match.awayScore ?? '-'}
                </p>
              </>
            ) : (
              <p className="text-lg font-black text-ink sm:text-xl">VS</p>
            )}
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {new Date(match.utcDate).toLocaleDateString('es-PE')}
            </p>
          </div>
          <TeamBadge
            align="right"
            name={match.awayTeam.name}
            crestUrl={match.awayTeam.crestUrl}
          />
        </div>
        <div className="mt-5 border-t border-slate-100 pt-3 text-center text-xs font-semibold text-slate-500">
          {formatDateTime(match.utcDate)}
        </div>
      </div>
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link className="block" href={href} onClick={onNavigate}>
      {card}
    </Link>
  );
}
