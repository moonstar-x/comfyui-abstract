import { useAuth } from '@components/auth/AuthContext';
import { useTheme } from '@components/theme/ThemeContext';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/third-party/shadcn/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@components/ui/third-party/shadcn/dropdown-menu';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@components/ui/third-party/shadcn/sidebar';
import type { PublicUser } from '@services/auth/session';
import { cn } from 'cn';
import { ChevronsUpDown, LogOut, Moon, Sun } from 'lucide-react';
import type { FC } from 'react';

const TRIGGER_CLASSES = cn(
  'group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1!',
  'data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
);

const getInitials = (username: string): string => username.slice(0, 2).toUpperCase();

const UserAvatar: FC<{ user: PublicUser }> = ({ user }) => (
  <Avatar className="rounded-lg after:rounded-lg">
    {user.pictureUrl !== null && <AvatarImage alt="" className="rounded-lg" src={user.pictureUrl} />}
    <AvatarFallback className="rounded-lg">{getInitials(user.username)}</AvatarFallback>
  </Avatar>
);

const UserIdentity: FC<{ user: PublicUser }> = ({ user }) => (
  <>
    <UserAvatar user={user} />
    <span className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.username}</span>
    </span>
  </>
);

/**
 * Sidebar footer entry for the logged in user, with account actions in a dropdown.
 */
export const UserMenu: FC = () => {
  const { user, logout } = useAuth();
  const { isMobile } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  if (user === null) {
    return null;
  }

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton className={TRIGGER_CLASSES} size="lg" tooltip={user.username} />}>
          <UserIdentity user={user} />
          <ChevronsUpDown className="ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56" side={isMobile ? 'bottom' : 'right'} sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5 text-foreground">
              <UserIdentity user={user} />
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            closeOnClick={false}
            onClick={() => {
              setTheme(nextTheme);
            }}
          >
            {nextTheme === 'dark' ? <Moon /> : <Sun />}
            {nextTheme === 'dark' ? 'Dark mode' : 'Light mode'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};
