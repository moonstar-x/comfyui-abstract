import { Button } from '@components/ui/third-party/shadcn/button';
import type { Optional } from '@core/utils/types';
import type { ImageListWorkflowField } from '@core/workflows/definitions';
import { makeImageFormEntry } from '@core/workflows/params';
import type { ImageFormEntry } from '@core/workflows/params';
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from 'cn';
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

interface SortableImageProps {
  disabled: boolean;
  entry: ImageFormEntry;
  onOpen: () => void;
  onRemove: () => void;
}

const SortableImage: FC<SortableImageProps> = ({ entry, disabled, onOpen, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id, disabled });
  const { onKeyDown, ...pointerListeners } = listeners ?? {};

  return (
    // The item is made interactive by the sortable attributes, which give it a role and tab index.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...pointerListeners}
      onKeyDown={(event) => {
        // Keys pressed on the inner buttons should click them, not pick up the image.
        if (event.target === event.currentTarget) {
          onKeyDown?.(event);
        }
      }}
      className={cn(
        'group relative aspect-square touch-manipulation overflow-hidden rounded-md border bg-muted select-none [-webkit-touch-callout:none]',
        isDragging && 'z-10 opacity-75 shadow-lg ring-2 ring-primary'
      )}
    >
      <button className="size-full cursor-zoom-in" type="button" onClick={onOpen}>
        <img alt={entry.name} className="size-full object-cover" draggable={false} src={entry.url} />
      </button>
      <Button
        aria-label={`Remove ${entry.name}`}
        className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm"
        disabled={disabled}
        size="icon-xs"
        type="button"
        variant="ghost"
        onClick={onRemove}
      >
        <X />
      </Button>
    </li>
  );
};

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
  const sensors = useSensors(
    // A small distance keeps clicks on the image opening the preview.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A press-and-hold keeps swiping over the images scrolling the page on touch screens.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (over === null || active.id === over.id) {
      return;
    }

    const from = value.findIndex((entry) => entry.id === active.id);
    const to = value.findIndex((entry) => entry.id === over.id);
    onChange(field.key, arrayMove([...value], from, to));
  };

  return (
    <fieldset aria-describedby={hintId} className="col-span-full flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium select-none">
        {field.label}
        {field.required === true && <span aria-hidden="true" className="text-destructive">*</span>}
      </legend>

      <ul className={isInvalid ? 'grid grid-cols-3 gap-2 rounded-lg border border-dashed border-destructive p-2 @sm:grid-cols-5' : 'grid grid-cols-3 gap-2 rounded-lg border border-dashed p-2 @sm:grid-cols-5'}>
        <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((entry) => entry.id)} strategy={rectSortingStrategy}>
            {value.map((entry, index) => (
              <SortableImage
                disabled={disabled}
                entry={entry}
                key={entry.id}
                onOpen={() => {
                  onOpen(value.map((item) => item.url), index);
                }}
                onRemove={() => {
                  handleRemove(index);
                }}
              />
            ))}
          </SortableContext>
        </DndContext>

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
