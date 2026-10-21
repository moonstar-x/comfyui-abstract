import type { WorkflowInstruction } from '@core/workflows/params';
import type { FC } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// There is no typography plugin, so the rendered markdown is styled through its descendants.
const MARKDOWN_CLASSES = [
  'flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground',
  '[&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground',
  '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground',
  '[&_h3]:font-semibold [&_h3]:text-foreground',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top',
  '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground',
  '[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item_input]:mr-2',
  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_hr]:border-border'
].join(' ');

// Tables, strikethrough and task lists are GitHub extensions that plain CommonMark leaves as text.
const REMARK_PLUGINS = [remarkGfm];

export interface WorkflowInstructionsProps {
  // Shown in order, see getWorkflowInstructions.
  instructions: readonly WorkflowInstruction[];
}

export const WorkflowInstructions: FC<WorkflowInstructionsProps> = ({ instructions }) => {
  if (instructions.length === 0) {
    return null;
  }

  // Matches the look of the advanced fields.
  return (
    <details className="group rounded-lg border px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold select-none">Instructions</summary>
      <div className="flex flex-col divide-y pt-1">
        {instructions.map(({ key, markdown }) => (
          <div className={`py-3 ${MARKDOWN_CLASSES}`} key={key}>
            <Markdown remarkPlugins={REMARK_PLUGINS}>{markdown}</Markdown>
          </div>
        ))}
      </div>
    </details>
  );
};
