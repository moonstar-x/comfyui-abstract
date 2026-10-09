import { Download } from 'lucide-react';
import type { FC } from 'react';

export interface WorkflowRunResultProps {
  images: string[];
}

export const WorkflowRunResult: FC<WorkflowRunResultProps> = ({ images }) => {
  if (images.length === 0) {
    return (
      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        The workflow finished without producing any images.
      </p>
    );
  }

  return (
    <div className={images.length > 1 ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
      {images.map((url, index) => (
        <figure className="flex flex-col gap-2" key={url}>
          <a className="overflow-hidden rounded-lg border bg-muted/40" href={url} rel="noreferrer" target="_blank">
            <img alt={`Workflow output ${(index + 1).toString()}`} className="h-auto w-full" src={url} />
          </a>
          <figcaption>
            <a download className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" href={url}>
              <Download aria-hidden="true" className="size-4" />
              Download
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
};
