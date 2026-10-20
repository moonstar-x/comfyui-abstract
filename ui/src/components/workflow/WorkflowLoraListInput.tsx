import { Button } from '@components/ui/third-party/shadcn/button';
import { Input } from '@components/ui/third-party/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/third-party/shadcn/select';
import type { Optional } from '@core/utils/types';
import type { LoraListWorkflowField } from '@core/workflows/definitions';
import { DEFAULT_LORA_STRENGTH, makeLoraFormEntry } from '@core/workflows/params';
import type { LoraFormEntry } from '@core/workflows/params';
import { Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import type { FC } from 'react';

export interface WorkflowLoraListInputProps {
  disabled: boolean;
  error: Optional<string>;
  field: LoraListWorkflowField;
  onChange: (key: string, value: LoraFormEntry[]) => void;
  value: readonly LoraFormEntry[];
}

export const WorkflowLoraListInput: FC<WorkflowLoraListInputProps> = ({ field, value, error, disabled, onChange }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const hint = error ?? field.description;
  const isInvalid = error !== undefined;
  const describedBy = hint === undefined ? undefined : hintId;

  const handleEntryChange = (index: number, patch: Partial<LoraFormEntry>): void => {
    onChange(field.key, value.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  };

  const handleAdd = (): void => {
    onChange(field.key, [...value, makeLoraFormEntry()]);
  };

  const handleRemove = (index: number): void => {
    onChange(field.key, value.filter((_entry, entryIndex) => entryIndex !== index));
  };

  return (
    <fieldset aria-describedby={describedBy} className="col-span-full flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium select-none">
        {field.label}
        {field.required === true && <span aria-hidden="true" className="text-destructive">*</span>}
      </legend>

      {value.length === 0
        ? <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">No LoRAs added.</p>
        : (
            <ul className="flex flex-col gap-2">
              {value.map((entry, index) => {
                const position = (index + 1).toString();

                return (
                  <li className="flex items-center gap-2" key={entry.id}>
                    <Select<string>
                      disabled={disabled}
                      value={entry.lora === '' ? null : entry.lora}
                      onValueChange={(next) => {
                        handleEntryChange(index, { lora: next ?? '' });
                      }}
                    >
                      <SelectTrigger aria-invalid={isInvalid} aria-label={`LoRA ${position} name`} className="w-full min-w-0 flex-1">
                        <SelectValue placeholder="Select a LoRA" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-invalid={isInvalid}
                      aria-label={`LoRA ${position} strength`}
                      className="w-18 shrink-0 px-2 tabular-nums"
                      disabled={disabled}
                      inputMode="decimal"
                      max={field.maxStrength}
                      min={field.minStrength}
                      placeholder={DEFAULT_LORA_STRENGTH.toString()}
                      step={0.05}
                      type="number"
                      value={entry.strength}
                      onChange={(event) => {
                        handleEntryChange(index, { strength: event.target.value });
                      }}
                    />
                    <Button
                      aria-label={`Remove LoRA ${position}`}
                      className="cursor-pointer"
                      disabled={disabled}
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        handleRemove(index);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

      <Button className="w-full cursor-pointer md:w-auto md:self-start" disabled={disabled} size="sm" type="button" variant="outline" onClick={handleAdd}>
        <Plus data-icon="inline-start" />
        Add LoRA
      </Button>

      {hint !== undefined && (
        <p className={isInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'} id={hintId}>{hint}</p>
      )}
    </fieldset>
  );
};
