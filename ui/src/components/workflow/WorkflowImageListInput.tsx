import { GenerationOutputPickerDialog } from '@components/history/GenerationOutputPickerDialog';
import type { GenerationOutput } from '@components/history/GenerationOutputPickerDialog';
import { Button } from '@components/ui/third-party/shadcn/button';
import { useFetchUploadFile } from '@components/uploads/hooks/useUploads';
import { UploadPickerDialog } from '@components/uploads/UploadPickerDialog';
import { WorkflowFileSourceMenu } from '@components/workflow/WorkflowFileSourceMenu';
import { formatMegabytes, readAsDataUrl } from '@core/utils/files';
import type { Nullable, Optional } from '@core/utils/types';
import type { ImageListWorkflowField } from '@core/workflows/definitions';
import { makeGenerationImageFormEntry, makeImageFormEntry, makeUploadImageFormEntry } from '@core/workflows/params';
import type { ImageFormEntry } from '@core/workflows/params';
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { storeGenerationOutputInput } from '@services/api/generations';
import type { UploadRecord } from '@services/api/uploads';
import { cn } from 'cn';
import { ImagePlus, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
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

export const WorkflowImageListInput: FC<WorkflowImageListInputProps> = ({ field, value, error, disabled, onChange, onOpen }) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Set when some of the selected files are rejected, the rest are still added.
  const [selectionError, setSelectionError] = useState<Nullable<string>>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isGenerationPickerOpen, setIsGenerationPickerOpen] = useState(false);
  const fetchUploadFile = useFetchUploadFile();
  const hintId = `${id}-hint`;
  const shownError = selectionError ?? error;
  const hint = shownError ?? field.description ?? `Up to ${field.maxImages.toString()} images, ${formatMegabytes(field.maxBytes)} each.`;
  const isInvalid = shownError !== undefined;
  const isFull = value.length >= field.maxImages;
  const sensors = useSensors(
    // A small distance keeps clicks on the image opening the preview.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // A press-and-hold keeps swiping over the images scrolling the page on touch screens.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Files beyond the limit are dropped, files that are too large are rejected, and anything that isn't an image is ignored.
  const handleFiles = async (files: Iterable<File>): Promise<void> => {
    const candidates = [...files].filter((file) => file.type.startsWith('image/'));
    const tooLarge = candidates.filter((file) => file.size > field.maxBytes);
    const images = candidates
      .filter((file) => file.size <= field.maxBytes)
      .slice(0, field.maxImages - value.length);

    setSelectionError(tooLarge.length > 0
      ? `${tooLarge.map((file) => file.name).join(', ')} ${tooLarge.length === 1 ? 'is' : 'are'} too large. Each image must be at most ${formatMegabytes(field.maxBytes)}.`
      : null);
    if (images.length === 0) {
      return;
    }

    const entries = await Promise.all(images.map(async (file) => makeImageFormEntry(file, await readAsDataUrl(file))));
    onChange(field.key, [...value, ...entries]);
  };

  // Read as data URLs like the files from the device, so the previews don't depend on the upload grid that loaded them.
  const handleUploads = async (uploads: readonly UploadRecord[]): Promise<void> => {
    setSelectionError(null);
    try {
      const entries = await Promise.all(uploads.slice(0, field.maxImages - value.length).map(async (upload) => {
        const blob = await fetchUploadFile(upload.id);
        return makeUploadImageFormEntry(upload, await readAsDataUrl(new File([blob], upload.id, { type: blob.type })));
      }));
      onChange(field.key, [...value, ...entries]);
    } catch {
      setSelectionError('Could not load the selected uploads.');
    }
  };

  // Generated images are served publicly, so the previews load the outputs themselves.
  const handleGenerationOutputs = async (outputs: readonly GenerationOutput[]): Promise<void> => {
    setSelectionError(null);
    try {
      const entries = await Promise.all(outputs.slice(0, field.maxImages - value.length).map(async ({ generation, index, url }) => {
        const reference = await storeGenerationOutputInput(generation.id, index);
        return makeGenerationImageFormEntry(generation, reference, url);
      }));
      onChange(field.key, [...value, ...entries]);
    } catch {
      setSelectionError('Could not load the selected generated images.');
    }
  };

  const handleRemove = (index: number): void => {
    setSelectionError(null);
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
            <WorkflowFileSourceMenu
              disabled={disabled}
              onBrowse={() => inputRef.current?.click()}
              onPickGeneration={() => { setIsGenerationPickerOpen(true); }}
              onPickUpload={() => { setIsPickerOpen(true); }}
              trigger={(
                // Labelled by the children of the menu trigger, which replace its own.
                // eslint-disable-next-line jsx-a11y/control-has-associated-label
                <button
                  className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-accent data-popup-open:text-accent-foreground"
                  type="button"
                />
              )}
            >
              <ImagePlus className="size-5" />
              {value.length === 0 ? 'Add images' : 'Add more'}
            </WorkflowFileSourceMenu>
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

      <UploadPickerDialog
        emptyMessage="You have not uploaded any images yet"
        maxSelected={Math.max(field.maxImages - value.length, 1)}
        mediaType="image"
        open={isPickerOpen}
        title={`Pick ${field.label.toLowerCase()} from your uploads`}
        onClose={() => { setIsPickerOpen(false); }}
        onSelect={(uploads) => { void handleUploads(uploads); }}
      />

      <GenerationOutputPickerDialog
        emptyMessage="You have not generated any images yet"
        maxSelected={Math.max(field.maxImages - value.length, 1)}
        mediaType="image"
        open={isGenerationPickerOpen}
        title={`Pick ${field.label.toLowerCase()} from your generations`}
        onClose={() => { setIsGenerationPickerOpen(false); }}
        onSelect={(outputs) => { void handleGenerationOutputs(outputs); }}
      />

      <p className={isInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'} id={hintId}>{hint}</p>
    </fieldset>
  );
};
