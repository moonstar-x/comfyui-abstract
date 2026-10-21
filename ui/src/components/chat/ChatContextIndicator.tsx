import { HoverCard, HoverCardContent, HoverCardTrigger } from '@components/ui/third-party/shadcn/hover-card';
import { Progress } from '@components/ui/third-party/shadcn/progress';
import type { ContextUsage } from '@services/api/conversations';
import { cn } from 'cn';
import type { FC } from 'react';

// A circle with a circumference of 100, so the dash of the ring is the percentage itself.
const RING_RADIUS = 15.9155;

const formatTokens = (tokens: number): string => tokens >= 1000 ? `${(tokens / 1000).toFixed(1).replace(/\.0$/u, '')}k` : tokens.toString();

export interface ChatContextIndicatorProps {
  usage: ContextUsage;
}

/**
 * How full the context of the model is, as a tiny ring with the percentage inside, following the Context pattern of AI Elements.
 * The details show on hover. It turns amber once the oldest messages no longer fit.
 */
export const ChatContextIndicator: FC<ChatContextIndicatorProps> = ({ usage }) => {
  const { contextLength, percentage, trimmedMessageCount, usedTokens } = usage;
  const isTrimmed = trimmedMessageCount > 0;

  return (
    <HoverCard>
      <HoverCardTrigger
        closeDelay={100}
        delay={10}
        render={<button aria-label={`${percentage.toString()}% of the context used`} className="relative flex size-8 shrink-0 cursor-default items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" type="button" />}
      >
        <svg aria-hidden="true" className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36">
          <circle className="stroke-muted" cx="18" cy="18" fill="none" r={RING_RADIUS} strokeWidth="3" />
          <circle
            className={cn('transition-[stroke-dasharray] duration-500', isTrimmed ? 'stroke-amber-500' : 'stroke-primary')}
            cx="18"
            cy="18"
            fill="none"
            r={RING_RADIUS}
            strokeDasharray={`${percentage.toString()} 100`}
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <span className="text-[0.5rem] font-semibold tracking-tight text-muted-foreground tabular-nums">
          {percentage}
          %
        </span>
      </HoverCardTrigger>
      {/* Starts at the ring, which sits at the left edge of the chat, so the card stays over the chat instead of the page. */}
      <HoverCardContent align="start" alignOffset={0} className="flex w-64 flex-col gap-3" side="top" sideOffset={8}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Context</span>
          <span className="text-muted-foreground tabular-nums">
            {formatTokens(usedTokens)}
            {' / '}
            {formatTokens(contextLength)}
            {' tokens'}
          </span>
        </div>
        <Progress aria-label="Context used" value={percentage} />
        {isTrimmed && (
          <p className="text-xs text-muted-foreground">
            {trimmedMessageCount === 1
              ? 'The oldest message no longer fits, so the model no longer sees it.'
              : `The oldest ${trimmedMessageCount.toString()} messages no longer fit, so the model no longer sees them.`}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};
