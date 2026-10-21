import { useAuth } from '@components/auth/AuthContext';
import { AuthFormField } from '@components/auth/AuthFormField';
import { Button } from '@components/ui/third-party/shadcn/button';
import { RouteDefs } from '@core/router/routes';
import { useDocumentTitle } from '@hooks/useDocumentTitle';
import { useMutation } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import type { FC, SubmitEvent } from 'react';
import { Link, useLocation } from 'react-router';

type LoginErrors = Partial<Record<'password' | 'username', string>>;

const LoginPage: FC = () => {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const location = useLocation();
  const state: unknown = location.state;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  // Navigating away on success is handled by RequireGuest once the session is set.
  const { mutate, error, isPending, reset } = useMutation({ mutationFn: login });

  // The submit button stays enabled while idle: a disabled default button blocks Enter-to-submit,
  // and autofilled values may not reach state until the user interacts with the page.
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isPending) {
      return;
    }

    const trimmedUsername = username.trim();
    const nextErrors: LoginErrors = {};
    if (trimmedUsername === '') {
      nextErrors.username = 'Enter your username.';
    }
    if (password === '') {
      nextErrors.password = 'Enter your password.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      mutate({ username: trimmedUsername, password });
    }
  };

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to continue.</p>
      </div>

      {error !== null && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error.message}</p>
      )}

      <AuthFormField
        autoComplete="username"
        disabled={isPending}
        error={errors.username}
        label="Username"
        value={username}
        onChange={(value) => {
          setUsername(value);
          setErrors(({ username: _removed, ...rest }) => rest);
          reset();
        }}
      />
      <AuthFormField
        autoComplete="current-password"
        disabled={isPending}
        error={errors.password}
        label="Password"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          setErrors(({ password: _removed, ...rest }) => rest);
          reset();
        }}
      />

      <Button disabled={isPending} size="lg" type="submit">
        <LogIn data-icon="inline-start" />
        {isPending ? 'Logging in…' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?
        {' '}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" state={state} to={RouteDefs.signUp}>Sign up</Link>
      </p>
    </form>
  );
};

export default LoginPage;
