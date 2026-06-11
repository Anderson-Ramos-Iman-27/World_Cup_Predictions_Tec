'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import type { Room } from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1457d9');

  useEffect(() => {
    loadRooms();
  }, []);

  function loadRooms() {
    setIsLoading(true);
    apiRequest<Room[]>('/rooms/my')
      .then(setRooms)
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudieron cargar las salas'),
      )
      .finally(() => setIsLoading(false));
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError('');
    setMessage('');
    setIsSaving(true);

    const form = new FormData(formElement);
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? '').trim(),
      color: selectedColor,
    };

    try {
      const createdRoom = await apiRequest<Room>('/rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      formElement.reset();
      setSelectedColor('#1457d9');
      setMessage('Sala creada correctamente.');
      loadRooms();
      setOverlayMessage('Ingresando a la sala creada...');
      router.push(`/rooms/${createdRoom.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear la sala');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError('');
    setMessage('');
    setIsSaving(true);

    const form = new FormData(formElement);
    const code = String(form.get('code') ?? '').trim().toUpperCase();

    try {
      const joinedRoom = await apiRequest<Room>('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      formElement.reset();
      setMessage('Te uniste a la sala correctamente.');
      loadRooms();
      setOverlayMessage('Ingresando a la sala...');
      router.push(`/rooms/${joinedRoom.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo unir a la sala');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PrivateRoute>
      <AppShell
        title="Mis salas"
        subtitle="Crea grupos privados, personaliza su color y compite por podios propios."
      >
        {overlayMessage ? <LoadingOverlay message={overlayMessage} /> : null}
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

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
            <h2 className="text-lg font-black text-ink">Crear sala</h2>
            <form className="mt-5 space-y-4" onSubmit={handleCreateRoom}>
              <RoomField label="Nombre" name="name" placeholder="Amigos del Mundial" />
              <label className="block">
                <span className="text-sm font-bold text-ink">Descripcion</span>
                <textarea
                  className="mt-2 min-h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
                  maxLength={240}
                  name="description"
                  placeholder="Describe la sala para tus invitados."
                />
              </label>
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-ink">Color de la sala</span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {selectedColor}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <label
                    className="block overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
                    title="Seleccionar color personalizado"
                  >
                    <input
                      className="h-16 w-full cursor-pointer rounded-xl border-0 bg-transparent p-0"
                      type="color"
                      value={selectedColor}
                      onChange={(event) => setSelectedColor(event.target.value)}
                    />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Seleccionado
                    </p>
                    <p className="mt-1 text-sm font-black text-ink">{selectedColor}</p>
                  </div>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="h-2" style={{ backgroundColor: selectedColor }} />
                  <div className="p-3">
                    <p className="text-sm font-black text-ink">Vista previa de sala</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Este color identificara el box de la sala.
                    </p>
                  </div>
                </div>
              </div>
              <button
                className="h-11 w-full rounded-xl bg-action px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(20,87,217,0.24)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? 'Guardando...' : 'Crear sala'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
            <h2 className="text-lg font-black text-ink">Unirse a sala</h2>
            <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleJoinRoom}>
              <RoomField label="Código de sala" name="code" placeholder="AB12CD34" />
              <button
                className="self-end rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-ink transition hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                Unirme
              </button>
            </form>

            <div className="mt-6 grid gap-4">
              {isLoading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
              {!isLoading && rooms.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Aun no perteneces a ninguna sala.
                </p>
              ) : null}
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onEnter={() => setOverlayMessage('Ingresando a la sala...')}
                />
              ))}
            </div>
          </section>
        </div>
      </AppShell>
    </PrivateRoute>
  );
}

function RoomCard({ onEnter, room }: { onEnter: () => void; room: Room }) {
  return (
    <Link
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,35,66,0.14)]"
      href={`/rooms/${room.id}`}
      onClick={onEnter}
    >
      <div className="h-2" style={{ backgroundColor: room.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-black text-ink group-hover:text-action">
              {room.name}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {room.description || 'Sala sin descripcion.'}
            </p>
          </div>
          <span
            className="h-9 w-9 shrink-0 rounded-xl border border-white shadow-inner"
            style={{ backgroundColor: room.color }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>{room._count?.members ?? 0} integrantes</span>
            <span>Código {room.code}</span>
          </div>
          <span className="font-black text-action transition group-hover:text-[#0b4cc4]">
            Ingresar a sala
          </span>
        </div>
      </div>
    </Link>
  );
}

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-action" />
        <p className="mt-4 text-base font-black text-ink">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Preparando la información de la sala.
        </p>
      </div>
    </div>
  );
}

function RoomField({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
        name={name}
        placeholder={placeholder}
        required
      />
    </label>
  );
}
