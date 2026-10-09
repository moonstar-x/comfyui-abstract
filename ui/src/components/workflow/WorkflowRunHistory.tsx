import type { Generation } from '@components/generation/GenerationSessionContext';
import type { FC } from 'react';

export interface WorkflowRunHistoryProps {
  generations: Generation[];
  onOpen: (url: string) => void;
}

export const WorkflowRunHistory: FC<WorkflowRunHistoryProps> = ({ generations, onOpen }) => {
  const images = generations.flatMap((generation) => generation.images);
  if (images.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold">Previous generations</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((url) => (
          <button className="aspect-square cursor-zoom-in overflow-hidden rounded-md border bg-muted/40" key={url} type="button" onClick={() => { onOpen(url); }}>
            <img alt="Previous workflow output" className="size-full object-cover" loading="lazy" src={url} />
          </button>
        ))}
      </div>
    </section>
  );
};
