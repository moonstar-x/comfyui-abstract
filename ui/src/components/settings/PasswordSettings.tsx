import { useAuth } from '@components/auth/AuthContext';
import { AuthFormField } from '@components/auth/AuthFormField';
import { SettingsSection } from '@components/settings/SettingsSection';
import { Button } from '@components/ui/third-party/shadcn/button';
import { PASSWORD_MIN_LENGTH, validatePasswordLength } from '@core/auth/validation';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck, KeyRound } from 'lucide-react';
import { useState } from 'react';
import type { FC, SubmitEvent } from 'react';

interface PasswordValues {
  confirmPassword: string;
  currentPassword: string;
  password: string;
}

type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

const EMPTY_VALUES: PasswordValues = { currentPassword: '', password: '', confirmPassword: '' };

const validate = ({ currentPassword, password, confirmPassword }: PasswordValues): PasswordErrors => {
  const errors: PasswordErrors = {};

  if (currentPassword === '') {
    errors.currentPassword = 'Enter your current password.';
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

export const PasswordSettings: FC = () => {
  const { changePassword } = useAuth();
  const [values, setValues] = useState<PasswordValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const { mutate, error, isPending, isSuccess, reset } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setValues(EMPTY_VALUES);
    }
  });

  const handleChange = (key: keyof PasswordValues) => (value: string): void => {
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
      mutate({ currentPassword: values.currentPassword, password: values.password });
    }
  };

  return (
    <SettingsSection description="Use a password you don't use anywhere else." title="Password">
      <form noValidate className="flex max-w-sm flex-col gap-5" onSubmit={handleSubmit}>
        {error !== null && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error.message}</p>
        )}
        {isSuccess && (
          <output className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4" />
            Your password was changed.
          </output>
        )}

        <AuthFormField
          autoComplete="current-password"
          disabled={isPending}
          error={errors.currentPassword}
          label="Current password"
          type="password"
          value={values.currentPassword}
          onChange={handleChange('currentPassword')}
        />
        <AuthFormField
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH.toString()} characters.`}
          disabled={isPending}
          error={errors.password}
          label="New password"
          type="password"
          value={values.password}
          onChange={handleChange('password')}
        />
        <AuthFormField
          autoComplete="new-password"
          disabled={isPending}
          error={errors.confirmPassword}
          label="Confirm new password"
          type="password"
          value={values.confirmPassword}
          onChange={handleChange('confirmPassword')}
        />

        <Button className="self-start" disabled={isPending} type="submit">
          <KeyRound data-icon="inline-start" />
          {isPending ? 'Changing password…' : 'Change password'}
        </Button>
      </form>
    </SettingsSection>
  );
};
