'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PasswordField } from '@/components/auth/password-field';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { AppShell } from '@/components/layout/app-shell';
import { PrivateRoute } from '@/components/layout/private-route';
import { useAuth } from '@/features/auth/auth-context';
import { isStrongPassword } from '@/features/auth/password-strength';
import { apiRequest } from '@/lib/http-client';
import type { AuthUser } from '@/types/auth';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isCodeSending, setIsCodeSending] = useState(false);

  useEffect(() => {
    apiRequest<AuthUser>('/users/me')
      .then((nextProfile) => {
        setProfile(nextProfile);
        setName(nextProfile.name);
      })
      .catch((error) =>
        setError(error instanceof Error ? error.message : 'No se pudo cargar perfil'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    setIsSaving(true);

    try {
      const updated = await apiRequest<AuthUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim() }),
      });
      window.localStorage.setItem('wcpp_user', JSON.stringify(updated));
      setProfile(updated);
      setSuccess('Perfil actualizado correctamente.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar perfil');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendPasswordCode() {
    const email = profile?.email ?? user?.email;

    if (!email) {
      setError('No se encontró el correo de la cuenta.');
      return;
    }

    setError('');
    setSuccess('');
    setIsCodeSending(true);

    try {
      const response = await apiRequest<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSuccess(response.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo enviar el código');
    } finally {
      setIsCodeSending(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = profile?.email ?? user?.email;
    setError('');
    setSuccess('');

    if (!email) {
      setError('No se encontró el correo de la cuenta.');
      return;
    }

    if (passwordCode.trim().length !== 8) {
      setError('El código debe tener 8 caracteres.');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setError('La nueva contraseña debe cumplir todos los requisitos de seguridad.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      const response = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          code: passwordCode.trim().toUpperCase(),
          newPassword,
        }),
      });
      setPasswordCode('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(`${response.message} Por seguridad, vuelve a iniciar sesión.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña');
    } finally {
      setIsPasswordSaving(false);
    }
  }

  return (
    <PrivateRoute>
      <AppShell
        title="Perfil"
        subtitle="Consulta tus datos de cuenta, actualiza tu nombre visible y protege tu contraseña."
      >
        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl bg-[#082442] p-6 text-white shadow-[0_14px_34px_rgba(15,35,66,0.18)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-action text-4xl font-black shadow-[0_12px_28px_rgba(20,87,217,0.35)]">
              {(profile?.name ?? user?.name ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black">{profile?.name ?? user?.name}</h2>
              <p className="mt-1 text-sm text-blue-200">{profile?.email ?? user?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
            <h2 className="text-lg font-bold text-ink">Cuenta</h2>
            {isLoading ? <p className="mt-4 text-sm text-slate-500">Cargando...</p> : null}
            {profile ? (
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">Nombre</dt>
                  <dd className="mt-1 font-bold text-ink">{profile.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Correo</dt>
                  <dd className="mt-1 font-bold text-ink">{profile.email}</dd>
                </div>
              </dl>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,35,66,0.10)]">
            <h2 className="text-lg font-bold text-ink">Editar perfil</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-bold text-ink">Nombre visible</span>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-action"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
              <button
                className="h-11 rounded-lg bg-action px-5 text-sm font-bold text-white hover:bg-[#0b4cc4] disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,35,66,0.10)] lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink">Cambiar contraseña</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Enviaremos un código al correo registrado. Luego ingresa el código y tu nueva contraseña segura.
                </p>
              </div>
              <button
                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-ink transition hover:border-action hover:text-action disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCodeSending}
                type="button"
                onClick={handleSendPasswordCode}
              >
                {isCodeSending ? 'Enviando...' : 'Enviar código'}
              </button>
            </div>

            <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={handleChangePassword}>
              <label className="block">
                <span className="text-sm font-bold text-ink">Código recibido</span>
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm uppercase outline-none focus:border-action"
                  maxLength={8}
                  minLength={8}
                  placeholder="AB12CD34"
                  value={passwordCode}
                  onChange={(event) => setPasswordCode(event.target.value.toUpperCase())}
                  required
                />
              </label>
              <div />
              <div className="space-y-3">
                <PasswordField
                  autoComplete="new-password"
                  label="Nueva contraseña"
                  name="newPassword"
                  placeholder="Ingresa tu nueva contraseña"
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>
              <PasswordField
                autoComplete="new-password"
                label="Confirmar contraseña"
                name="confirmPassword"
                placeholder="Repite tu nueva contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
              />
              <div className="lg:col-span-2">
                <button
                  className="h-11 rounded-lg bg-action px-5 text-sm font-bold text-white hover:bg-[#0b4cc4] disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={isPasswordSaving}
                  type="submit"
                >
                  {isPasswordSaving ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </AppShell>
    </PrivateRoute>
  );
}
