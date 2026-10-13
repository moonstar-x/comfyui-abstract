import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@components/ui/third-party/shadcn/dropdown-menu';
import { FolderOpen, History } from 'lucide-react';
import type { FC, ReactElement, ReactNode } from 'react';

export interface WorkflowFileSourceMenuProps {
  children: ReactNode;
  disabled: boolean;
  onBrowse: () => void;
  onPickUpload: () => void;
  trigger: ReactElement;
}

/**
 * Lets the files of a field come from the device or from earlier uploads. The children are rendered inside the trigger.
 */
export const WorkflowFileSourceMenu: FC<WorkflowFileSourceMenuProps> = ({ children, disabled, onBrowse, onPickUpload, trigger }) => (
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
    </DropdownMenuContent>
  </DropdownMenu>
);
