'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
  const [overlayMessage, setOverlayMessage] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<RoomMember | null>(null);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [roomForm, setRoomForm] = useState({
    color: '#1457d9',
    description: '',
    name: '',
  });

  const canManage = useMemo(
    () => Boolean(user && room && (user.role === 'ADMIN' || room.owner?.id === user.id)),
    [room, user],
  );

  const hasRoomChanges = useMemo(() => {
    if (!room) {
      return false;
    }

    return (
      roomForm.name.trim() !== room.name ||
      roomForm.description.trim() !== (room.description ?? '') ||
      roomForm.color !== room.color
    );
  }, [room, roomForm]);

  const loadRoom = useCallback(() => {
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
  }, [params.id]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    if (!room) {
      return;
    }

    setRoomForm({
      color: room.color,
      description: room.description ?? '',
      name: room.name,
    });
  }, [room]);

  async function handleUpdateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!room) {
      return;
    }
    if (!hasRoomChanges) {
      return;
    }

    setError('');
    setMessage('');
    setIsSaving(true);
    setOverlayMessage('Guardando cambios de la sala...');
    const payload = {
      name: roomForm.name.trim(),
      description: roomForm.description.trim(),
      color: roomForm.color,
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
      setOverlayMessage('');
    }
  }

  async function handleRemoveMember(member: RoomMember) {
    if (!room) {
      return;
    }

    setError('');
    setMessage('');
    setIsSaving(true);
    setMemberToRemove(null);
    setOverlayMessage('Quitando integrante de la sala...');

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
      setOverlayMessage('');
    }
  }

  async function handleCopyRoomCode() {
    if (!room?.code || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1600);
    } catch {
      setError('No se pudo copiar el código de la sala');
    }
  }

  return (
    <PrivateRoute>
      <AppShell
        title={room?.name ?? 'Detalle de sala'}
        subtitle="Gestiona integrantes, código de acceso y podio de esta sala."
      >
        {overlayMessage ? <LoadingOverlay message={overlayMessage} /> : null}
        {memberToRemove ? (
          <ConfirmDialog
            description={`Se quitara a ${memberToRemove.user.name} de esta sala. Esta accion no elimina su cuenta ni sus predicciones globales.`}
            isBusy={isSaving}
            title="Quitar integrante"
            confirmLabel="Si, quitar integrante"
            onCancel={() => setMemberToRemove(null)}
            onConfirm={() => handleRemoveMember(memberToRemove)}
          />
        ) : null}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-action">
                        Código {room.code}
                      </p>
                      <button
                        aria-label="Copiar código de la sala"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-action/20 bg-white text-action transition hover:border-action hover:bg-action/10"
                        type="button"
                        onClick={handleCopyRoomCode}
                        title={copiedRoomCode ? 'Código copiado' : 'Copiar código'}
                      >
                        {copiedRoomCode ? (
                          <CheckIcon />
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-ink">{room.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      {room.description || 'Sala sin descripcion.'}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      Propietario: {room.owner?.name ?? 'Sin propietario'}
                    </p>
                    <p className="mt-3 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
                      Comparte este código con tus invitados para que puedan unirse a la sala desde la pantalla de Salas.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-action/20 bg-action px-4 text-sm font-black text-white transition hover:bg-blue-700"
                      href={`/rooms/${room.id}/predictions`}
                      onClick={() => setOverlayMessage('Abriendo predicciones de la sala...')}
                    >
                      Hacer predicciones en esta sala
                    </Link>
                    <Link
                      className="text-sm font-bold text-action"
                      href="/rooms"
                      onClick={() => setOverlayMessage('Volviendo a salas...')}
                    >
                      Volver
                    </Link>
                  </div>
                </div>

                {canManage ? (
                  <form className="mt-6 grid gap-4" onSubmit={handleUpdateRoom}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <RoomEditField
                        label="Nombre"
                        name="name"
                        value={roomForm.name}
                        onChange={(value) =>
                          setRoomForm((current) => ({ ...current, name: value }))
                        }
                      />
                      <label className="block">
                        <span className="text-sm font-bold text-ink">Color</span>
                        <input
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3"
                          name="color"
                          type="color"
                          value={roomForm.color}
                          onChange={(event) =>
                            setRoomForm((current) => ({
                              ...current,
                              color: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-sm font-bold text-ink">Descripcion</span>
                      <textarea
                        className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                        maxLength={240}
                        name="description"
                        value={roomForm.description}
                        onChange={(event) =>
                          setRoomForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        className="h-11 rounded-xl bg-action px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving || !hasRoomChanges}
                        type="submit"
                      >
                        {isSaving ? 'Guardando...' : hasRoomChanges ? 'Guardar cambios' : 'Sin cambios'}
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
                  <Link
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition hover:bg-blue-50"
                    href={`/rooms/${room.id}/users/${entry.userId}/predictions`}
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
                  </Link>
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
                          onClick={() => setMemberToRemove(member)}
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

function ConfirmDialog({
  confirmLabel,
  description,
  isBusy,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  description: string;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06182c]/65 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <h2 className="text-xl font-black text-ink">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-ink transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="h-11 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomEditField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
        name={name}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-action" />
        <p className="mt-4 text-base font-black text-ink">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Actualizando la informacion de la sala.
        </p>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
      <path
        d="M4.5 4.5h-2A1.5 1.5 0 0 0 1 6v5.5A1.5 1.5 0 0 0 2.5 13H8A1.5 1.5 0 0 0 9.5 11.5v-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
      <path
        d="M6 1h5.5A1.5 1.5 0 0 1 13 2.5V8A1.5 1.5 0 0 1 11.5 9.5H6A1.5 1.5 0 0 1 4.5 8V2.5A1.5 1.5 0 0 1 6 1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 14 14" width="14">
      <path
        d="M11.5 3.75 6 9.25 2.5 5.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
