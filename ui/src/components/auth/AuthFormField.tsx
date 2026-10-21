import { Input } from '@components/ui/third-party/shadcn/input';
import { Label } from '@components/ui/third-party/shadcn/label';
import type { Optional } from '@core/utils/types';
import { useId } from 'react';
import type { FC, HTMLInputAutoCompleteAttribute } from 'react';

export interface AuthFormFieldProps {
  autoComplete: HTMLInputAutoCompleteAttribute;
  description?: string;
  disabled: boolean;
  error: Optional<string>;
  label: string;
  onChange: (value: string) => void;
  type?: 'password' | 'text';
  value: string;
}

export const AuthFormField: FC<AuthFormFieldProps> = ({ autoComplete, description, disabled, error, label, onChange, type = 'text', value }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const hint = error ?? description;
  const isInvalid = error !== undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={hint === undefined ? undefined : hintId}
        aria-invalid={isInvalid}
        autoCapitalize="none"
        autoComplete={autoComplete}
        className="h-9"
        disabled={disabled}
        id={id}
        spellCheck={false}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {hint !== undefined && (
        <p className={isInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'} id={hintId}>{hint}</p>
      )}
    </div>
  );
};
