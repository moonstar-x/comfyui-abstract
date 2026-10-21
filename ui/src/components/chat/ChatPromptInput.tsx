import { ChatContextIndicator } from '@components/chat/ChatContextIndicator';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@components/ui/third-party/shadcn/input-group';
import type { Nullable } from '@core/utils/types';
import type { ContextUsage } from '@services/api/conversations';
import { ArrowUp, Square } from 'lucide-react';
import { useRef } from 'react';
import type { FC, KeyboardEvent, RefObject, SubmitEvent } from 'react';

export interface ChatPromptInputProps {
  isStreaming: boolean;
  onChange: (text: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
  textareaRef?: RefObject<Nullable<HTMLTextAreaElement>> | undefined;
  // Hidden until known, which a new chat isn't.
  usage: Nullable<ContextUsage>;
  value: string;
}

/**
 * The message field of the chat, following the Prompt Input pattern of AI Elements. Enter sends the message and Shift+Enter adds a new line.
 * While a reply streams, the send button stops it instead.
 */
export const ChatPromptInput: FC<ChatPromptInputProps> = ({ isStreaming, onChange, onSend, onStop, textareaRef, usage, value: text }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const canSend = !isStreaming && text.trim() !== '';

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isStreaming) {
      onStop();
      return;
    }

    if (canSend) {
      onSend(text.trim());
      onChange('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    // Composing text, such as with an IME, also uses Enter.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (canSend) {
      formRef.current?.requestSubmit();
    }
  };

  return (
    <form className="shrink-0 p-3 pt-0" ref={formRef} onSubmit={handleSubmit}>
      <InputGroup className="bg-background">
        <InputGroupTextarea
          aria-label="Message"
          className="max-h-48 min-h-12 p-3"
          placeholder="Ask anything…"
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        <InputGroupAddon align="block-end">
          {usage !== null && <ChatContextIndicator usage={usage} />}
          <InputGroupButton
            aria-label={isStreaming ? 'Stop reply' : 'Send'}
            className="ml-auto rounded-full"
            disabled={!isStreaming && !canSend}
            size="icon-sm"
            type="submit"
            variant="default"
          >
            {isStreaming ? <Square aria-hidden="true" className="fill-current" /> : <ArrowUp aria-hidden="true" />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
