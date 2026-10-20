import { useStickToBottom } from '@components/chat/hooks/useStickToBottom';
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle
} from '@components/ui/third-party/shadcn/trace';
import type { Nullable } from '@core/utils/types';
import { Brain, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';

const formatThoughtDuration = (ms: number): string => {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds.toString()}s` : `${Math.floor(seconds / 60).toString()}m ${(seconds % 60).toString()}s`;
};

export interface ChatReasoningProps {
  // How long the model thought, when this session saw it happen.
  durationMs?: Nullable<number> | undefined;
  isThinking: boolean;
  text: string;
}

/**
 * What a reasoning model thought before replying, following the Reasoning pattern of AI Elements. Opens while the model is thinking
 * and closes once it starts replying, unless the user toggled it.
 */
export const ChatReasoning: FC<ChatReasoningProps> = ({ durationMs, isThinking, text }) => {
  const [open, setOpen] = useState<boolean>();
  // Follows the newest lines while the model thinks, unless the user scrolled up to read.
  const { onScroll, ref: scrollRef } = useStickToBottom(text);

  const line = (
    <TraceLine {...isThinking && { status: 'running' }}>
      <TraceIcon>
        {isThinking ? <LoaderCircle className="animate-spin" /> : <Brain />}
      </TraceIcon>
      <TraceTitle>{isThinking ? 'Thinking' : 'Thought'}</TraceTitle>
      {!isThinking && durationMs !== null && durationMs !== undefined && (
        <TraceDescription>
          for
          {' '}
          {formatThoughtDuration(durationMs)}
        </TraceDescription>
      )}
    </TraceLine>
  );

  return (
    <Trace>
      {text === ''
        ? line
        : (
            <TraceCollapsible open={open ?? isThinking} onOpenChange={setOpen}>
              <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
              <TraceCollapsibleContent className="text-xs whitespace-pre-wrap">
                <div className="max-h-80 overflow-y-auto overscroll-contain" ref={scrollRef} onScroll={onScroll}>
                  {text}
                </div>
              </TraceCollapsibleContent>
            </TraceCollapsible>
          )}
    </Trace>
  );
};
