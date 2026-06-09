import Link from 'next/link';
import type { RankingEntry } from '@/features/user-panel/types';

export function RankingPodium({ entries }: { entries: RankingEntry[] }) {
  const topThree = [entries[1], entries[0], entries[2]].filter(Boolean);

  if (topThree.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
        Aun no hay puntajes para mostrar el podio.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_42px_rgba(15,35,66,0.12)]">
      <div className="grid items-end gap-4 md:grid-cols-3">
        {topThree.map((entry) => (
          <PodiumCard entry={entry} key={entry.userId} />
        ))}
      </div>
    </section>
  );
}

function PodiumCard({ entry }: { entry: RankingEntry }) {
  const isFirst = entry.position === 1;
  const classes = isFirst
    ? 'min-h-72 bg-gradient-to-br from-[#f7c948] via-[#e9a80a] to-[#c98500] text-white md:order-2'
    : entry.position === 2
      ? 'min-h-60 bg-gradient-to-br from-[#cdd5df] via-[#aeb8c5] to-[#8793a3] text-white md:order-1'
      : 'min-h-60 bg-gradient-to-br from-[#d96a2b] via-[#c53f08] to-[#922400] text-white md:order-3';

  return (
    <Link
      className={`relative overflow-hidden rounded-2xl p-6 shadow-[0_18px_34px_rgba(15,35,66,0.18)] ${classes}`}
      href={`/users/${entry.userId}/predictions`}
    >
      <div className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-sm font-black">
        #{entry.position}
      </div>
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/35 bg-white text-2xl font-black text-ink shadow-sm">
          {getInitials(entry.name)}
        </div>
        <h3 className="mt-4 text-lg font-black">{entry.name}</h3>
        <p className="mt-1 text-sm font-semibold text-white/80">
          {entry.predictionsCount} predicciones
        </p>
        <p className="mt-4 text-4xl font-black leading-none">{entry.totalPoints}</p>
        <p className="mt-1 text-sm font-bold text-white/85">puntos</p>
        <span className="mt-4 rounded-full bg-white/20 px-4 py-2 text-xs font-black text-white">
          Ver predicciones
        </span>
      </div>
    </Link>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'U';
}
