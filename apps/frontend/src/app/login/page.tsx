'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { PasswordField } from '@/components/auth/password-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/features/auth/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      await login({
        email: String(formData.get('email')),
        password: String(formData.get('password')),
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Bienvenido de vuelta"
      subtitle="Ingresa para continuar con tus predicciones, salas y rankings."
      footerText="¿No tienes una cuenta?"
      footerHref="/register"
      footerAction="Crear cuenta"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? <AuthAlert type="error" message={error} /> : null}

        <FormField
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
        />

        <div className="space-y-2">
          <PasswordField
            label="Contraseña"
            name="password"
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              className="text-xs font-bold text-action hover:text-[#0b4cc4]"
              href="/forgot-password"
            >
              Olvidé mi contraseña
            </Link>
          </div>
        </div>

        <SubmitButton isLoading={isLoading}>Iniciar sesión</SubmitButton>
      </form>
    </AuthShell>
  );
}
