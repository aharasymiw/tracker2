import { useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AuthError } from './useAuth';

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage(null);
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate('/characters');
        },
        onError: (error) => {
          const message = error instanceof AuthError ? error.message : 'Login failed';
          setErrorMessage(message);
        },
      },
    );
  };

  const handleRegister = (): void => {
    setErrorMessage(null);
    register.mutate(
      { email, password },
      {
        onSuccess: () => {
          navigate('/characters');
        },
        onError: (error) => {
          const message =
            error instanceof AuthError ? error.message : 'Registration failed';
          setErrorMessage(message);
        },
      },
    );
  };

  const isBusy = login.isPending || register.isPending;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold tracking-wide text-toxic-500">
        Sign in to the wasteland
      </h1>
      <form
        className="flex w-full flex-col gap-3 rounded border border-neutral-800 bg-neutral-900 p-6"
        onSubmit={handleSubmit}
        aria-label="login-form"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-400">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 font-mono text-neutral-100 focus:border-toxic-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-400">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 font-mono text-neutral-100 focus:border-toxic-500 focus:outline-none"
          />
        </label>
        {errorMessage !== null ? (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isBusy}
          className="mt-2 rounded bg-toxic-600 px-3 py-2 text-sm font-bold text-neutral-950 hover:bg-toxic-500 disabled:opacity-60"
        >
          {login.isPending ? 'Logging in...' : 'Log in'}
        </button>
        <button
          type="button"
          onClick={handleRegister}
          disabled={isBusy}
          className="text-sm text-toxic-400 underline hover:text-toxic-300 disabled:opacity-60"
        >
          {register.isPending ? 'Registering...' : 'Register a new account'}
        </button>
      </form>
    </div>
  );
}
