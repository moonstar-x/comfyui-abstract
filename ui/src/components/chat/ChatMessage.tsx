import { ChatReasoning } from '@components/chat/ChatReasoning';
import { Bubble, BubbleContent } from '@components/ui/third-party/shadcn/bubble';
import { Button } from '@components/ui/third-party/shadcn/button';
import { Message, MessageContent, MessageFooter } from '@components/ui/third-party/shadcn/message';
import type { Nullable } from '@core/utils/types';
import { Check, Copy, Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { FC } from 'react';
import Markdown from 'react-markdown';

// There is no typography plugin, so the rendered markdown is styled through its descendants.
const MARKDOWN_CLASSES = [
  'flex min-w-0 flex-col gap-3 text-sm leading-relaxed text-foreground',
  '[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold',
  '[&_strong]:font-semibold',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1',
  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:border-border'
].join(' ');

const COPIED_RESET_MS = 1500;

const CopyButton: FC<{ text: string }> = ({ text }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, COPIED_RESET_MS);
    } catch {
      // The clipboard is unavailable outside of secure contexts, there is nothing else to do.
    }
  };

  return (
    <Button aria-label={isCopied ? 'Copied' : 'Copy reply'} size="icon-xs" type="button" variant="ghost" onClick={() => { void handleCopy(); }}>
      {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </Button>
  );
};

export const UserMessage: FC<{ content: string }> = ({ content }) => (
  <Message align="end">
    <MessageContent>
      <Bubble align="end" variant="muted">
        <BubbleContent className="whitespace-pre-wrap">{content}</BubbleContent>
      </Bubble>
    </MessageContent>
  </Message>
);

export interface AssistantMessageProps {
  content: string;
  // Set when the reply failed, which replaces the content.
  error?: Nullable<string> | undefined;
  isStreaming?: boolean | undefined;
  // Puts a failed message back in the field, for errors that retrying won't fix such as a message that is too long.
  onEdit?: (() => void) | undefined;
  onRetry?: (() => void) | undefined;
  reasoning: Nullable<string>;
  reasoningMs?: Nullable<number> | undefined;
}

/**
 * A reply of the model. While it streams, the reasoning shows as thinking until the first words of the reply arrive.
 */
export const AssistantMessage: FC<AssistantMessageProps> = ({ content, error, isStreaming = false, onEdit, onRetry, reasoning, reasoningMs }) => {
  const isThinking = isStreaming && content === '';
  const hasReasoning = reasoning !== null && reasoning !== '';

  return (
    <Message>
      <MessageContent className="gap-2">
        {(hasReasoning || isThinking) && <ChatReasoning durationMs={reasoningMs} isThinking={isThinking} text={reasoning ?? ''} />}
        {content !== '' && (
          <div className={MARKDOWN_CLASSES}>
            <Markdown>{content}</Markdown>
          </div>
        )}
        {error !== null && error !== undefined && (
          <Bubble variant="destructive">
            <BubbleContent role="alert">{error}</BubbleContent>
          </Bubble>
        )}
        {!isStreaming && (
          <MessageFooter className="gap-1 px-0">
            {content !== '' && <CopyButton text={content} />}
            {onEdit !== undefined && (
              <Button size="xs" type="button" variant="ghost" onClick={onEdit}>
                <Pencil aria-hidden="true" data-icon="inline-start" />
                Edit
              </Button>
            )}
            {onRetry !== undefined && (
              <Button size="xs" type="button" variant="ghost" onClick={onRetry}>
                <RotateCcw aria-hidden="true" data-icon="inline-start" />
                Retry
              </Button>
            )}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
};
