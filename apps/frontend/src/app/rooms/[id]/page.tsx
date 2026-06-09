'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import { useAuth } from '@/features/auth/auth-context';
import type {
  RankingEntry,
  Room,
  RoomMember,
} from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [podium, setPodium] = useState<RankingEntry[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = useMemo(
    () => Boolean(user && room && (user.role === 'ADMIN' || room.owner?.id === user.id)),
    [room, user],
  );

  useEffect(() => {
    loadRoom();
  }, [params.id]);

  function loadRoom() {
    setIsLoading(true);
    Promise.all([
      apiRequest<Room>(`/rooms/${params.id}`),
      apiRequest<RoomMember[]>(`/rooms/${params.id}/members`),
      apiRequest<RankingEntry[]>(`/rooms/${params.id}/podium`).catch(() => []),
    ])
      .then(([nextRoom, nextMembers, nextPodium]) => {
        setRoom(nextRoom);
        setMembers(nextMembers);
        setPodium(nextPodium);
      })
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar la sala'),
      )
      .finally(() => setIsLoading(false));
  }

  async function handleUpdateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) {
      return;
    }

    setError('');
    setMessage('');
    setIsSaving(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      color: String(form.get('color') ?? room.color),
    };

    try {
      const updated = await apiRequest<Room>(`/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setRoom(updated);
      setMessage('Sala actualizada correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar la sala');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveMember(member: RoomMember) {
    if (!room) {
      return;
    }

    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      await apiRequest(`/rooms/${room.id}/members/${member.userId}`, {
        method: 'DELETE',
      });
      setMessage('Integrante eliminado de la sala.');
      loadRoom();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo eliminar integrante');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PrivateRoute>
      <AppShell
        title={room?.name ?? 'Detalle de sala'}
        subtitle="Gestiona integrantes, codigo de acceso y podio de esta sala."
      >
        {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        {room ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
              <div className="h-3" style={{ backgroundColor: room.color }} />
              <div className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-action">
                      Codigo {room.code}
                    </p>
                    <h2 className="mt-3 text-2xl font-black text-ink">{room.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {room.description || 'Sala sin descripcion.'}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      Propietario: {room.owner?.name ?? 'Sin propietario'}
                    </p>
                    <p className="mt-3 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                      Comparte este codigo con tus invitados para que puedan unirse a la sala desde la pantalla de Salas.
                    </p>
                  </div>
                  <Link className="text-sm font-bold text-action" href="/rooms">
                    Volver
                  </Link>
                </div>

                {canManage ? (
                  <form className="mt-6 grid gap-4" onSubmit={handleUpdateRoom}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <RoomEditField
                        defaultValue={room.name}
                        label="Nombre"
                        name="name"
                      />
                      <label className="block">
                        <span className="text-sm font-bold text-ink">Color</span>
                        <input
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                          defaultValue={room.color}
                          name="color"
                          type="color"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-sm font-bold text-ink">Descripcion</span>
                      <textarea
                        className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                        defaultValue={room.description ?? ''}
                        maxLength={240}
                        name="description"
                      />
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        className="h-11 rounded-xl bg-action px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving}
                        type="submit"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
              <h2 className="text-lg font-black text-ink">Podio de la sala</h2>
              <div className="mt-5 space-y-3">
                {podium.length === 0 ? (
                  <p className="text-sm text-slate-500">Aun no hay puntajes en esta sala.</p>
                ) : null}
                {podium.map((entry) => (
                  <div
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
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
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)] lg:col-span-2">
              <h2 className="text-lg font-black text-ink">Integrantes</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {members.map((member) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3"
                    key={member.id}
                  >
                    <div>
                      <p className="text-sm font-black text-ink">{member.user.name}</p>
                      <p className="text-xs text-slate-500">{member.user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {member.role === 'OWNER' ? 'Propietario' : 'Miembro'}
                      </span>
                      {canManage && member.role !== 'OWNER' ? (
                        <button
                          className="text-xs font-black text-red-600 hover:text-red-700 disabled:opacity-60"
                          disabled={isSaving}
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                        >
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </AppShell>
    </PrivateRoute>
  );
}

function RoomEditField({
  defaultValue,
  label,
  name,
}: {
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
        defaultValue={defaultValue}
        name={name}
        required
      />
    </label>
  );
}
