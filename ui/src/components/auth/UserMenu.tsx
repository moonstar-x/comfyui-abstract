import { useAuth } from '@components/auth/AuthContext';
import { useGenerationCount } from '@components/history/hooks/useGenerations';
import { useTheme } from '@components/theme/ThemeContext';
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
import { UserAvatar } from '@components/users/UserAvatar';
import { RouteDefs } from '@core/router/routes';
import type { PublicUser } from '@services/auth/session';
import { cn } from 'cn';
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from 'lucide-react';
import type { FC } from 'react';
import { Link } from 'react-router';

const TRIGGER_CLASSES = cn(
  'group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1!',
  'data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
);

const UserGenerationCount: FC = () => {
  const { data: count } = useGenerationCount();
  if (count === undefined) {
    return null;
  }

  return <span className="truncate text-xs text-muted-foreground">{count === 1 ? '1 generation' : `${count.toLocaleString()} generations`}</span>;
};

const UserIdentity: FC<{ user: PublicUser }> = ({ user }) => (
  <>
    <UserAvatar pictureUrl={user.pictureUrl} username={user.username} />
    <span className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.username}</span>
      <UserGenerationCount />
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
          <DropdownMenuItem render={<Link to={RouteDefs.settings} />}>
            <Settings />
            Settings
          </DropdownMenuItem>
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
