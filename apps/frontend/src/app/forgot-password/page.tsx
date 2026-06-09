'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { SubmitButton } from '@/components/auth/submit-button';
import { useAuth } from '@/features/auth/auth-context';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email'));

    try {
      const message = await forgotPassword(email);
      setSuccess(message);
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo solicitar recuperación');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Recupera tu acceso"
      subtitle="Te enviaremos un código para crear una nueva contraseña."
      footerText="¿Recordaste tu contraseña?"
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
        />
        <SubmitButton isLoading={isLoading}>Enviar código</SubmitButton>
      </form>
    </AuthShell>
  );
}
