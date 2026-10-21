import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@components/ui/third-party/shadcn/dropdown-menu';
import { FolderOpen, History, Sparkles } from 'lucide-react';
import type { FC, ReactElement, ReactNode } from 'react';

export interface WorkflowFileSourceMenuProps {
  children: ReactNode;
  disabled: boolean;
  onBrowse: () => void;
  /**
   * Adds an option to pick generated files, for the fields that accept them.
   */
  onPickGeneration?: (() => void) | undefined;
  onPickUpload: () => void;
  trigger: ReactElement;
}

/**
 * Lets the files of a field come from the device, from earlier uploads, or from generations when onPickGeneration is given. The children are rendered inside the trigger.
 */
export const WorkflowFileSourceMenu: FC<WorkflowFileSourceMenuProps> = ({ children, disabled, onBrowse, onPickGeneration, onPickUpload, trigger }) => (
  <DropdownMenu>
    <DropdownMenuTrigger disabled={disabled} render={trigger}>
      {children}
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-auto min-w-44">
      <DropdownMenuItem onClick={onBrowse}>
        <FolderOpen />
        Browse file
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onPickUpload}>
        <History />
        From uploads
      </DropdownMenuItem>
      {onPickGeneration !== undefined && (
        <DropdownMenuItem onClick={onPickGeneration}>
          <Sparkles />
          From generations
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);
