'use client';

import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { PasswordField } from '@/components/auth/password-field';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/features/auth/auth-context';
import { isStrongPassword } from '@/features/auth/password-strength';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const email = searchParams.get('email') ?? '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const nextPassword = String(formData.get('newPassword'));

    if (!isStrongPassword(nextPassword)) {
      setError(
        'La contraseña debe tener mayúscula, minúscula, número y carácter especial.',
      );
      setIsLoading(false);
      return;
    }

    try {
      const message = await resetPassword(
        String(formData.get('email')),
        String(formData.get('code')),
        nextPassword,
      );
      setSuccess(message);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Ingresa el código de recuperación y define tu nueva contraseña."
      footerText="¿Ya tienes acceso?"
      footerHref="/login"
      footerAction="Iniciar sesión"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}
        <FormField
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          defaultValue={email}
        />
        <FormField
          label="Código"
          name="code"
          placeholder="A7K9P2QX"
          autoComplete="one-time-code"
          minLength={8}
        />
        <PasswordField
          label="Nueva contraseña"
          name="newPassword"
          placeholder="Ejemplo: Mundial2026!"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <PasswordStrengthMeter password={password} />
        <SubmitButton isLoading={isLoading}>Cambiar contraseña</SubmitButton>
      </form>
    </AuthShell>
  );
}
