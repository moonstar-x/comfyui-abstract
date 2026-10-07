import { Input } from '@components/ui/third-party/shadcn/input';
import { Label } from '@components/ui/third-party/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/third-party/shadcn/select';
import { Textarea } from '@components/ui/third-party/shadcn/textarea';
import type { Optional } from '@core/utils/types';
import type { WorkflowField } from '@core/workflows/definitions';
import { useId } from 'react';
import type { FC, ReactNode } from 'react';

export interface WorkflowFieldInputProps {
  disabled: boolean;
  error: Optional<string>;
  field: WorkflowField;
  onChange: (key: string, value: string) => void;
  value: string;
}

export const WorkflowFieldInput: FC<WorkflowFieldInputProps> = ({ field, value, error, disabled, onChange }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const hint = error ?? field.description;
  const isInvalid = error !== undefined;
  const describedBy = hint === undefined ? undefined : hintId;

  const handleChange = (next: string): void => {
    onChange(field.key, next);
  };

  let control: ReactNode;
  switch (field.kind) {
    case 'number':
      control = (
        <Input
          aria-describedby={describedBy}
          aria-invalid={isInvalid}
          disabled={disabled}
          id={id}
          inputMode={field.integer === true ? 'numeric' : 'decimal'}
          min={field.min}
          placeholder={field.placeholder}
          step={field.step ?? (field.integer === true ? 1 : 'any')}
          type="number"
          value={value}
          onChange={(event) => {
            handleChange(event.target.value);
          }}
        />
      );
      break;
    case 'select':
      control = (
        <Select<string>
          disabled={disabled}
          value={value}
          onValueChange={(next) => {
            handleChange(next ?? '');
          }}
        >
          <SelectTrigger aria-describedby={describedBy} aria-invalid={isInvalid} className="w-full" id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case 'text':
      control = field.multiline === true
        ? (
            <Textarea
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              aria-required={field.required}
              className="max-h-80 min-h-24"
              disabled={disabled}
              id={id}
              placeholder={field.placeholder}
              value={value}
              onChange={(event) => {
                handleChange(event.target.value);
              }}
            />
          )
        : (
            <Input
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              aria-required={field.required}
              disabled={disabled}
              id={id}
              placeholder={field.placeholder}
              value={value}
              onChange={(event) => {
                handleChange(event.target.value);
              }}
            />
          );
      break;
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required === true && <span aria-hidden="true" className="text-destructive">*</span>}
      </Label>
      {control}
      {hint !== undefined && (
        <p className={isInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'} id={hintId}>{hint}</p>
      )}
    </div>
  );
};
