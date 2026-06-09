'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { LogoMark } from '@/components/layout/logo-mark';
import { PrivateRoute } from '@/components/layout/private-route';
import { useAuth } from '@/features/auth/auth-context';
import type {
  CarouselSlide,
  GroupStanding,
  KnockoutMatch,
  Match,
  Room,
  Team,
} from '@/features/user-panel/types';
import { apiRequest } from '@/lib/http-client';

type AdminTab =
  | 'resumen'
  | 'usuarios'
  | 'equipos'
  | 'salas'
  | 'partidos'
  | 'competicion'
  | 'sincronizacion'
  | 'carrusel'
  | 'logs';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  createdAt: string;
  _count?: {
    predictions: number;
    roomMembership: number;
    ownedRooms: number;
  };
};

type SyncLog = {
  id: string;
  provider: string;
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL';
  message?: string | null;
  startedAt: string;
  finishedAt?: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
  };
};

type SyncStatusResponse = SyncLog | { lastSync?: SyncLog | null; message?: string };

type CompetitionSummary = {
  groups: GroupStanding[];
  knockoutMatches: KnockoutMatch[];
};

type ConfirmationState = {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => Promise<void>;
} | null;

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'salas', label: 'Salas' },
  { id: 'partidos', label: 'Partidos' },
  { id: 'competicion', label: 'Competición' },
  { id: 'sincronizacion', label: 'Sincronización' },
  { id: 'carrusel', label: 'Carrusel' },
  { id: 'logs', label: 'Auditoría' },
];

const userStatuses: AdminUser['status'][] = [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'INACTIVE',
  'BLOCKED',
];

const matchStatuses = ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('resumen');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [competitionSummary, setCompetitionSummary] = useState<CompetitionSummary>({
    groups: [],
    knockoutMatches: [],
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const stats = useMemo(
    () => ({
      users: users.length,
      rooms: rooms.length,
      matches: matches.length,
      finishedMatches: matches.filter((match) => match.status === 'FINISHED').length,
      activeSlides: slides.filter((slide) => slide.isActive).length,
      syncErrors: syncLogs.filter((log) => log.status === 'ERROR').length,
    }),
    [matches, rooms.length, slides, syncLogs, users.length],
  );

  useEffect(() => {
    if (!message && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [error, message]);

  function loadAdminData() {
    setIsLoading(true);
    setError('');
    Promise.all([
      apiRequest<AdminUser[]>('/admin/users'),
      apiRequest<Room[]>('/admin/rooms'),
      apiRequest<Match[]>('/admin/matches'),
      apiRequest<Team[]>('/admin/teams'),
      apiRequest<CarouselSlide[]>('/admin/carousel-slides'),
      apiRequest<SyncLog[]>('/admin/sync-logs'),
      apiRequest<AuditLog[]>('/admin/audit-logs'),
      apiRequest<SyncStatusResponse>('/admin/sync/football-data/status').catch(() => null),
      Promise.all([
        apiRequest<GroupStanding[]>('/football-data/standings').catch(() => []),
        apiRequest<KnockoutMatch[]>('/football-data/knockout').catch(() => []),
      ]),
    ])
      .then(
        ([
          nextUsers,
          nextRooms,
          nextMatches,
          nextTeams,
          nextSlides,
          nextSyncLogs,
          nextAuditLogs,
          nextSyncStatus,
          nextCompetitionSummary,
        ]) => {
          setUsers(nextUsers);
          setRooms(nextRooms);
          setMatches(nextMatches);
          setTeams(nextTeams);
          setSlides(nextSlides);
          setSyncLogs(nextSyncLogs);
          setAuditLogs(nextAuditLogs);
          setSyncStatus(nextSyncStatus);
          setCompetitionSummary({
            groups: nextCompetitionSummary[0],
            knockoutMatches: nextCompetitionSummary[1],
          });
        },
      )
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar el panel'),
      )
      .finally(() => setIsLoading(false));
  }

  async function executeSensitiveAction(action: () => Promise<void>) {
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      await action();
      loadAdminData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo completar la acción');
    } finally {
      setIsSaving(false);
    }
  }

  function runSensitiveAction(
    title: string,
    action: () => Promise<void>,
    message = 'Esta acción requiere confirmación antes de continuar.',
    confirmText = 'Sí, continuar',
  ) {
    setConfirmation({
      title,
      message,
      confirmText,
      onConfirm: action,
    });
  }

  async function handleConfirmAction() {
    const action = confirmation?.onConfirm;

    if (!action) {
      return;
    }

    setConfirmation(null);
    await executeSensitiveAction(action);
  }

  function handleUserRole(user: AdminUser, role: AdminUser['role']) {
    void runSensitiveAction(
      'Cambiar rol',
      async () => {
        await apiRequest(`/admin/users/${user.id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        });
        setMessage('Rol actualizado correctamente.');
      },
      `Se cambiará el rol de ${user.name} a ${getRoleLabel(role)}.`,
      'Sí, cambiar rol',
    );
  }

  function handleUserStatus(user: AdminUser, status: AdminUser['status']) {
    void runSensitiveAction(
      'Cambiar estado',
      async () => {
        await apiRequest(`/admin/users/${user.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        setMessage('Estado actualizado correctamente.');
      },
      `Se cambiará el estado de ${user.name} a ${getUserStatusLabel(status)}.`,
      'Sí, cambiar estado',
    );
  }

  async function handleCreateMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runSensitiveAction('Crear partido', async () => {
      await apiRequest('/admin/matches', {
        method: 'POST',
        body: JSON.stringify({
          homeTeamId: String(form.get('homeTeamId')),
          awayTeamId: String(form.get('awayTeamId')),
          utcDate: new Date(String(form.get('utcDate'))).toISOString(),
          status: String(form.get('status')),
        }),
      });
      formElement.reset();
      setMessage('Partido creado correctamente.');
    }, 'Se creará un partido manual con los equipos y fecha seleccionados.', 'Sí, crear partido');
  }

  async function handleUpdateMatch(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runSensitiveAction(
      'Actualizar partido',
      async () => {
        await apiRequest(`/admin/matches/${match.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            homeTeamId: String(form.get('homeTeamId')),
            awayTeamId: String(form.get('awayTeamId')),
            utcDate: new Date(String(form.get('utcDate'))).toISOString(),
            status: String(form.get('status')),
          }),
        });
        setEditingMatchId(null);
        setMessage('Partido actualizado correctamente.');
      },
      'Se actualizaran los equipos, fecha y estado del partido seleccionado.',
      'Si, actualizar',
    );
  }

  function handleDeleteMatch(match: Match) {
    void runSensitiveAction(
      'Eliminar partido',
      async () => {
        await apiRequest(`/admin/matches/${match.id}`, { method: 'DELETE' });
        setMatches((current) => current.filter((item) => item.id !== match.id));
        setMessage('Partido eliminado correctamente.');
      },
      `Se eliminara el partido ${match.homeTeam.name} vs ${match.awayTeam.name}. Tambien se eliminaran sus predicciones y puntajes relacionados.`,
      'Si, eliminar',
    );
  }

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const team = await apiRequest<Team>('/admin/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') ?? '').trim(),
          shortName: String(form.get('shortName') ?? '').trim() || undefined,
          crestUrl: String(form.get('crestUrl') ?? '').trim() || undefined,
        }),
      });
      setTeams((current) => [...current, team].sort((a, b) => a.name.localeCompare(b.name)));
      formElement.reset();
      setMessage('Equipo creado correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear el equipo');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateTeam(event: FormEvent<HTMLFormElement>, team: Team) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const updatedTeam = await apiRequest<Team>(`/admin/teams/${team.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(form.get('name') ?? '').trim(),
          shortName: String(form.get('shortName') ?? '').trim() || undefined,
          crestUrl: String(form.get('crestUrl') ?? '').trim() || undefined,
        }),
      });
      setTeams((current) =>
        current
          .map((item) => (item.id === updatedTeam.id ? updatedTeam : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingTeamId(null);
      setMessage('Equipo actualizado correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar el equipo');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteTeam(team: Team) {
    void runSensitiveAction(
      'Eliminar equipo',
      async () => {
        await apiRequest(`/admin/teams/${team.id}`, { method: 'DELETE' });
        setTeams((current) => current.filter((item) => item.id !== team.id));
        setMessage('Equipo eliminado correctamente.');
      },
      `Se eliminará el equipo ${team.name}. Esta acción no se puede deshacer.`,
      'Sí, eliminar',
    );
  }

  function handleMatchStatus(match: Match, status: string) {
    void runSensitiveAction(
      'Cambiar estado del partido',
      async () => {
        await apiRequest(`/admin/matches/${match.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        setMessage('Estado del partido actualizado.');
      },
      `Se cambiará el estado del partido a ${getMatchStatusLabel(status)}.`,
      'Sí, cambiar estado',
    );
  }

  async function handleResult(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runSensitiveAction(
      'Guardar resultado',
      async () => {
        await apiRequest(`/admin/matches/${match.id}/result`, {
          method: 'POST',
          body: JSON.stringify({
            homeScore: Number(form.get('homeScore')),
            awayScore: Number(form.get('awayScore')),
          }),
        });
        setMessage('Resultado guardado y puntajes recalculados.');
      },
      'Se registrará el resultado final y se recalcularán los puntajes relacionados.',
      'Sí, guardar resultado',
    );
  }

  function handleSyncNow() {
    void runSensitiveAction('Ejecutar sincronización', async () => {
      await apiRequest('/admin/sync/football-data', { method: 'POST' });
      await handleRefreshCompetitionSummary();
      setMessage('Sincronización ejecutada.');
    }, 'Se consultará Football-Data.org y se actualizarán equipos, partidos y resultados disponibles.', 'Sí, sincronizar');
  }

  async function handleRefreshCompetitionSummary() {
    setIsSaving(true);
    setError('');
    try {
      const [groups, knockoutMatches] = await Promise.all([
        apiRequest<GroupStanding[]>('/football-data/standings').catch(() => []),
        apiRequest<KnockoutMatch[]>('/football-data/knockout').catch(() => []),
      ]);

      setCompetitionSummary({ groups, knockoutMatches });
      setMessage('Resumen de competición actualizado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el resumen de competición');
    } finally {
      setIsSaving(false);
    }
  }

  function handleRecalculateScoring() {
    void runSensitiveAction('Recalcular puntajes', async () => {
      await apiRequest('/admin/scoring/recalculate', { method: 'POST' });
      setMessage('Puntajes recalculados correctamente.');
    }, 'Se recalcularán todos los puntajes y rankings con los resultados registrados.', 'Sí, recalcular');
  }

  async function handleCreateSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const slide = await apiRequest<CarouselSlide>('/admin/carousel-slides', {
        method: 'POST',
        body: JSON.stringify({
          title: String(form.get('title') ?? '').trim(),
          subtitle: String(form.get('subtitle') ?? '').trim(),
          imageUrl: String(form.get('imageUrl') ?? '').trim(),
          sortOrder: Number(form.get('sortOrder') ?? 0),
          isActive: form.get('isActive') === 'on',
        }),
      });
      setSlides((current) =>
        [...current, slide].sort((a, b) => a.sortOrder - b.sortOrder),
      );
      formElement.reset();
      setMessage('Slide creado correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear la diapositiva');
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSlide(slide: CarouselSlide) {
    void runSensitiveAction(
      `${slide.isActive ? 'Ocultar' : 'Mostrar'} diapositiva`,
      async () => {
        const updatedSlide = await apiRequest<CarouselSlide>(`/admin/carousel-slides/${slide.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !slide.isActive }),
        });
        setSlides((current) =>
          current.map((item) => (item.id === updatedSlide.id ? updatedSlide : item)),
        );
        setMessage('Estado de la diapositiva actualizado.');
      },
      `La diapositiva "${slide.title}" quedará ${slide.isActive ? 'oculta' : 'visible'} en el carrusel.`,
      `Sí, ${slide.isActive ? 'ocultar' : 'mostrar'}`,
    );
  }

  async function handleUpdateSlide(event: FormEvent<HTMLFormElement>, slide: CarouselSlide) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      const updatedSlide = await apiRequest<CarouselSlide>(`/admin/carousel-slides/${slide.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: String(form.get('title') ?? '').trim(),
          subtitle: String(form.get('subtitle') ?? '').trim(),
          imageUrl: String(form.get('imageUrl') ?? '').trim(),
          sortOrder: Number(form.get('sortOrder') ?? 0),
          isActive: form.get('isActive') === 'on',
        }),
      });
      setSlides((current) =>
        current
          .map((item) => (item.id === updatedSlide.id ? updatedSlide : item))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      setEditingSlideId(null);
      setMessage('Diapositiva actualizada correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar la diapositiva');
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteSlide(slide: CarouselSlide) {
    void runSensitiveAction(
      'Eliminar diapositiva',
      async () => {
        await apiRequest(`/admin/carousel-slides/${slide.id}`, { method: 'DELETE' });
        setSlides((current) => current.filter((item) => item.id !== slide.id));
        setMessage('Diapositiva eliminada correctamente.');
      },
      `Se eliminará la diapositiva "${slide.title}". Esta acción no se puede deshacer.`,
      'Sí, eliminar',
    );
  }

  return (
    <PrivateRoute role="ADMIN">
      <AdminLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
      >
        <AdminPageHeader activeTab={activeTab} />

        {error ? <Alert tone="error">{error}</Alert> : null}
        {message ? <Alert tone="success">{message}</Alert> : null}

        {isLoading ? <p className="text-sm font-semibold text-slate-500">Cargando panel...</p> : null}

        {activeTab === 'resumen' ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Usuarios" value={stats.users} />
            <StatCard label="Salas" value={stats.rooms} />
            <StatCard label="Equipos" value={teams.length} />
            <StatCard label="Partidos" value={stats.matches} />
            <StatCard label="Finalizados" value={stats.finishedMatches} />
            <StatCard label="Diapositivas activas" value={stats.activeSlides} />
            <StatCard label="Errores de sincronización" value={stats.syncErrors} />
          </section>
        ) : null}

        {activeTab === 'usuarios' ? (
          <section className="grid gap-4">
            {users.map((user) => (
              <AdminCard key={user.id}>
                <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                  <div>
                    <p className="font-black text-ink">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      {user._count?.predictions ?? 0} predicciones · {user._count?.roomMembership ?? 0} salas
                    </p>
                  </div>
                  <SelectField
                    label="Rol"
                    value={user.role}
                    options={['USER', 'ADMIN']}
                    onChange={(value) => handleUserRole(user, value as AdminUser['role'])}
                  />
                  <SelectField
                    label="Estado"
                    value={user.status}
                    options={userStatuses}
                    onChange={(value) => handleUserStatus(user, value as AdminUser['status'])}
                  />
                </div>
              </AdminCard>
            ))}
          </section>
        ) : null}

        {activeTab === 'equipos' ? (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]" onSubmit={handleCreateTeam}>
              <h2 className="text-lg font-black text-ink">Crear equipo manual</h2>
              <div className="mt-5 space-y-4">
                <TextInput label="Nombre del equipo" name="name" placeholder="Perú" />
                <TextInput label="Nombre corto" name="shortName" placeholder="PER" required={false} />
                <TextInput label="URL de bandera o escudo" name="crestUrl" placeholder="https://..." required={false} />
                <button className="h-11 w-full rounded-xl bg-action px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
                  Crear equipo
                </button>
              </div>
            </form>

            <AdminCard>
              <h2 className="text-lg font-black text-ink">Equipos registrados</h2>
              <div className="mt-5 grid gap-3">
                {teams.length === 0 ? <p className="text-sm text-slate-500">Aún no hay equipos registrados.</p> : null}
                {teams.map((team) => (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={team.id}>
                    {editingTeamId === team.id ? (
                      <form className="grid gap-3" onSubmit={(event) => handleUpdateTeam(event, team)}>
                        <TextInput label="Nombre del equipo" name="name" defaultValue={team.name} />
                        <TextInput label="Nombre corto" name="shortName" defaultValue={team.shortName ?? ''} required={false} />
                        <TextInput label="URL de bandera o escudo" name="crestUrl" defaultValue={team.crestUrl ?? ''} required={false} />
                        <div className="flex flex-wrap gap-2">
                          <button className="h-10 rounded-xl bg-action px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
                            Guardar cambios
                          </button>
                          <button className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-ink hover:border-slate-300" type="button" onClick={() => setEditingTeamId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          {team.crestUrl ? (
                            <img alt={team.name} className="h-10 w-10 rounded-lg bg-white object-contain p-1" src={team.crestUrl} />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-500">
                              {(team.shortName ?? team.name).slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-black text-ink">{team.name}</p>
                            <p className="text-xs font-semibold text-slate-500">{team.shortName ?? 'Sin nombre corto'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-ink hover:border-action hover:text-action" type="button" onClick={() => setEditingTeamId(team.id)}>
                            Editar
                          </button>
                          <button className="h-10 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50" type="button" onClick={() => handleDeleteTeam(team)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          </section>
        ) : null}

        {activeTab === 'salas' ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {rooms.map((room) => (
              <AdminCard key={room.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-ink">{room.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{room.description || 'Sin descripción'}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      Código {room.code} · {room._count?.members ?? 0} integrantes · {room._count?.predictions ?? 0} predicciones
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Propietario: {room.owner?.name ?? 'Sin propietario'}
                    </p>
                  </div>
                  <span className="h-12 w-12 rounded-2xl" style={{ backgroundColor: room.color }} />
                </div>
              </AdminCard>
            ))}
          </section>
        ) : null}

        {activeTab === 'partidos' ? (
          <section className="space-y-6">
            <AdminCard>
              <h2 className="text-lg font-black text-ink">Crear partido manual</h2>
              <form className="mt-4 grid gap-4 md:grid-cols-5" onSubmit={handleCreateMatch}>
                <SelectInput name="homeTeamId" label="Local" options={teams.map(teamOption)} />
                <SelectInput name="awayTeamId" label="Visitante" options={teams.map(teamOption)} />
                <TextInput name="utcDate" label="Fecha y hora" type="datetime-local" />
                <SelectInput name="status" label="Estado" options={matchStatuses.map(valueOption)} />
                <button className="self-end rounded-xl bg-action px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
                  Crear
                </button>
              </form>
            </AdminCard>

            <div className="grid gap-4">
              {matches.map((match) => (
                <AdminCard key={match.id}>
                  <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto_auto] xl:items-end">
                    <div>
                      <p className="font-black text-ink">
                        {match.homeTeam.name} vs {match.awayTeam.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(match.utcDate)} · {getMatchStatusLabel(match.status)}
                      </p>
                      <p className="mt-2 text-sm font-black text-action">
                        Marcador: {match.homeScore ?? '-'} - {match.awayScore ?? '-'}
                      </p>
                    </div>
                    <SelectField
                      label="Estado"
                      value={match.status}
                      options={matchStatuses}
                      onChange={(value) => handleMatchStatus(match, value)}
                    />
                    <form className="grid grid-cols-[80px_80px_auto] gap-2" onSubmit={(event) => handleResult(event, match)}>
                      <TextInput compact name="homeScore" label="Local" type="number" defaultValue={match.homeScore ?? 0} />
                      <TextInput compact name="awayScore" label="Visitante" type="number" defaultValue={match.awayScore ?? 0} />
                      <button className="self-end rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-ink hover:border-action hover:text-action disabled:opacity-60" disabled={isSaving} type="submit">
                        Guardar resultado
                      </button>
                    </form>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-black text-ink hover:border-action hover:text-action" type="button" onClick={() => setEditingMatchId(match.id)}>
                        Editar
                      </button>
                      <button className="h-11 rounded-xl border border-red-200 px-4 text-sm font-black text-red-700 hover:bg-red-50" type="button" onClick={() => handleDeleteMatch(match)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {editingMatchId === match.id ? (
                    <form className="mt-5 grid gap-4 border-t border-slate-100 pt-5 xl:grid-cols-5 xl:items-end" onSubmit={(event) => handleUpdateMatch(event, match)}>
                      <SelectInput name="homeTeamId" label="Local" options={teams.map(teamOption)} defaultValue={match.homeTeam.id} />
                      <SelectInput name="awayTeamId" label="Visitante" options={teams.map(teamOption)} defaultValue={match.awayTeam.id} />
                      <TextInput name="utcDate" label="Fecha y hora" type="datetime-local" defaultValue={toDateTimeLocalValue(match.utcDate)} />
                      <SelectInput name="status" label="Estado" options={matchStatuses.map(valueOption)} defaultValue={match.status} />
                      <div className="grid grid-cols-2 gap-2">
                        <button className="rounded-xl bg-action px-4 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
                          Guardar
                        </button>
                        <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-ink hover:border-action hover:text-action" type="button" onClick={() => setEditingMatchId(null)}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : null}
                </AdminCard>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'competicion' ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <AdminCard>
              <h2 className="text-lg font-black text-ink">Datos oficiales del Mundial</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Las tablas de grupos y la fase eliminatoria se consultan desde Football-Data.org. El administrador controla la sincronización y puede corregir equipos o partidos desde los CRUD internos cuando sea necesario.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MiniMetric label="Grupos publicados" value={competitionSummary.groups.length} />
                <MiniMetric label="Partidos eliminatorios" value={competitionSummary.knockoutMatches.length} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-xl bg-action px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="button" onClick={handleRefreshCompetitionSummary}>
                  Actualizar vista
                </button>
                <button className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-ink hover:border-action hover:text-action disabled:opacity-60" disabled={isSaving} type="button" onClick={handleSyncNow}>
                  Sincronizar API
                </button>
              </div>
            </AdminCard>

            <AdminCard>
              <h2 className="text-lg font-black text-ink">Control administrativo</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Estos datos nacen desde la API oficial. Para contingencias, usa equipos y partidos locales: ahí puedes crear, editar o eliminar registros manuales.
              </p>
              <div className="mt-5 grid gap-3">
                <AdminControlLink href="/groups" title="Ver grupos" description="Revisa la pantalla pública de tablas oficiales." />
                <AdminControlLink href="/knockout" title="Ver eliminatorias" description="Revisa el bracket público de la fase final." />
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black text-ink hover:border-action hover:text-action" type="button" onClick={() => setActiveTab('equipos')}>
                  Gestionar equipos
                  <span className="mt-1 block text-xs font-semibold text-slate-500">Crear, editar o eliminar equipos manuales.</span>
                </button>
                <button className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black text-ink hover:border-action hover:text-action" type="button" onClick={() => setActiveTab('partidos')}>
                  Gestionar partidos
                  <span className="mt-1 block text-xs font-semibold text-slate-500">Crear, editar, eliminar partidos y registrar resultados.</span>
                </button>
              </div>
            </AdminCard>

            <AdminCard>
              <h2 className="text-lg font-black text-ink">Regla de clasificación</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Clasifican 32 equipos a eliminatorias: los dos primeros de cada grupo y los 8 mejores terceros.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MiniMetric label="Clasificados directos" value="24" />
                <MiniMetric label="Mejores terceros" value="8" />
              </div>
            </AdminCard>

            <AdminCard>
              <h2 className="text-lg font-black text-ink">Fuente y respaldo</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                La sincronización guarda información oficial en la base local. Si Football-Data.org falla, el panel de partidos permite registrar resultados y recalcular puntajes.
              </p>
              <button className="mt-5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-ink hover:border-action hover:text-action" type="button" onClick={() => setActiveTab('sincronizacion')}>
                Ir a sincronización
              </button>
            </AdminCard>
          </section>
        ) : null}

        {activeTab === 'sincronizacion' ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <AdminCard>
              <h2 className="text-lg font-black text-ink">Football-Data.org</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ejecuta sincronización manual para equipos, partidos, estados y resultados oficiales.
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-600">
                Estado actual: {getSyncStatusText(syncStatus)}
              </p>
              <button className="mt-5 rounded-xl bg-action px-5 py-3 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="button" onClick={handleSyncNow}>
                Sincronizar ahora
              </button>
            </AdminCard>
            <AdminCard>
              <h2 className="text-lg font-black text-ink">Puntajes y rankings</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Recalcula todos los puntajes cuando se corrigen resultados o se necesita validar clasificaciones.
              </p>
              <button className="mt-5 rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-ink hover:border-action hover:text-action disabled:opacity-60" disabled={isSaving} type="button" onClick={handleRecalculateScoring}>
                Recalcular puntajes
              </button>
            </AdminCard>
          </section>
        ) : null}

        {activeTab === 'carrusel' ? (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]" onSubmit={handleCreateSlide}>
              <h2 className="text-lg font-black text-ink">Nueva diapositiva del inicio</h2>
              <div className="mt-5 space-y-4">
                <TextInput label="Título" name="title" placeholder="Mundial 2026" />
                <TextInput label="Subtítulo" name="subtitle" placeholder="Predice, compite y revisa tu clasificación." />
                <TextInput label="Ruta o URL de imagen" name="imageUrl" placeholder="/home-carousel-1.png" />
                <TextInput label="Orden" name="sortOrder" placeholder="1" type="number" />
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                  <input className="h-4 w-4 rounded border-slate-300 text-action focus:ring-action" defaultChecked name="isActive" type="checkbox" />
                  Visible en el carrusel
                </label>
                <button className="h-11 w-full rounded-xl bg-action px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
                  Crear diapositiva
                </button>
              </div>
            </form>

            <AdminCard>
              <h2 className="text-lg font-black text-ink">Diapositivas configuradas</h2>
              <div className="mt-5 space-y-3">
                {slides.length === 0 ? <p className="text-sm text-slate-500">Aún no hay diapositivas registradas.</p> : null}
                {slides.map((slide) => (
                  <div className="rounded-xl border border-slate-200 p-3" key={slide.id}>
                    {editingSlideId === slide.id ? (
                      <form className="grid gap-3" onSubmit={(event) => handleUpdateSlide(event, slide)}>
                        <TextInput label="Título" name="title" defaultValue={slide.title} />
                        <TextInput label="Subtítulo" name="subtitle" defaultValue={slide.subtitle} />
                        <TextInput label="Ruta o URL de imagen" name="imageUrl" defaultValue={slide.imageUrl} />
                        <TextInput label="Orden" name="sortOrder" defaultValue={slide.sortOrder} type="number" />
                        <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                          <input className="h-4 w-4 rounded border-slate-300 text-action focus:ring-action" defaultChecked={slide.isActive} name="isActive" type="checkbox" />
                          Visible en el carrusel
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button className="h-10 rounded-xl bg-action px-4 text-sm font-black text-white disabled:opacity-60" disabled={isSaving} type="submit">
                            Guardar cambios
                          </button>
                          <button className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-ink hover:border-slate-300" type="button" onClick={() => setEditingSlideId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                        <img alt={slide.title} className="h-20 w-full rounded-lg bg-slate-100 object-cover" src={slide.imageUrl} />
                        <div>
                          <p className="text-sm font-black text-ink">{slide.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{slide.subtitle}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            Orden {slide.sortOrder} · {slide.isActive ? 'Visible' : 'Oculto'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <button className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-ink hover:border-action hover:text-action" type="button" onClick={() => setEditingSlideId(slide.id)}>
                            Editar
                          </button>
                          <button className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-ink hover:border-action hover:text-action" type="button" onClick={() => toggleSlide(slide)}>
                            {slide.isActive ? 'Ocultar' : 'Mostrar'}
                          </button>
                          <button className="h-10 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50" type="button" onClick={() => handleDeleteSlide(slide)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          </section>
        ) : null}

        {activeTab === 'logs' ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <LogList title="Registros de sincronización" logs={syncLogs.map((log) => ({
              id: log.id,
              title: `${log.provider} · ${getSyncStatusLabel(log.status)}`,
              subtitle: log.message ?? 'Sin mensaje',
              date: log.startedAt,
            }))} />
            <LogList title="Auditoría" logs={auditLogs.map((log) => ({
              id: log.id,
              title: `${getAuditActionLabel(log.action)} · ${getAuditEntityLabel(log.entity)}`,
              subtitle: log.admin ? `${log.admin.name} (${log.admin.email})` : 'Admin no disponible',
              date: log.createdAt,
            }))} />
          </section>
        ) : null}

        {confirmation ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <h2 className="text-xl font-black text-ink">{confirmation.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {confirmation.message}
              </p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-ink transition hover:border-slate-300 hover:bg-slate-50"
                  type="button"
                  onClick={() => setConfirmation(null)}
                >
                  Cancelar
                </button>
                <button
                  className="h-11 rounded-xl bg-action px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(20,87,217,0.24)] transition hover:bg-blue-700 disabled:opacity-60"
                  type="button"
                  disabled={isSaving}
                  onClick={handleConfirmAction}
                >
                  {confirmation.confirmText}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </AdminLayout>
    </PrivateRoute>
  );
}

function AdminLayout({
  activeTab,
  setActiveTab,
  stats,
  children,
}: {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  stats: {
    users: number;
    rooms: number;
    matches: number;
    finishedMatches: number;
    activeSlides: number;
    syncErrors: number;
  };
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#eef3f8] text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-[#082442] text-white shadow-[18px_0_45px_rgba(8,36,66,0.18)] xl:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-5">
            <Link className="flex items-center gap-3" href="/admin">
              <LogoMark />
              <span>
                <span className="block text-sm font-black leading-4">World Cup Predictions</span>
                <span className="block text-xs font-semibold leading-4 text-blue-300">Panel admin</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {tabs.map((tab) => (
              <button
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-black transition ${
                  activeTab === tab.id
                    ? 'bg-action text-white shadow-[0_12px_28px_rgba(20,87,217,0.30)]'
                    : 'text-blue-200 hover:bg-white/8 hover:text-white'
                }`}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`h-2 w-2 rounded-full ${activeTab === tab.id ? 'bg-white' : 'bg-blue-400/40'}`} />
              </button>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Resumen</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xl font-black">{stats.users}</p>
                  <p className="text-xs text-blue-200">Usuarios</p>
                </div>
                <div>
                  <p className="text-xl font-black">{stats.matches}</p>
                  <p className="text-xs text-blue-200">Partidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="xl:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Abrir navegación administrativa"
                className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-ink xl:hidden"
                type="button"
                onClick={() => setIsMobileMenuOpen((current) => !current)}
              >
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
                <span className="h-0.5 w-5 rounded-full bg-current" />
              </button>
              <div>
                <p className="text-sm font-black text-ink">Panel de administrador</p>
                <p className="text-xs font-semibold text-slate-500">World Cup Predictions 2026</p>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-end gap-3">
              <Link className="hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-ink transition hover:border-action hover:text-action sm:block" href="/dashboard">
                Ver plataforma
              </Link>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-action text-sm font-black text-white">
                {(user?.name ?? 'A').slice(0, 1).toUpperCase()}
              </div>
              <button
                className="rounded-xl bg-[#082442] px-4 py-2 text-sm font-black text-white transition hover:bg-[#0d3264]"
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {isMobileMenuOpen ? (
            <div className="border-t border-slate-200 bg-white px-4 py-3 xl:hidden">
              <div className="grid gap-2 sm:grid-cols-2">
                {tabs.map((tab) => (
                  <button
                    className={`rounded-xl px-4 py-3 text-left text-sm font-black transition ${
                      activeTab === tab.id
                        ? 'bg-action text-white'
                        : 'border border-slate-200 bg-white text-slate-600'
                    }`}
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        <section className="px-4 py-7 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </section>
      </div>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06182c]/70 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <h2 className="text-xl font-black text-ink">Cerrar sesión</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tu sesión administrativa se cerrará en este dispositivo.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-ink transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="h-11 rounded-xl bg-action px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(20,87,217,0.24)] transition hover:bg-blue-700"
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AdminPageHeader({ activeTab }: { activeTab: AdminTab }) {
  const content: Record<AdminTab, { title: string; subtitle: string }> = {
    resumen: {
      title: 'Resumen operativo',
      subtitle: 'Estado general de usuarios, equipos, salas, partidos y sincronización.',
    },
    usuarios: {
      title: 'Gestión de usuarios',
      subtitle: 'Administra roles, estados de cuenta y actividad de participantes.',
    },
    equipos: {
      title: 'Gestión de equipos',
      subtitle: 'Crea equipos manualmente y registra su bandera o escudo para usarlos en partidos.',
    },
    salas: {
      title: 'Gestión de salas',
      subtitle: 'Revisa salas privadas, códigos permanentes, propietarios e integrantes.',
    },
    partidos: {
      title: 'Gestión de partidos',
      subtitle: 'Crea encuentros manuales, ajusta estados y registra resultados oficiales.',
    },
    competicion: {
      title: 'Control de competición',
      subtitle: 'Supervisa grupos y eliminatorias oficiales, sincroniza Football-Data.org y usa los CRUD locales como contingencia.',
    },
    sincronizacion: {
      title: 'Sincronización y puntajes',
      subtitle: 'Ejecuta Football-Data.org y recalcula rankings cuando sea necesario.',
    },
    carrusel: {
      title: 'Carrusel de inicio',
      subtitle: 'Controla las imágenes visibles en la pantalla principal de la plataforma.',
    },
    logs: {
      title: 'Auditoría',
      subtitle: 'Consulta eventos administrativos y registros de sincronización.',
    },
  };

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,35,66,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-action">Administrador</p>
      <h1 className="mt-2 text-3xl font-black tracking-normal text-ink">{content[activeTab].title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{content[activeTab].subtitle}</p>
    </div>
  );
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const classes =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return <div className={`mb-5 rounded-lg border px-4 py-3 text-sm font-semibold ${classes}`}>{children}</div>;
}

function AdminCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">{children}</div>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <AdminCard>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-ink">{value}</p>
    </AdminCard>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function AdminControlLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-ink hover:border-action hover:text-action"
      href={href}
    >
      {title}
      <span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span>
    </Link>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        className="mt-2 h-11 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-ink outline-none focus:border-action"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getAdminOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectInput({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <select className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-action" defaultValue={defaultValue} name={name} required>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue,
  compact = false,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string | number;
  compact?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className={`mt-2 h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-action ${compact ? 'w-full' : 'w-full'}`}
        defaultValue={defaultValue}
        min={type === 'number' ? 0 : undefined}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function LogList({
  title,
  logs,
}: {
  title: string;
  logs: Array<{ id: string; title: string; subtitle: string; date: string }>;
}) {
  return (
    <AdminCard>
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-5 space-y-3">
        {logs.length === 0 ? <p className="text-sm text-slate-500">Sin registros.</p> : null}
        {logs.slice(0, 25).map((log) => (
          <div className="rounded-xl bg-slate-50 px-4 py-3" key={log.id}>
            <p className="text-sm font-black text-ink">{log.title}</p>
            <p className="mt-1 text-xs text-slate-500">{log.subtitle}</p>
            <p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(log.date)}</p>
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

function teamOption(team: Team) {
  return {
    label: team.name,
    value: team.id,
  };
}

function valueOption(value: string) {
  return {
    label: getAdminOptionLabel(value),
    value,
  };
}

function getAdminOptionLabel(value: string) {
  return (
    getMatchStatusLabel(value) ||
    getUserStatusLabel(value) ||
    getRoleLabel(value) ||
    getSyncStatusLabel(value) ||
    value
  );
}

function getMatchStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: 'Programado',
    LIVE: 'En vivo',
    FINISHED: 'Finalizado',
    POSTPONED: 'Postergado',
    CANCELLED: 'Cancelado',
  };

  return labels[status] ?? '';
}

function getUserStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_VERIFICATION: 'Pendiente de verificación',
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    BLOCKED: 'Bloqueado',
  };

  return labels[status] ?? '';
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    USER: 'Usuario',
    ADMIN: 'Administrador',
  };

  return labels[role] ?? '';
}

function getSyncStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SUCCESS: 'Correcto',
    ERROR: 'Error',
    PARTIAL: 'Parcial',
  };

  return labels[status] ?? '';
}

function getAuditActionLabel(action: string) {
  const labels: Record<string, string> = {
    UPDATE_USER_ROLE: 'Actualización de rol',
    UPDATE_USER_STATUS: 'Actualización de estado',
    UPDATE_ROOM: 'Actualización de sala',
    CREATE_TEAM: 'Creación de equipo',
    UPDATE_TEAM: 'Actualización de equipo',
    DELETE_TEAM: 'Eliminación de equipo',
    CREATE_MATCH: 'Creación de partido',
    UPDATE_MATCH: 'Actualización de partido',
    UPDATE_MATCH_RESULT: 'Registro de resultado',
    RECALCULATE_SCORING: 'Recálculo de puntajes',
    CREATE_CAROUSEL_SLIDE: 'Creación de diapositiva',
    UPDATE_CAROUSEL_SLIDE: 'Actualización de diapositiva',
    DELETE_CAROUSEL_SLIDE: 'Eliminación de diapositiva',
  };

  return labels[action] ?? action;
}

function getAuditEntityLabel(entity: string) {
  const labels: Record<string, string> = {
    User: 'Usuario',
    Room: 'Sala',
    Team: 'Equipo',
    Match: 'Partido',
    Score: 'Puntaje',
    CarouselSlide: 'Diapositiva',
  };

  return labels[entity] ?? entity;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getSyncStatusText(syncStatus: SyncStatusResponse | null) {
  if (!syncStatus) {
    return 'Sin sincronización registrada';
  }

  if ('lastSync' in syncStatus) {
    return syncStatus.lastSync?.status
      ? getSyncStatusLabel(syncStatus.lastSync.status)
      : syncStatus.message ?? 'Sin sincronización registrada';
  }

  if ('status' in syncStatus) {
    return `${getSyncStatusLabel(syncStatus.status)}${syncStatus.message ? ` - ${syncStatus.message}` : ''}`;
  }

  return 'Sin sincronización registrada';
}
