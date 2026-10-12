import { Input } from '@components/ui/third-party/shadcn/input';
import { Label } from '@components/ui/third-party/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/third-party/shadcn/select';
import { Switch } from '@components/ui/third-party/shadcn/switch';
import { Textarea } from '@components/ui/third-party/shadcn/textarea';
import { WorkflowImageListInput } from '@components/workflow/WorkflowImageListInput';
import { WorkflowLoraListInput } from '@components/workflow/WorkflowLoraListInput';
import type { Optional } from '@core/utils/types';
import type { WorkflowField } from '@core/workflows/definitions';
import { getImageFormEntries, getLoraFormEntries } from '@core/workflows/params';
import type { WorkflowFormValue } from '@core/workflows/params';
import { useId } from 'react';
import type { FC, ReactNode } from 'react';

export interface WorkflowFieldInputProps {
  disabled: boolean;
  error: Optional<string>;
  field: WorkflowField;
  onChange: (key: string, value: WorkflowFormValue) => void;
  onOpenImages: (images: readonly string[], index: number) => void;
  value: WorkflowFormValue;
}

export const WorkflowFieldInput: FC<WorkflowFieldInputProps> = ({ field, value: rawValue, error, disabled, onChange, onOpenImages }) => {
  const id = useId();
  const value = typeof rawValue === 'string' ? rawValue : '';
  const hintId = `${id}-hint`;
  const hint = error ?? field.description;
  const isInvalid = error !== undefined;
  const describedBy = hint === undefined ? undefined : hintId;

  const handleChange = (next: string): void => {
    onChange(field.key, next);
  };

  let control: ReactNode;
  switch (field.kind) {
    case 'boolean':
      // Matches the height of the other controls so the fields line up in the grid.
      control = (
        <div className="flex h-8 items-center">
          <Switch
            aria-describedby={describedBy}
            aria-invalid={isInvalid}
            checked={rawValue === true}
            disabled={disabled}
            id={id}
            onCheckedChange={(checked) => {
              onChange(field.key, checked);
            }}
          />
        </div>
      );
      break;
    // A list of inputs has no single control to label, so it renders its own grouped layout.
    case 'image-list':
      return <WorkflowImageListInput disabled={disabled} error={error} field={field} value={getImageFormEntries(rawValue)} onChange={onChange} onOpen={onOpenImages} />;
    case 'lora-list':
      return <WorkflowLoraListInput disabled={disabled} error={error} field={field} value={getLoraFormEntries(rawValue)} onChange={onChange} />;
    case 'number':
      control = (
        <Input
          aria-describedby={describedBy}
          aria-invalid={isInvalid}
          disabled={disabled}
          id={id}
          inputMode={field.integer === true ? 'numeric' : 'decimal'}
          max={field.max}
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

  const isFullWidth = field.kind === 'text' && field.multiline === true;

  return (
    <div className={isFullWidth ? 'col-span-full flex min-w-0 flex-col gap-2' : 'flex min-w-0 flex-col gap-2'}>
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
