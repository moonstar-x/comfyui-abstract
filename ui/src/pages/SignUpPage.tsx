import { useAuth } from '@components/auth/AuthContext';
import { AuthFormField } from '@components/auth/AuthFormField';
import { Button } from '@components/ui/third-party/shadcn/button';
import { PASSWORD_MIN_LENGTH, validatePasswordLength } from '@core/auth/validation';
import { RouteDefs } from '@core/router/routes';
import { useMutation } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import type { FC, SubmitEvent } from 'react';
import { Link, useLocation } from 'react-router';

// Keep in sync with api/src/services/auth/schemas.ts and api/src/services/auth/reserved.ts.
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 64;
const USERNAME_PATTERN = /^[\w\-.]+$/u;
const RESERVED_USERNAMES: ReadonlySet<string> = new Set(['me']);

interface SignUpValues {
  confirmPassword: string;
  password: string;
  username: string;
}

type SignUpErrors = Partial<Record<keyof SignUpValues, string>>;

const validate = ({ username, password, confirmPassword }: SignUpValues): SignUpErrors => {
  const errors: SignUpErrors = {};

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    errors.username = `Username must be between ${USERNAME_MIN_LENGTH.toString()} and ${USERNAME_MAX_LENGTH.toString()} characters.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Username may only contain letters, numbers, dots, dashes and underscores.';
  } else if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    errors.username = 'This username is reserved.';
  }

  const passwordError = validatePasswordLength(password);
  if (passwordError !== undefined) {
    errors.password = passwordError;
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

const SignUpPage: FC = () => {
  const { signUp } = useAuth();
  const location = useLocation();
  const state: unknown = location.state;
  const [values, setValues] = useState<SignUpValues>({ username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<SignUpErrors>({});
  // Navigating away on success is handled by RequireGuest once the session is set.
  const { mutate, error, isPending, reset } = useMutation({ mutationFn: signUp });

  const handleChange = (key: keyof SignUpValues) => (value: string): void => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors(({ [key]: _removed, ...rest }) => rest);
    reset();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isPending) {
      return;
    }

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      mutate({ username: values.username, password: values.password });
    }
  };

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Pick a username and password to get started.</p>
      </div>

      {error !== null && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error.message}</p>
      )}

      <AuthFormField
        autoComplete="username"
        description="Letters, numbers, dots, dashes and underscores."
        disabled={isPending}
        error={errors.username}
        label="Username"
        value={values.username}
        onChange={handleChange('username')}
      />
      <AuthFormField
        autoComplete="new-password"
        description={`At least ${PASSWORD_MIN_LENGTH.toString()} characters.`}
        disabled={isPending}
        error={errors.password}
        label="Password"
        type="password"
        value={values.password}
        onChange={handleChange('password')}
      />
      <AuthFormField
        autoComplete="new-password"
        disabled={isPending}
        error={errors.confirmPassword}
        label="Confirm password"
        type="password"
        value={values.confirmPassword}
        onChange={handleChange('confirmPassword')}
      />

      <Button disabled={isPending} size="lg" type="submit">
        <UserPlus data-icon="inline-start" />
        {isPending ? 'Creating account…' : 'Sign up'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?
        {' '}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" state={state} to={RouteDefs.login}>Log in</Link>
      </p>
    </form>
  );
};

export default SignUpPage;
