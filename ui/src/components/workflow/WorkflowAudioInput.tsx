import { AudioPlayer } from '@components/audio/AudioPlayer';
import { Button } from '@components/ui/third-party/shadcn/button';
import { formatMegabytes, readAsDataUrl } from '@core/utils/files';
import type { Nullable, Optional } from '@core/utils/types';
import type { AudioWorkflowField } from '@core/workflows/definitions';
import { makeAudioFormEntry } from '@core/workflows/params';
import type { AudioFormEntry } from '@core/workflows/params';
import { cn } from 'cn';
import { FileAudio, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { FC } from 'react';

export interface WorkflowAudioInputProps {
  disabled: boolean;
  error: Optional<string>;
  field: AudioWorkflowField;
  onChange: (key: string, value: Nullable<AudioFormEntry>) => void;
  value: Nullable<AudioFormEntry>;
}

export const WorkflowAudioInput: FC<WorkflowAudioInputProps> = ({ field, value, error, disabled, onChange }) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Set when the selected file is rejected, which keeps the previous value.
  const [selectionError, setSelectionError] = useState<Nullable<string>>(null);
  const hintId = `${id}-hint`;
  const shownError = selectionError ?? error;
  const hint = shownError ?? field.description ?? `Up to ${formatMegabytes(field.maxBytes)}.`;
  const isInvalid = shownError !== undefined;

  // Anything that isn't an audio file is ignored.
  const handleFile = async (file: Optional<File>): Promise<void> => {
    if (file === undefined || !file.type.startsWith('audio/')) {
      return;
    }

    if (file.size > field.maxBytes) {
      setSelectionError(`${file.name} is too large. ${field.label} must be at most ${formatMegabytes(field.maxBytes)}.`);
      return;
    }

    setSelectionError(null);
    onChange(field.key, makeAudioFormEntry(file, await readAsDataUrl(file)));
  };

  return (
    <fieldset aria-describedby={hintId} className="col-span-full flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium select-none">
        {field.label}
        {field.required === true && <span aria-hidden="true" className="text-destructive">*</span>}
      </legend>

      <div className={cn('rounded-lg border border-dashed p-2', isInvalid && 'border-destructive')}>
        {value === null
          ? (
              <button
                className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                disabled={disabled}
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                <FileAudio className="size-5" />
                Add audio
              </button>
            )
          : (
              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center gap-2">
                  <FileAudio aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm" title={value.name}>{value.name}</span>
                  <Button
                    aria-label={`Replace ${value.name}`}
                    disabled={disabled}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload />
                  </Button>
                  <Button
                    aria-label={`Remove ${value.name}`}
                    disabled={disabled}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setSelectionError(null);
                      onChange(field.key, null);
                    }}
                  >
                    <X />
                  </Button>
                </div>
                {/* Keyed by the entry so a replaced file starts a fresh player. */}
                <AudioPlayer key={value.id} label={value.name} src={value.url} variant="compact" />
              </div>
            )}
      </div>

      <input
        accept="audio/*"
        className="hidden"
        disabled={disabled}
        ref={inputRef}
        type="file"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);

          // Allows selecting the same file again after removing it.
          if (inputRef.current !== null) {
            inputRef.current.value = '';
          }
        }}
      />

      <p className={isInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'} id={hintId}>{hint}</p>
    </fieldset>
  );
};
