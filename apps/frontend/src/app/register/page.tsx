'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { PasswordField } from '@/components/auth/password-field';
import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/features/auth/auth-context';
import { isStrongPassword } from '@/features/auth/password-strength';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));
    const nextPassword = String(formData.get('password'));

    if (!isStrongPassword(nextPassword)) {
      setError(
        'La contraseña debe tener mayúscula, minúscula, número y carácter especial.',
      );
      setIsLoading(false);
      return;
    }

    try {
      await register({
        name: String(formData.get('name')),
        email,
        password: nextPassword,
      });
      setSuccess('Cuenta creada. Revisa tu correo e ingresa el codigo de verificacion.');
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Unete a salas, predice partidos y compite por el podio."
      footerText="Ya tienes una cuenta?"
      footerHref="/login"
      footerAction="Iniciar sesion"
      imageVariant="register"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}

        <FormField
          label="Nombre"
          name="name"
          placeholder="Tu nombre"
          autoComplete="name"
        />
        <FormField
          label="Correo electronico"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
        />
        <PasswordField
          label="Contraseña"
          name="password"
          placeholder="Ejemplo: Mundial2026!"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <PasswordStrengthMeter password={password} />

        <SubmitButton isLoading={isLoading}>Crear cuenta</SubmitButton>
      </form>
    </AuthShell>
  );
}
