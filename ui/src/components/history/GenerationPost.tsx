import { AudioOutputs, DeleteGenerationButton, DurationLabel, WorkflowBadge } from '@components/history/GenerationParts';
import { findWorkflowNavItem } from '@components/ui/app/navigation';
import { Badge } from '@components/ui/third-party/shadcn/badge';
import { Button } from '@components/ui/third-party/shadcn/button';
import { UserAvatar } from '@components/users/UserAvatar';
import { formatDateTime, formatLora, formatParamLabel, formatParamValue, formatRelativeTime, isWorkflowLoraList, splitGenerationParams } from '@core/generations/generations';
import type { GenerationPrompt, GenerationRecord } from '@core/generations/generations';
import { DynamicRouteDefs } from '@core/router/routes';
import { downloadFile } from '@core/utils/files';
import { toOutputUrl } from '@core/workflows/outputs';
import { makeWorkflowPrefillState } from '@core/workflows/params';
import { cn } from 'cn';
import { ArrowUpRight, Download } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';

// Images past this many are folded into a "+N" tile, like a social media post.
const MAX_VISIBLE_IMAGES = 4;

const CAPTION_CLAMP_LENGTH = 280;
const CAPTION_CLAMP_LINES = 4;

const PromptText: FC<{ text: string }> = ({ text }) => {
  const isLong = text.length > CAPTION_CLAMP_LENGTH || text.split('\n').length > CAPTION_CLAMP_LINES;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col items-start gap-0.5">
      <p className={cn('text-sm/6 break-words whitespace-pre-wrap', isLong && !isExpanded && 'line-clamp-4')}>{text}</p>
      {isLong && (
        <button className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline" type="button" onClick={() => { setIsExpanded((value) => !value); }}>
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

/**
 * The prompts describe the post, the main one first and plainly, any others under their own label.
 */
const PostDescription: FC<{ prompts: GenerationPrompt[] }> = ({ prompts }) => (
  <div className="flex flex-col gap-2">
    {prompts.map((prompt, index) => (
      <div className="flex flex-col gap-0.5" key={prompt.key}>
        {index > 0 && <span className="text-xs font-medium text-muted-foreground">{formatParamLabel(prompt.key)}</span>}
        <PromptText text={prompt.text} />
      </div>
    ))}
  </div>
);

interface ParamBadge {
  key: string;
  label: string;
  text: string;
}

// LoRA lists get a badge per LoRA, in the order they were applied, so their names aren't buried in serialized JSON.
const toParamBadges = ([key, value]: [string, unknown]): ParamBadge[] => {
  if (isWorkflowLoraList(value)) {
    return value.map((lora, index) => ({ key: `${key}-${index.toString()}`, label: 'LoRA', text: formatLora(lora) }));
  }

  return [{ key, label: formatParamLabel(key), text: formatParamValue(value) }];
};

const ParamBadges: FC<{ settings: Array<[string, unknown]> }> = ({ settings }) => {
  // The sort is stable, so the LoRAs keep their order.
  const badges = settings
    .flatMap((setting) => toParamBadges(setting))
    .toSorted((a, b) => a.label.localeCompare(b.label));
  if (badges.length === 0) {
    return null;
  }

  return (
    <ul aria-label="Parameters" className="flex flex-wrap gap-1.5">
      {badges.map(({ key, label, text }) => (
        <li className="min-w-0 max-w-full" key={key}>
          <Badge className="max-w-full" title={`${label}: ${text}`} variant="secondary">
            <span className="text-muted-foreground">{label}</span>
            <span className="min-w-0 truncate">{text}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
};

interface ImageMosaicProps {
  onOpenImage: (images: string[], index: number) => void;
  urls: string[];
}

const ImageMosaic: FC<ImageMosaicProps> = ({ onOpenImage, urls }) => {
  const visible = urls.slice(0, MAX_VISIBLE_IMAGES);
  if (visible.length === 1) {
    return (
      <button className="cursor-zoom-in overflow-hidden rounded-lg border bg-muted/40" type="button" onClick={() => { onOpenImage(urls, 0); }}>
        <img alt="Output 1" className="mx-auto max-h-[36rem] w-auto object-contain" loading="lazy" src={urls[0]} />
      </button>
    );
  }

  const hiddenCount = urls.length - visible.length;

  return (
    <div className={cn('grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-lg border bg-border', visible.length === 2 ? 'aspect-[4/3]' : 'aspect-square')}>
      {visible.map((url, index) => {
        const isLastVisible = index === visible.length - 1;

        return (
          <button
            className={cn('relative min-h-0 cursor-zoom-in bg-muted/40', visible.length === 3 && index === 0 && 'row-span-2', visible.length === 2 && 'row-span-2')}
            key={url}
            type="button"
            onClick={() => { onOpenImage(urls, index); }}
          >
            <img alt={`Output ${(index + 1).toString()}`} className="size-full object-cover" loading="lazy" src={url} />
            {isLastVisible && hiddenCount > 0 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
                {`+${hiddenCount.toString()}`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface PostMediaProps {
  generation: GenerationRecord;
  onOpenImage: (images: string[], index: number) => void;
}

const PostMedia: FC<PostMediaProps> = ({ generation, onOpenImage }) => {
  const urls = generation.outputs.map((output) => toOutputUrl(output));
  if (urls.length === 0) {
    return <p className="text-sm text-muted-foreground">This generation did not produce any files.</p>;
  }

  if (generation.mediaType === 'audio') {
    return <AudioOutputs hasDownloadLinks={false} urls={urls} variant="full" />;
  }

  return <ImageMosaic urls={urls} onOpenImage={onOpenImage} />;
};

/**
 * Saves every output of the generation. A file that can't be fetched is opened in a new tab instead, so it can still be saved from there.
 */
const DownloadOutputsButton: FC<{ urls: string[] }> = ({ urls }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (): Promise<void> => {
    setIsDownloading(true);
    await Promise.all(urls.map(async (url) => {
      try {
        await downloadFile(url);
      } catch {
        window.open(url, '_blank', 'noopener');
      }
    }));
    setIsDownloading(false);
  };

  return (
    <Button
      aria-label={urls.length === 1 ? 'Download' : `Download ${urls.length.toString()} files`}
      className="cursor-pointer"
      disabled={isDownloading}
      size="icon-sm"
      title={urls.length === 1 ? 'Download' : `Download ${urls.length.toString()} files`}
      type="button"
      variant="outline"
      onClick={() => { void handleDownload(); }}
    >
      <Download aria-hidden="true" />
    </Button>
  );
};

/**
 * Opens the workflow that made the generation with the same model picked and the form filled with its params, as long as the workflow still exists.
 */
const OpenWorkflowButton: FC<{ generation: GenerationRecord }> = ({ generation }) => {
  const navItem = findWorkflowNavItem(generation.workflowType);
  if (navItem === null) {
    return null;
  }

  return (
    <Button
      nativeButton={false}
      render={<Link state={makeWorkflowPrefillState(generation.model, generation.params)} to={DynamicRouteDefs.workflowWithModel(generation.workflowType, generation.model)} />}
      size="sm"
      variant="outline"
    >
      {`Open in ${navItem.title}`}
      <ArrowUpRight aria-hidden="true" data-icon="inline-end" />
    </Button>
  );
};

export interface GenerationPostProps {
  /**
   * Always draws the post as a card. Otherwise it is only one on wider screens, and a plain row of the feed on phones.
   */
  framed?: boolean;
  generation: GenerationRecord;
  /**
   * Shows a button to delete the generation, called once it is deleted.
   */
  onDeleted?: () => void;
  onOpenImage: (images: string[], index: number) => void;
}

/**
 * A generation in the feed of everyone's generations, laid out like a social media post.
 */
export const GenerationPost: FC<GenerationPostProps> = ({ framed = false, generation, onDeleted, onOpenImage }) => {
  const profilePath = DynamicRouteDefs.historyByUser(generation.username);
  const { prompts, settings } = splitGenerationParams(generation.workflowType, generation.params);
  const outputUrls = generation.outputs.map((output) => toOutputUrl(output));

  return (
    <article className={cn('flex flex-col gap-3', framed ? 'rounded-xl border bg-card p-4 shadow-xl' : 'border-b px-1 py-4 sm:rounded-xl sm:border sm:bg-card sm:p-4')}>
      <header className="flex items-center gap-3">
        <Link className="shrink-0" to={profilePath}>
          <UserAvatar className="size-10" pictureUrl={null} username={generation.username} />
          <span className="sr-only">{`${generation.username}'s generations`}</span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <Link className="truncate font-semibold hover:underline" to={profilePath}>{`@${generation.username}`}</Link>
            <span aria-hidden="true" className="text-muted-foreground">·</span>
            <time className="shrink-0 text-muted-foreground" dateTime={generation.createdAt} title={formatDateTime(generation.createdAt)}>
              {formatRelativeTime(generation.createdAt)}
            </time>
          </div>
          <span className="truncate text-xs text-muted-foreground">{generation.model}</span>
        </div>
        {onDeleted !== undefined && <DeleteGenerationButton id={generation.id} onDeleted={onDeleted} />}
      </header>

      {prompts.length > 0 && <PostDescription prompts={prompts} />}
      <PostMedia generation={generation} onOpenImage={onOpenImage} />

      <footer className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <WorkflowBadge generation={generation} />
          <DurationLabel generation={generation} />
          <div className="ml-auto flex items-center gap-1.5">
            {outputUrls.length > 0 && <DownloadOutputsButton urls={outputUrls} />}
            <OpenWorkflowButton generation={generation} />
          </div>
        </div>
        {settings.length > 0 && <ParamBadges settings={settings} />}
      </footer>
    </article>
  );
};
