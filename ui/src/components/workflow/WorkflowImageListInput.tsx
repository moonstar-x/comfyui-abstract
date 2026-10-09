import { Button } from '@components/ui/third-party/shadcn/button';
import type { Optional } from '@core/utils/types';
import type { ImageListWorkflowField } from '@core/workflows/definitions';
import { makeImageFormEntry } from '@core/workflows/params';
import type { ImageFormEntry } from '@core/workflows/params';
import { ImagePlus, X } from 'lucide-react';
import { useId, useRef } from 'react';
import type { FC } from 'react';

export interface WorkflowImageListInputProps {
  disabled: boolean;
  error: Optional<string>;
  field: ImageListWorkflowField;
  onChange: (key: string, value: ImageFormEntry[]) => void;
  onOpen: (images: readonly string[], index: number) => void;
  value: readonly ImageFormEntry[];
}

const readAsDataUrl = async (file: File): Promise<string> => await new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') {
      resolve(reader.result);
    } else {
      reject(new Error(`Could not read ${file.name}.`));
    }
  });
  reader.addEventListener('error', () => {
    reject(reader.error ?? new Error(`Could not read ${file.name}.`));
  });
  reader.readAsDataURL(file);
});

export const WorkflowImageListInput: FC<WorkflowImageListInputProps> = ({ field, value, error, disabled, onChange, onOpen }) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = `${id}-hint`;
  const hint = error ?? field.description ?? `Up to ${field.maxImages.toString()} images.`;
  const isInvalid = error !== undefined;
  const isFull = value.length >= field.maxImages;

  // Files beyond the limit are dropped, and anything that isn't an image is ignored.
  const handleFiles = async (files: Iterable<File>): Promise<void> => {
    const images = [...files]
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, field.maxImages - value.length);
    if (images.length === 0) {
      return;
    }

    const entries = await Promise.all(images.map(async (file) => makeImageFormEntry(file.name, await readAsDataUrl(file))));
    onChange(field.key, [...value, ...entries]);
  };

  const handleRemove = (index: number): void => {
    onChange(field.key, value.filter((_entry, entryIndex) => entryIndex !== index));
  };

  return (
    <fieldset aria-describedby={hintId} className="col-span-full flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium select-none">
        {field.label}
        {field.required === true && <span aria-hidden="true" className="text-destructive">*</span>}
      </legend>

      <ul className={isInvalid ? 'grid grid-cols-3 gap-2 rounded-lg border border-dashed border-destructive p-2 @sm:grid-cols-5' : 'grid grid-cols-3 gap-2 rounded-lg border border-dashed p-2 @sm:grid-cols-5'}>
        {value.map((entry, index) => (
          <li className="group relative aspect-square overflow-hidden rounded-md border bg-muted" key={entry.id}>
            <button className="size-full cursor-zoom-in" type="button" onClick={() => { onOpen(value.map((item) => item.url), index); }}>
              <img alt={entry.name} className="size-full object-cover" src={entry.url} />
            </button>
            <Button
              aria-label={`Remove ${entry.name}`}
              className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm"
              disabled={disabled}
              size="icon-xs"
              type="button"
              variant="ghost"
              onClick={() => {
                handleRemove(index);
              }}
            >
              <X />
            </Button>
          </li>
        ))}

        {!isFull && (
          <li className="aspect-square">
            <button
              className="flex size-full flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              disabled={disabled}
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-5" />
              {value.length === 0 ? 'Add images' : 'Add more'}
            </button>
          </li>
        )}
      </ul>

      <input
        multiple
        accept="image/*"
        className="hidden"
        disabled={disabled || isFull}
        ref={inputRef}
        type="file"
        onChange={(event) => {
          const { files } = event.target;
          if (files !== null) {
            void handleFiles(files);
          }

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
